import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from './auth-store'

/**
 * `src/lib/supabase.ts` decide se il backend è configurato leggendo le
 * variabili d'ambiente al momento dell'import: vanno messe prima, quindi in
 * `vi.hoisted`. Nello stesso blocco vive il finto client, perché le fabbriche
 * di `vi.mock` possono raggiungere solo ciò che è stato issato con loro.
 */
const backend = vi.hoisted(() => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://prova.supabase.co'
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'chiave-anonima-di-prova'

  type MockUser = { id: string; email: string }
  type MockProfile = { id: string; display_name: string; created_at: string }
  type Reply = { data: MockProfile | null; error: unknown }
  type Builder = {
    select: () => Builder
    eq: () => Builder
    update: (values: { display_name: string }) => Builder
    maybeSingle: () => Promise<Reply>
    single: () => Promise<Reply>
  }

  const state = {
    session: null as { user: MockUser } | null,
    profile: null as MockProfile | null,
    /** Utente che `verifyOtp` restituisce quando il codice è giusto. */
    verifiedUser: null as MockUser | null,
    sendError: null as unknown,
    verifyError: null as unknown,
    profileError: null as unknown,
    signOutError: null as unknown,
    sentTo: [] as string[],
    savedNames: [] as string[],
    getSessionCalls: 0,
    signOutCalls: 0,
  }

  function reset(): void {
    state.session = null
    state.profile = null
    state.verifiedUser = null
    state.sendError = null
    state.verifyError = null
    state.profileError = null
    state.signOutError = null
    state.sentTo = []
    state.savedNames = []
    state.getSessionCalls = 0
    state.signOutCalls = 0
  }

  /** Catena PostgREST ridotta all'osso: i filtri tornano sé stessi, il terminatore risolve. */
  function table(): Builder {
    let nameToSave: string | null = null

    async function finish(): Promise<Reply> {
      if (state.profileError) return { data: null, error: state.profileError }

      if (nameToSave !== null && state.profile) {
        state.profile = { ...state.profile, display_name: nameToSave }
        state.savedNames.push(nameToSave)
      }

      return { data: state.profile, error: null }
    }

    const builder: Builder = {
      select: () => builder,
      eq: () => builder,
      update: (values) => {
        nameToSave = values.display_name
        return builder
      },
      maybeSingle: finish,
      single: finish,
    }

    return builder
  }

  const client = {
    auth: {
      startAutoRefresh: () => {},
      stopAutoRefresh: () => {},

      signInWithOtp: async ({ email }: { email: string }) => {
        if (state.sendError) return { data: null, error: state.sendError }
        state.sentTo.push(email)
        return { data: null, error: null }
      },

      verifyOtp: async () => {
        if (state.verifyError)
          return { data: { user: null, session: null }, error: state.verifyError }

        const user = state.verifiedUser
        state.session = user ? { user } : null
        return { data: { user, session: state.session }, error: null }
      },

      getSession: async () => {
        state.getSessionCalls += 1
        return { data: { session: state.session }, error: null }
      },

      signOut: async () => {
        state.signOutCalls += 1
        state.session = null
        return { error: state.signOutError }
      },
    },
    from: () => table(),
  }

  return { state, reset, client }
})

// `react-native` è scritto in Flow e non si lascia importare da Node: qui
// serve solo `AppState`, che il client usa per fermare il rinnovo del token.
vi.mock('react-native', () => ({
  AppState: { currentState: 'active', addEventListener: () => ({ remove: () => {} }) },
}))

vi.mock('@supabase/supabase-js', () => ({ createClient: () => backend.client }))

const store = useAuthStore

const ADA = { id: 'utente-1', email: 'ada@esempio.it' }

/** Errore come lo restituisce GoTrue: codice sbagliato e codice scaduto coincidono. */
const OTP_RIFIUTATO = {
  name: 'AuthApiError',
  code: 'otp_expired',
  status: 403,
  message: 'Token has expired or is invalid',
}

const RETE_ASSENTE = {
  name: 'AuthRetryableFetchError',
  status: 0,
  message: 'Failed to fetch',
}

function seedSession(displayName = 'Ada'): void {
  backend.state.session = { user: ADA }
  backend.state.profile = { id: ADA.id, display_name: displayName, created_at: '2026-01-01' }
}

beforeEach(() => {
  backend.reset()
  store.setState({ user: null, status: 'unknown' })
})

describe('stato iniziale', () => {
  it('parte da `unknown`, prima che qualcuno sia andato a guardare', () => {
    expect(store.getState().status).toBe('unknown')
    expect(store.getState().user).toBeNull()
  })
})

