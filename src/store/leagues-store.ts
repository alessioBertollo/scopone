import { create } from 'zustand'
import {
  createLeague,
  deleteLeague,
  joinLeagueByCode,
  type League,
  leaveLeague,
  listMyLeagues,
} from '../lib/leagues'
import { isBackendConfigured } from '../lib/supabase'

/**
 * `idle` è lo stato prima che qualcuno abbia chiesto l'elenco: distinto da
 * `ready` con zero leghe, che invece è una risposta vera e merita l'invito a
 * crearne una.
 */
export type LeaguesStatus = 'idle' | 'loading' | 'ready' | 'error'

export type LeaguesStore = {
  leagues: League[]
  status: LeaguesStatus
  error: string | null
  refresh: () => Promise<void>
  create: (name: string) => Promise<League>
  join: (code: string) => Promise<League>
  leave: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
}

const NO_BACKEND =
  "Le leghe non sono disponibili: questa copia dell'app non ha un server configurato."

/**
 * `status` ed `error` raccontano solo l'ultimo caricamento dell'elenco. Gli
 * errori di `create`, `join` e `leave` non finiscono qui: sono reazioni a un
 * gesto preciso, arrivano già tradotti in italiano da `src/lib/leagues.ts` ed
 * è la schermata a doverli mostrare accanto al campo che li ha causati.
 *
 * Niente `persist`: l'elenco è una vista di quello che c'è sul server, e una
 * copia locale che sopravvive alla chiusura sarebbe una seconda verità da
 * riconciliare — con il rischio di mostrare una lega da cui si è già usciti.
 */
export const useLeaguesStore = create<LeaguesStore>()((set, get) => ({
  leagues: [],
  status: 'idle',
  error: null,

  refresh: async () => {
    // Senza credenziali di backend non c'è nessuna lega da cercare e
    // `getSupabase()` lancerebbe: l'elenco vuoto è la risposta giusta, e
    // contare i punti al tavolo resta possibile.
    if (!isBackendConfigured) {
      set({ leagues: [], status: 'ready', error: null })
      return
    }

    set({ status: 'loading', error: null })

    try {
      set({ leagues: await listMyLeagues(), status: 'ready', error: null })
    } catch (error) {
      // Le leghe già in memoria restano: una rete che cade non è un buon
      // motivo per svuotare la schermata sotto gli occhi di chi la guarda.
      set({ status: 'error', error: messageOf(error) })
    }
  },

  create: async (name) => {
    requireBackend()

    const league = await createLeague(name)
    // In coda, come le manderebbe il server: l'elenco è ordinato per data di
    // creazione, e questa è la più recente.
    set({ leagues: [...get().leagues, league] })

    return league
  },

  join: async (code) => {
    requireBackend()

    const league = await joinLeagueByCode(code)
    // Entrare due volte nella stessa lega è concesso e non fa nulla: l'elenco
    // deve comportarsi allo stesso modo, senza sdoppiare la riga.
    set({ leagues: replaceOrAppend(get().leagues, league) })

    return league
  },

  leave: async (id) => {
    requireBackend()

    await leaveLeague(id)
    set({ leagues: get().leagues.filter((league) => league.id !== id) })
  },

  remove: async (id) => {
    requireBackend()

    await deleteLeague(id)
    set({ leagues: get().leagues.filter((league) => league.id !== id) })
  },
}))

function requireBackend(): void {
  if (!isBackendConfigured) throw new Error(NO_BACKEND)
}

function replaceOrAppend(leagues: League[], league: League): League[] {
  const known = leagues.some((existing) => existing.id === league.id)
  if (!known) return [...leagues, league]

  return leagues.map((existing) => (existing.id === league.id ? league : existing))
}

function messageOf(error: unknown): string {
  return error instanceof Error && error.message.length > 0
    ? error.message
    : 'Non è stato possibile caricare le leghe. Riprova.'
}
