import type { TeamId } from '../domain/teams'
import { getSupabase } from './supabase'

/**
 * Un tavolo pre-partita, effimero: vive solo mentre chi crea la partita ha
 * la schermata aperta. Non c'è nulla da salvare, perché la formazione vera
 * nasce solo quando la partita nasce: qui si scambiano solo nomi e posti.
 *
 * Un ospite manda il proprio nome sul canale broadcast del codice; solo chi
 * ha creato il tavolo — l'unico che potrà poi modificare la partita — decide
 * in che squadra metterlo, e lo comunica sullo stesso canale. Nessuna riga
 * di database è coinvolta: niente permessi nuovi da concedere a chi non ha
 * nemmeno un account.
 */

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6

export function generateLobbyCode(): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    const index = Math.floor(Math.random() * CODE_ALPHABET.length)
    code += CODE_ALPHABET[index]
  }
  return code
}

export type LobbyRequest = {
  /** Identifica la richiesta per la durata del tavolo, non la persona. */
  id: string
  name: string
  /** Presente solo se chi entra ha effettuato l'accesso nel farlo. */
  profileId: string | null
}

type JoinPayload = { id?: unknown; name?: unknown; profileId?: unknown }
type PlacedPayload = { id?: unknown; team?: unknown }

function channelName(code: string): string {
  return `lobby:${code}`
}

function readJoinPayload(payload: JoinPayload): LobbyRequest | null {
  const id = typeof payload.id === 'string' ? payload.id : null
  const name = typeof payload.name === 'string' ? payload.name.trim() : ''
  const profileId = typeof payload.profileId === 'string' ? payload.profileId : null
  if (!id || !name) return null
  return { id, name, profileId }
}

/** Lato di chi crea la partita: riceve le richieste e decide dove metterle. */
export function hostLobby(
  code: string,
  onRequest: (request: LobbyRequest) => void,
): { place: (requestId: string, team: TeamId | null) => void; close: () => void } {
  const supabase = getSupabase()
  const channel = supabase.channel(channelName(code))

  channel
    .on('broadcast', { event: 'join' }, (message) => {
      const request = readJoinPayload(message.payload as JoinPayload)
      if (request) onRequest(request)
    })
    .subscribe()

  return {
    place: (requestId, team) => {
      void channel.send({
        type: 'broadcast',
        event: 'placed',
        payload: { id: requestId, team },
      })
    },
    close: () => {
      void supabase.removeChannel(channel)
    },
  }
}

/**
 * Lato di chi entra da un link o da un codice: manda il proprio nome e resta
 * in ascolto di dove il creatore lo mette. Restituisce la funzione per
 * lasciare il tavolo.
 */
export function joinLobby(
  code: string,
  name: string,
  profileId: string | null,
  onPlaced: (team: TeamId | null) => void,
): () => void {
  const supabase = getSupabase()
  const channel = supabase.channel(channelName(code))
  const requestId = randomRequestId()

  channel
    .on('broadcast', { event: 'placed' }, (message) => {
      const payload = message.payload as PlacedPayload
      if (payload.id !== requestId) return
      const team = payload.team === 'A' || payload.team === 'B' ? payload.team : null
      onPlaced(team)
    })
    .subscribe((status) => {
      if (status !== 'SUBSCRIBED') return
      void channel.send({
        type: 'broadcast',
        event: 'join',
        payload: { id: requestId, name, profileId },
      })
    })

  return () => {
    void supabase.removeChannel(channel)
  }
}

function randomRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}
