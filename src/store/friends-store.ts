import { create } from 'zustand'
import {
  acceptFriendRequest,
  type Friend,
  listFriends,
  myFriendCode,
  removeFriend,
  sendFriendRequest,
} from '../lib/friends'
import { isBackendConfigured } from '../lib/supabase'

/** Stesso significato di `LeaguesStatus`: `idle` prima della prima richiesta. */
export type FriendsStatus = 'idle' | 'loading' | 'ready' | 'error'

export type FriendsStore = {
  friends: Friend[]
  /** Il proprio codice da dettare, `null` finché non è stato letto. */
  code: string | null
  status: FriendsStatus
  error: string | null
  refresh: () => Promise<void>
  send: (code: string) => Promise<void>
  accept: (profileId: string) => Promise<void>
  remove: (profileId: string) => Promise<void>
}

const NO_BACKEND =
  "Gli amici non sono disponibili: questa copia dell'app non ha un server configurato."

/**
 * Niente `persist`, come `leagues-store`: è una vista di quello che c'è sul
 * server, non una seconda verità da riconciliare.
 *
 * A differenza delle leghe, dopo `send` e `accept` si rilegge tutto invece di
 * aggiornare lo stato a mano: una richiesta può risolversi da sola sul server
 * (`send_friend_request` completa l'amicizia se l'altro aveva già scritto),
 * e indovinare il nuovo stato qui vorrebbe dire duplicare quella logica.
 */
export const useFriendsStore = create<FriendsStore>()((set, get) => ({
  friends: [],
  code: null,
  status: 'idle',
  error: null,

  refresh: async () => {
    if (!isBackendConfigured) {
      set({ friends: [], code: null, status: 'ready', error: null })
      return
    }

    set({ status: 'loading', error: null })

    try {
      const [friends, code] = await Promise.all([listFriends(), myFriendCode()])
      set({ friends, code, status: 'ready', error: null })
    } catch (error) {
      // Gli amici già in memoria restano: una rete che cade non è un buon
      // motivo per svuotare la schermata sotto gli occhi di chi la guarda.
      set({ status: 'error', error: messageOf(error) })
    }
  },

  send: async (code) => {
    requireBackend()
    await sendFriendRequest(code)
    await get().refresh()
  },

  accept: async (profileId) => {
    requireBackend()
    await acceptFriendRequest(profileId)
    await get().refresh()
  },

  remove: async (profileId) => {
    requireBackend()
    await removeFriend(profileId)
    set({ friends: get().friends.filter((friend) => friend.profileId !== profileId) })
  },
}))

function requireBackend(): void {
  if (!isBackendConfigured) throw new Error(NO_BACKEND)
}

function messageOf(error: unknown): string {
  return error instanceof Error && error.message.length > 0
    ? error.message
    : 'Non è stato possibile caricare gli amici. Riprova.'
}
