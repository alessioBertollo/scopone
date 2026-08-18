import { create } from 'zustand'
import {
  type AuthUser,
  getCurrentUser,
  sendLoginCode,
  signOut as signOutFromBackend,
  updateDisplayName,
  verifyLoginCode,
} from '../lib/auth'
import { isBackendConfigured } from '../lib/supabase'

/**
 * `unknown` è lo stato all'avvio, prima che `restore()` abbia guardato se una
 * sessione c'è. Serve distinto da `signedOut`: mostrare la schermata di
 * accesso a chi è già dentro, anche solo per un istante, si vede.
 */
export type AuthStatus = 'unknown' | 'signedOut' | 'signedIn'

export type AuthStore = {
  user: AuthUser | null
  status: AuthStatus
  /** Rilegge la sessione salvata all'avvio. */
  restore: () => Promise<void>
  sendCode: (email: string) => Promise<void>
  verifyCode: (email: string, code: string) => Promise<void>
  signOut: () => Promise<void>
  setDisplayName: (name: string) => Promise<void>
}

/**
 * Niente `persist` qui: la sessione la salva già il client Supabase su
 * AsyncStorage, e tenerne una seconda copia vorrebbe dire tenerne due che
 * prima o poi divergono. Questo store è solo la vista in memoria che la UI
 * osserva; la fonte di verità resta il client.
 *
 * Gli errori delle azioni scatenate dall'utente non vengono inghiottiti:
 * arrivano già tradotti in italiano da `src/lib/auth.ts` ed è la schermata a
 * doverli mostrare accanto al campo giusto.
 */
export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  status: 'unknown',

  restore: async () => {
    // Senza credenziali di backend non c'è nessuna sessione da cercare e
    // `getSupabase()` lancerebbe: contare i punti al tavolo deve restare
    // possibile anche così.
    if (!isBackendConfigured) {
      set({ user: null, status: 'signedOut' })
      return
    }

    try {
      const user = await getCurrentUser()
      set({ user, status: user ? 'signedIn' : 'signedOut' })
    } catch {
      // All'avvio non c'è ancora nessuna schermata a cui consegnare l'errore:
      // si riparte da fuori, e chi vuole entrare rivedrà il messaggio vero
      // quando riproverà ad accedere.
      set({ user: null, status: 'signedOut' })
    }
  },

  sendCode: async (email) => {
    await sendLoginCode(email)
  },

  verifyCode: async (email, code) => {
    const user = await verifyLoginCode(email, code)
    set({ user, status: 'signedIn' })
  },

  signOut: async () => {
    try {
      if (isBackendConfigured) await signOutFromBackend()
    } catch {
      // Chi chiede di uscire esce comunque: se la revoca remota non riesce,
      // di solito per la rete, lasciarlo dentro sarebbe il male peggiore.
      // La sessione locale la cancella già `signOut()` del client.
    }

    set({ user: null, status: 'signedOut' })
  },

  setDisplayName: async (name) => {
    const user = await updateDisplayName(name)
    set({ user })
  },
}))