describe('accesso', () => {
  it('invia il codice all indirizzo normalizzato', async () => {
    await store.getState().sendCode('  Ada@Esempio.IT ')

    expect(backend.state.sentTo).toEqual(['ada@esempio.it'])
  })

  it('rifiuta un indirizzo non valido senza chiamare il backend', async () => {
    await expect(store.getState().sendCode('ada-chiocciola-esempio')).rejects.toThrow(
      'Indirizzo email non valido.',
    )
    expect(backend.state.sentTo).toEqual([])
  })

  it('traduce l assenza di rete in un messaggio comprensibile', async () => {
    backend.state.sendError = RETE_ASSENTE

    await expect(store.getState().sendCode('ada@esempio.it')).rejects.toThrow(
      'Nessuna connessione. Controlla la rete e riprova.',
    )
  })

  it('col codice giusto entra e prende il nome dal profilo', async () => {
    backend.state.verifiedUser = ADA
    backend.state.profile = { id: ADA.id, display_name: 'Ada L.', created_at: '2026-01-01' }

    await store.getState().verifyCode('ada@esempio.it', '123456')

    const state = store.getState()
    expect(state.status).toBe('signedIn')
    expect(state.user).toEqual({
      id: ADA.id,
      email: ADA.email,
      displayName: 'Ada L.',
      avatar: null,
    })
  })

  it('col codice sbagliato resta fuori e spiega perché', async () => {
    backend.state.verifyError = OTP_RIFIUTATO

    await expect(store.getState().verifyCode('ada@esempio.it', '000000')).rejects.toThrow(
      'Codice non valido o scaduto. Fattene mandare uno nuovo.',
    )

    const state = store.getState()
    expect(state.status).toBe('unknown')
    expect(state.user).toBeNull()
  })

  it('scarta un codice che non è di sei cifre prima di chiedere al backend', async () => {
    backend.state.verifiedUser = ADA

    await expect(store.getState().verifyCode('ada@esempio.it', '12ab')).rejects.toThrow(
      'Il codice è di 6 cifre.',
    )
    expect(store.getState().status).toBe('unknown')
  })

  it('accetta il codice incollato con gli spazi in mezzo', async () => {
    backend.state.verifiedUser = ADA
    backend.state.profile = { id: ADA.id, display_name: 'Ada', created_at: '2026-01-01' }

    await store.getState().verifyCode('ada@esempio.it', '123 456')

    expect(store.getState().status).toBe('signedIn')
  })

  it('ripiega sulla parte locale dell email se il profilo non è leggibile', async () => {
    backend.state.verifiedUser = ADA
    backend.state.profileError = { code: 'PGRST301', message: 'JWT expired' }

    await store.getState().verifyCode('ada@esempio.it', '123456')

    // Il profilo è un ornamento: quello che conta è che la sessione ci sia.
    expect(store.getState().status).toBe('signedIn')
    expect(store.getState().user?.displayName).toBe('ada')
  })
})

describe('ripristino della sessione', () => {
  it('riprende la sessione salvata e il nome del profilo', async () => {
    seedSession('Ada L.')

    await store.getState().restore()

    const state = store.getState()
    expect(state.status).toBe('signedIn')
    expect(state.user).toEqual({
      id: ADA.id,
      email: ADA.email,
      displayName: 'Ada L.',
      avatar: null,
    })
  })

  it('senza sessione salvata dichiara di essere fuori', async () => {
    await store.getState().restore()

    expect(store.getState().status).toBe('signedOut')
    expect(store.getState().user).toBeNull()
  })

  it('non lancia se la lettura della sessione va storta', async () => {
    seedSession()
    // Il client rotto è il caso limite: l'avvio non deve fermarsi comunque.
    const broken = backend.client.auth.getSession
    backend.client.auth.getSession = async () => {
      throw new Error('storage illeggibile')
    }

    try {
      await expect(store.getState().restore()).resolves.toBeUndefined()
      expect(store.getState().status).toBe('signedOut')
    } finally {
      backend.client.auth.getSession = broken
    }
  })
})

describe('senza backend configurato', () => {
  it('segna `signedOut` senza toccare il client', async () => {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    process.env.EXPO_PUBLIC_SUPABASE_URL = ''
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = ''
    // `isBackendConfigured` è deciso all'import: serve una copia nuova dei moduli.
    vi.resetModules()

    try {
      const { useAuthStore: senzaBackend } = await import('./auth-store')

      await expect(senzaBackend.getState().restore()).resolves.toBeUndefined()

      expect(senzaBackend.getState().status).toBe('signedOut')
      expect(senzaBackend.getState().user).toBeNull()
      // Nessun client creato: `getSupabase()` avrebbe lanciato.
      expect(backend.state.getSessionCalls).toBe(0)
    } finally {
      process.env.EXPO_PUBLIC_SUPABASE_URL = url
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = key
      vi.resetModules()
    }
  })
})

describe('uscita', () => {
  it('dimentica utente e sessione', async () => {
    seedSession()
    await store.getState().restore()
    expect(store.getState().status).toBe('signedIn')

    await store.getState().signOut()

    const state = store.getState()
    expect(state.status).toBe('signedOut')
    expect(state.user).toBeNull()
    expect(backend.state.signOutCalls).toBe(1)
  })

  it('esce lo stesso se la revoca remota fallisce', async () => {
    seedSession()
    await store.getState().restore()
    backend.state.signOutError = RETE_ASSENTE

    await expect(store.getState().signOut()).resolves.toBeUndefined()

    expect(store.getState().status).toBe('signedOut')
    expect(store.getState().user).toBeNull()
  })
})

describe('nome mostrato', () => {
  it('salva il nome ripulito e aggiorna l utente in memoria', async () => {
    seedSession('Ada')
    await store.getState().restore()

    await store.getState().setDisplayName('  Ada Lovelace  ')

    expect(backend.state.savedNames).toEqual(['Ada Lovelace'])
    expect(store.getState().user?.displayName).toBe('Ada Lovelace')
    // L'accesso non viene rimesso in discussione da un cambio di nome.
    expect(store.getState().status).toBe('signedIn')
  })

  it('rifiuta un nome vuoto o troppo lungo senza chiamare il backend', async () => {
    seedSession()
    await store.getState().restore()

    await expect(store.getState().setDisplayName('   ')).rejects.toThrow(
      'Il nome deve avere da 1 a 40 caratteri.',
    )
    await expect(store.getState().setDisplayName('a'.repeat(41))).rejects.toThrow(
      'Il nome deve avere da 1 a 40 caratteri.',
    )
    expect(backend.state.savedNames).toEqual([])
  })

  it('avverte che la sessione è scaduta se non c è più nessuno dentro', async () => {
    await expect(store.getState().setDisplayName('Ada')).rejects.toThrow(
      'Sessione scaduta. Accedi di nuovo.',
    )
  })
})
