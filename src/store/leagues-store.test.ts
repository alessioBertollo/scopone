import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  acceptLeagueInvite,
  declineLeagueInvite,
  getLeague,
  inviteFriendToLeague,
  listMyLeagueInvites,
} from '../lib/leagues'
import { useLeaguesStore } from './leagues-store'

/**
 * `src/lib/supabase.ts` decide se il backend è configurato leggendo le
 * variabili d'ambiente al momento dell'import: vanno messe prima, quindi in
 * `vi.hoisted`. Nello stesso blocco vive il finto backend, perché le fabbriche
 * di `vi.mock` possono raggiungere solo ciò che è stato issato con loro.
 *
 * Non è un client finto qualunque: tiene tre tabelle in memoria e le due
 * funzioni RPC con le stesse regole della migrazione 0001, compresi i
 * messaggi che sollevano. Solo così i test dicono qualcosa sul contratto vero
 * invece che sulla forma delle chiamate.
 */
const backend = vi.hoisted(() => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://prova.supabase.co'
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'chiave-anonima-di-prova'

  type Row = Record<string, unknown>
  type Reply = { data: unknown; error: unknown }
  type Filter = (row: Row) => boolean
  type Query = {
    select: (columns?: string) => Query
    delete: () => Query
    eq: (column: string, value: unknown) => Query
    in: (column: string, values: unknown[]) => Query
    order: (column: string, options?: { ascending: boolean }) => Query
    maybeSingle: () => Promise<Reply>
    single: () => Promise<Reply>
    then: Promise<Reply>['then']
  }

  type Db = { profiles: Row[]; leagues: Row[]; league_members: Row[]; friendships: Row[] }

  const db: Db = { profiles: [], leagues: [], league_members: [], friendships: [] }

  /** Le tabelle toccate dallo strato leghe, e nessun'altra. */
  function bucket(name: string): Row[] {
    if (name === 'profiles') return db.profiles
    if (name === 'leagues') return db.leagues
    if (name === 'friendships') return db.friendships
    return db.league_members
  }

  /** Come `is_friend_of`: la coppia è memorizzata in ordine canonico. */
  function sonoAmici(a: string, b: string): boolean {
    const basso = a < b ? a : b
    const alto = a < b ? b : a
    return db.friendships.some(
      (row) => row.low_id === basso && row.high_id === alto && row.status === 'accepted',
    )
  }

  const state = {
    session: null as { user: { id: string; email: string } } | null,
    /** Errori da far restituire a una tabella, per nome. */
    errors: {} as Record<string, unknown>,
    /** Errori da far sollevare a una funzione RPC, per nome. */
    rpcErrors: {} as Record<string, unknown>,
    rpcCalls: [] as { fn: string; args: Row }[],
    /** Tabelle interrogate, per verificare che senza backend non si tocchi nulla. */
    queries: [] as string[],
    codes: ['ABCDE2', 'FGHJK3'],
  }

  function reset(): void {
    db.profiles = []
    db.leagues = []
    db.league_members = []
    db.friendships = []
    state.session = null
    state.errors = {}
    state.rpcErrors = {}
    state.rpcCalls = []
    state.queries = []
    state.codes = ['ABCDE2', 'FGHJK3']
  }

  /** Come arriva un `raise exception` di plpgsql attraverso PostgREST. */
  function raise(message: string): Row {
    return { code: 'P0001', message, details: null, hint: null }
  }

  /** Catena PostgREST ridotta all'osso: i filtri si accumulano, l'attesa esegue. */
  function table(name: string): Query {
    const filters: Filter[] = []
    let removing = false

    async function run(): Promise<Reply> {
      state.queries.push(name)

      const forced = state.errors[name]
      if (forced) return { data: null, error: forced }

      const rows = bucket(name).filter((row) => filters.every((keep) => keep(row)))

      if (removing) {
        // Rimozione sul posto, senza riassegnare: i test guardano l'array.
        for (const row of rows) bucket(name).splice(bucket(name).indexOf(row), 1)
        return { data: null, error: null }
      }

      return { data: rows.map((row) => ({ ...row })), error: null }
    }

    async function first(): Promise<Reply> {
      const reply = await run()
      if (reply.error) return reply

      const rows = reply.data as Row[]
      return { data: rows[0] ?? null, error: null }
    }

    const query: Query = {
      select: () => query,
      delete: () => {
        removing = true
        return query
      },
      eq: (column, value) => {
        filters.push((row) => row[column] === value)
        return query
      },
      in: (column, values) => {
        filters.push((row) => values.includes(row[column]))
        return query
      },
      order: () => query,
      maybeSingle: first,
      single: first,
      // biome-ignore lint/suspicious/noThenProperty: il thenable serve davvero, è così che si attende una query PostgREST
      then: (onFulfilled, onRejected) => run().then(onFulfilled, onRejected),
    }

    return query
  }

  async function rpc(fn: string, args: Row): Promise<Reply> {
    state.rpcCalls.push({ fn, args })

    const forced = state.rpcErrors[fn]
    if (forced) return { data: null, error: forced }

    const uid = state.session?.user.id
    if (!uid) return { data: null, error: raise('Serve essere autenticati') }

    if (fn === 'create_league') {
      const league = {
        id: `lega-${db.leagues.length + 1}`,
        name: String(args.league_name ?? '').trim(),
        created_by: uid,
        invite_code: state.codes.shift() ?? 'ZZZZZ9',
        created_at: '2026-01-01T00:00:00Z',
      }
      db.leagues.push(league)
      db.league_members.push({
        league_id: league.id,
        profile_id: uid,
        role: 'owner',
        status: 'member',
        joined_at: '2026-01-01T00:00:00Z',
      })
      return { data: league, error: null }
    }

    if (fn === 'invite_friend_to_league') {
      const lega = String(args.target_league ?? '')
      const amico = String(args.friend ?? '')

      const dentro = db.league_members.some(
        (row) => row.league_id === lega && row.profile_id === uid && row.status === 'member',
      )
      if (!dentro) return { data: null, error: raise('Non fai parte di questa lega') }
      if (!sonoAmici(uid, amico)) {
        return { data: null, error: raise('Puoi invitare solo i tuoi amici') }
      }

      // Un secondo invito non deve retrocedere un membro a invitato.
      const giaPresente = db.league_members.some(
        (row) => row.league_id === lega && row.profile_id === amico,
      )
      if (!giaPresente) {
        db.league_members.push({
          league_id: lega,
          profile_id: amico,
          role: 'member',
          status: 'invited',
          invited_by: uid,
          joined_at: '2026-03-01T00:00:00Z',
        })
      }
      return { data: null, error: null }
    }

    if (fn === 'accept_league_invite') {
      const lega = String(args.target_league ?? '')
      const riga = db.league_members.find(
        (row) => row.league_id === lega && row.profile_id === uid && row.status === 'invited',
      )
      if (!riga) return { data: null, error: raise('Nessun invito da accettare') }

      riga.status = 'member'
      return { data: null, error: null }
    }

    if (fn === 'list_my_league_invites') {
      const inviti = db.league_members
        .filter((row) => row.profile_id === uid && row.status === 'invited')
        .map((row) => ({
          league_id: row.league_id,
          league_name: db.leagues.find((lega) => lega.id === row.league_id)?.name ?? '',
          invited_by_name:
            db.profiles.find((profilo) => profilo.id === row.invited_by)?.display_name ?? '',
        }))
      return { data: inviti, error: null }
    }

    if (fn === 'join_league_by_code') {
      const code = String(args.code ?? '')
        .trim()
        .toUpperCase()
      const league = db.leagues.find((row) => row.invite_code === code)
      if (!league) return { data: null, error: raise('Codice di invito non valido') }

      const already = db.league_members.some(
        (row) => row.league_id === league.id && row.profile_id === uid,
      )
      if (!already) {
        db.league_members.push({
          league_id: league.id,
          profile_id: uid,
          role: 'member',
          status: 'member',
          joined_at: '2026-02-01T00:00:00Z',
        })
      }

      return { data: league.id, error: null }
    }

    return { data: null, error: { code: 'PGRST202', message: `funzione ${fn} sconosciuta` } }
  }

  const client = {
    auth: {
      startAutoRefresh: () => {},
      stopAutoRefresh: () => {},
      getSession: async () => ({ data: { session: state.session }, error: null }),
    },
    from: (name: string) => table(name),
    rpc,
  }

  return { db, state, reset, raise, client }
})

// `react-native` è scritto in Flow e non si lascia importare da Node: qui
// serve solo `AppState`, che il client usa per fermare il rinnovo del token.
vi.mock('react-native', () => ({
  AppState: { currentState: 'active', addEventListener: () => ({ remove: () => {} }) },
}))

vi.mock('@supabase/supabase-js', () => ({ createClient: () => backend.client }))

const store = useLeaguesStore

const ADA = { id: 'utente-ada', email: 'ada@esempio.it' }
const BRUNO = { id: 'utente-bruno', email: 'bruno@esempio.it' }

/** Lo stesso alfabeto del check su `leagues.invite_code`. */
const CODICE_VALIDO = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/

const RETE_ASSENTE = { code: '', message: 'Network request failed', details: '', hint: '' }

function seedSession(user = ADA): void {
  backend.state.session = { user }
  backend.db.profiles.push(
    { id: ADA.id, display_name: 'Ada', created_at: '2026-01-01T00:00:00Z' },
    { id: BRUNO.id, display_name: 'Bruno', created_at: '2026-01-01T00:00:00Z' },
  )
}

type Iscritto = {
  profileId: string
  role?: 'owner' | 'member'
  joinedAt?: string
  status?: 'invited' | 'member'
}

function seedLeague(
  id: string,
  name: string,
  code: string,
  createdBy: string,
  members: Iscritto[],
): void {
  backend.db.leagues.push({
    id,
    name,
    created_by: createdBy,
    invite_code: code,
    created_at: '2026-01-01T00:00:00Z',
  })

  for (const member of members) {
    backend.db.league_members.push({
      league_id: id,
      profile_id: member.profileId,
      role: member.role ?? 'member',
      status: member.status ?? 'member',
      joined_at: member.joinedAt ?? '2026-01-02T00:00:00Z',
    })
  }
}

beforeEach(() => {
  backend.reset()
  store.setState({ leagues: [], status: 'idle', error: null })
})

describe('stato iniziale', () => {
  it('parte da `idle`, prima che qualcuno abbia chiesto l elenco', () => {
    const state = store.getState()

    expect(state.status).toBe('idle')
    expect(state.leagues).toEqual([])
    expect(state.error).toBeNull()
  })
})

describe('elenco delle leghe', () => {
  it('distingue «nessuna lega» da «non ho ancora guardato»', async () => {
    seedSession()

    await store.getState().refresh()

    const state = store.getState()
    expect(state.status).toBe('ready')
    expect(state.leagues).toEqual([])
    expect(state.error).toBeNull()
  })

  it('porta ruolo e numero di iscritti di ogni lega', async () => {
    seedSession()
    seedLeague('lega-mia', 'Tavolo di casa', 'ABCDE2', ADA.id, [
      { profileId: ADA.id, role: 'owner' },
      { profileId: BRUNO.id },
    ])
    seedLeague('lega-altrui', 'Bar dello sport', 'FGHJK3', BRUNO.id, [
      { profileId: BRUNO.id, role: 'owner' },
      { profileId: ADA.id },
    ])

    await store.getState().refresh()

    expect(store.getState().leagues).toEqual([
      {
        id: 'lega-mia',
        name: 'Tavolo di casa',
        inviteCode: 'ABCDE2',
        createdBy: ADA.id,
        role: 'owner',
        memberCount: 2,
      },
      {
        id: 'lega-altrui',
        name: 'Bar dello sport',
        inviteCode: 'FGHJK3',
        createdBy: BRUNO.id,
        role: 'member',
        memberCount: 2,
      },
    ])
  })

  it('in errore tiene le leghe già mostrate invece di svuotare la schermata', async () => {
    seedSession()
    seedLeague('lega-mia', 'Tavolo di casa', 'ABCDE2', ADA.id, [
      { profileId: ADA.id, role: 'owner' },
    ])
    await store.getState().refresh()

    backend.state.errors.leagues = RETE_ASSENTE
    await store.getState().refresh()

    const state = store.getState()
    expect(state.status).toBe('error')
    expect(state.error).toBe('Nessuna connessione. Controlla la rete e riprova.')
    expect(state.leagues).toHaveLength(1)
  })

  it('avverte che la sessione è scaduta se non c è più nessuno dentro', async () => {
    await store.getState().refresh()

    expect(store.getState().status).toBe('error')
    expect(store.getState().error).toBe('Sessione scaduta. Accedi di nuovo.')
  })
})

describe('creazione', () => {
  it('crea la lega col nome ripulito e ne diventa proprietaria', async () => {
    seedSession()

    const league = await store.getState().create('  Tavolo di casa  ')

    expect(league.name).toBe('Tavolo di casa')
    expect(league.role).toBe('owner')
    expect(league.createdBy).toBe(ADA.id)
    expect(league.memberCount).toBe(1)
    expect(league.inviteCode).toMatch(CODICE_VALIDO)
    // Il codice lo genera il database: l'app non deve nemmeno provarci.
    expect(backend.state.rpcCalls).toEqual([
      { fn: 'create_league', args: { league_name: 'Tavolo di casa' } },
    ])
  })

  it('aggiunge la lega appena creata in fondo all elenco', async () => {
    seedSession()
    await store.getState().refresh()

    await store.getState().create('Tavolo di casa')
    await store.getState().create('Bar dello sport')

    expect(store.getState().leagues.map((league) => league.name)).toEqual([
      'Tavolo di casa',
      'Bar dello sport',
    ])
  })

  it('rifiuta un nome vuoto o troppo lungo senza chiamare il backend', async () => {
    seedSession()

    await expect(store.getState().create('   ')).rejects.toThrow(
      'Il nome della lega deve avere da 1 a 60 caratteri.',
    )
    await expect(store.getState().create('a'.repeat(61))).rejects.toThrow(
      'Il nome della lega deve avere da 1 a 60 caratteri.',
    )

    expect(backend.state.rpcCalls).toEqual([])
    expect(store.getState().leagues).toEqual([])
  })

  it('riporta il messaggio della funzione invece di un errore generico', async () => {
    seedSession()
    backend.state.rpcErrors.create_league = backend.raise(
      'Impossibile generare un codice di invito univoco',
    )

    await expect(store.getState().create('Tavolo di casa')).rejects.toThrow(
      'Impossibile generare un codice di invito univoco.',
    )
    expect(store.getState().leagues).toEqual([])
  })
})

describe('ingresso con il codice', () => {
  beforeEach(() => {
    seedSession(BRUNO)
    seedLeague('lega-mia', 'Tavolo di casa', 'ABCDE2', ADA.id, [
      { profileId: ADA.id, role: 'owner' },
    ])
  })

  it('accetta il codice scritto come capita e ci fa entrare da membri', async () => {
    const league = await store.getState().join('  abc-de2 ')

    expect(league).toEqual({
      id: 'lega-mia',
      name: 'Tavolo di casa',
      inviteCode: 'ABCDE2',
      createdBy: ADA.id,
      role: 'member',
      memberCount: 2,
    })
    expect(store.getState().leagues).toEqual([league])
    expect(backend.state.rpcCalls).toEqual([
      { fn: 'join_league_by_code', args: { code: 'ABCDE2' } },
    ])
  })

  it('entrare due volte nella stessa lega non la sdoppia nell elenco', async () => {
    await store.getState().join('ABCDE2')
    await store.getState().join('ABCDE2')

    expect(store.getState().leagues).toHaveLength(1)
    expect(backend.db.league_members).toHaveLength(2)
  })

  it('scarta un codice malformato senza chiamare il backend', async () => {
    // Zero, O, uno, I e L non esistono nell alfabeto: chi li scrive ha
    // sbagliato a copiare, e il server risponderebbe la stessa cosa.
    await expect(store.getState().join('ABC0DE')).rejects.toThrow(
      'Il codice di invito è di 6 caratteri fra lettere e cifre.',
    )
    await expect(store.getState().join('ABC')).rejects.toThrow(
      'Il codice di invito è di 6 caratteri fra lettere e cifre.',
    )

    expect(backend.state.rpcCalls).toEqual([])
  })

  it('riporta il messaggio della funzione se il codice non esiste', async () => {
    await expect(store.getState().join('ZZZZZ9')).rejects.toThrow(
      'Codice di invito non valido.',
    )

    expect(store.getState().leagues).toEqual([])
    expect(backend.db.league_members).toHaveLength(1)
  })
})

describe('uscita', () => {
  beforeEach(() => {
    seedSession()
    seedLeague('lega-altrui', 'Bar dello sport', 'FGHJK3', BRUNO.id, [
      { profileId: BRUNO.id, role: 'owner' },
      { profileId: ADA.id },
    ])
  })

  it('cancella la propria iscrizione e toglie la lega dall elenco', async () => {
    await store.getState().refresh()

    await store.getState().leave('lega-altrui')

    expect(store.getState().leagues).toEqual([])
    expect(backend.db.league_members.map((row) => row.profile_id)).toEqual([BRUNO.id])
  })

  it('non lascia uscire chi la lega l ha creata', async () => {
    seedLeague('lega-mia', 'Tavolo di casa', 'ABCDE2', ADA.id, [
      { profileId: ADA.id, role: 'owner' },
    ])
    await store.getState().refresh()

    await expect(store.getState().leave('lega-mia')).rejects.toThrow(
      'Hai creato tu questa lega: non puoi uscirne, puoi solo eliminarla.',
    )

    expect(store.getState().leagues).toHaveLength(2)
    expect(backend.db.league_members).toHaveLength(3)
  })

  it('chi la lega l ha creata la elimina, ed è la sua via d uscita', async () => {
    seedLeague('lega-mia', 'Tavolo di casa', 'ABCDE2', ADA.id, [
      { profileId: ADA.id, role: 'owner' },
    ])
    await store.getState().refresh()

    await store.getState().remove('lega-mia')

    expect(store.getState().leagues.map((league) => league.id)).not.toContain('lega-mia')
    expect(backend.db.leagues.map((row) => row.id)).not.toContain('lega-mia')
  })

  it('da una lega di cui non fa parte avverte invece di cancellare', async () => {
    await expect(store.getState().leave('lega-sconosciuta')).rejects.toThrow(
      'Non fai parte di questa lega.',
    )
    expect(backend.db.league_members).toHaveLength(2)
  })
})

describe('dettaglio della lega', () => {
  it('elenca gli iscritti col nome, prima chi la lega l ha creata', async () => {
    seedSession()
    seedLeague('lega-altrui', 'Bar dello sport', 'FGHJK3', BRUNO.id, [
      { profileId: ADA.id, joinedAt: '2026-01-02T00:00:00Z' },
      { profileId: BRUNO.id, role: 'owner', joinedAt: '2026-03-01T00:00:00Z' },
    ])

    const { league, members } = await getLeague('lega-altrui')

    expect(league.role).toBe('member')
    expect(league.memberCount).toBe(2)
    // Il proprietario in cima anche se si è iscritto per ultimo.
    expect(members).toEqual([
      {
        profileId: BRUNO.id,
        displayName: 'Bruno',
        avatar: null,
        role: 'owner',
        joinedAt: '2026-03-01T00:00:00Z',
      },
      {
        profileId: ADA.id,
        displayName: 'Ada',
        avatar: null,
        role: 'member',
        joinedAt: '2026-01-02T00:00:00Z',
      },
    ])
  })

  it('ripiega su un nome generico se i profili non sono leggibili', async () => {
    seedSession()
    seedLeague('lega-mia', 'Tavolo di casa', 'ABCDE2', ADA.id, [
      { profileId: ADA.id, role: 'owner' },
    ])
    backend.state.errors.profiles = RETE_ASSENTE

    const { members } = await getLeague('lega-mia')

    // I nomi sono un ornamento: la lega si apre lo stesso.
    expect(members.map((member) => member.displayName)).toEqual(['Giocatore'])
  })

  it('non distingue una lega inesistente da una di cui non fai parte', async () => {
    seedSession()
    seedLeague('lega-altrui', 'Bar dello sport', 'FGHJK3', BRUNO.id, [
      { profileId: BRUNO.id, role: 'owner' },
    ])

    await expect(getLeague('lega-mai-esistita')).rejects.toThrow(
      'Lega non trovata, o non ne fai più parte.',
    )
  })
})

describe('senza backend configurato', () => {
  it('risponde con l elenco vuoto senza toccare il client', async () => {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    process.env.EXPO_PUBLIC_SUPABASE_URL = ''
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = ''
    // `isBackendConfigured` è deciso all'import: serve una copia nuova dei moduli.
    vi.resetModules()

    try {
      const { useLeaguesStore: senzaBackend } = await import('./leagues-store')

      await expect(senzaBackend.getState().refresh()).resolves.toBeUndefined()

      expect(senzaBackend.getState().status).toBe('ready')
      expect(senzaBackend.getState().leagues).toEqual([])
      expect(senzaBackend.getState().error).toBeNull()

      // Creare o entrare, invece, non si può fingere: va detto.
      await expect(senzaBackend.getState().create('Tavolo di casa')).rejects.toThrow(
        "Le leghe non sono disponibili: questa copia dell'app non ha un server configurato.",
      )
      await expect(senzaBackend.getState().join('ABCDE2')).rejects.toThrow(
        "Le leghe non sono disponibili: questa copia dell'app non ha un server configurato.",
      )

      // Nessuna query e nessuna RPC: `getSupabase()` avrebbe lanciato.
      expect(backend.state.queries).toEqual([])
      expect(backend.state.rpcCalls).toEqual([])
    } finally {
      process.env.EXPO_PUBLIC_SUPABASE_URL = url
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = key
      vi.resetModules()
    }
  })
})

/** Come `send_friend_request` seguito da `accept_friend_request`. */
function seedAmicizia(a: string, b: string): void {
  const basso = a < b ? a : b
  const alto = a < b ? b : a
  backend.db.friendships.push({ low_id: basso, high_id: alto, status: 'accepted' })
}

describe('inviti alla lega', () => {
  it('mette l amico in attesa invece di iscriverlo', async () => {
    seedSession(ADA)
    seedAmicizia(ADA.id, BRUNO.id)
    seedLeague('lega-mia', 'Giovedì', 'ABCDE2', ADA.id, [{ profileId: ADA.id, role: 'owner' }])

    await inviteFriendToLeague('lega-mia', BRUNO.id)

    const { league, members, invited } = await getLeague('lega-mia')
    // Un invito non gonfia il numero dei partecipanti.
    expect(league.memberCount).toBe(1)
    expect(members.map((m) => m.profileId)).toEqual([ADA.id])
    expect(invited.map((m) => m.displayName)).toEqual(['Bruno'])
  })

  it('non invita chi non è un amico', async () => {
    seedSession(ADA)
    seedLeague('lega-mia', 'Giovedì', 'ABCDE2', ADA.id, [{ profileId: ADA.id, role: 'owner' }])

    await expect(inviteFriendToLeague('lega-mia', BRUNO.id)).rejects.toThrow(/amici/i)
  })

  it('non invita in una lega di cui non si fa parte', async () => {
    seedSession(ADA)
    seedAmicizia(ADA.id, BRUNO.id)
    seedLeague('lega-altrui', 'Altrove', 'FGHJK3', BRUNO.id, [
      { profileId: BRUNO.id, role: 'owner' },
    ])

    await expect(inviteFriendToLeague('lega-altrui', BRUNO.id)).rejects.toThrow(/lega/i)
  })

  it('mostra a chi lo riceve il nome della lega e di chi lo ha mandato', async () => {
    seedSession(BRUNO)
    seedLeague('lega-mia', 'Giovedì', 'ABCDE2', ADA.id, [
      { profileId: ADA.id, role: 'owner' },
      { profileId: BRUNO.id, status: 'invited' },
    ])
    // `invited_by` lo scrive la funzione: qui la riga è seminata a mano.
    const riga = backend.db.league_members.find((row) => row.profile_id === BRUNO.id)
    if (riga) riga.invited_by = ADA.id

    expect(await listMyLeagueInvites()).toEqual([
      { leagueId: 'lega-mia', leagueName: 'Giovedì', invitedByName: 'Ada' },
    ])
  })

  it('accettando si diventa partecipanti', async () => {
    seedSession(BRUNO)
    seedLeague('lega-mia', 'Giovedì', 'ABCDE2', ADA.id, [
      { profileId: ADA.id, role: 'owner' },
      { profileId: BRUNO.id, status: 'invited' },
    ])

    await acceptLeagueInvite('lega-mia')

    const { league, members, invited } = await getLeague('lega-mia')
    expect(league.memberCount).toBe(2)
    expect(members.map((m) => m.profileId).sort()).toEqual([ADA.id, BRUNO.id].sort())
    expect(invited).toEqual([])
    expect(await listMyLeagueInvites()).toEqual([])
  })

  it('rifiutando l invito sparisce', async () => {
    seedSession(BRUNO)
    seedLeague('lega-mia', 'Giovedì', 'ABCDE2', ADA.id, [
      { profileId: ADA.id, role: 'owner' },
      { profileId: BRUNO.id, status: 'invited' },
    ])

    await declineLeagueInvite('lega-mia')

    expect(await listMyLeagueInvites()).toEqual([])
    expect(backend.db.league_members.some((row) => row.profile_id === BRUNO.id)).toBe(false)
  })

  it('accettare due volte non riesce la seconda', async () => {
    seedSession(BRUNO)
    seedLeague('lega-mia', 'Giovedì', 'ABCDE2', ADA.id, [
      { profileId: ADA.id, role: 'owner' },
      { profileId: BRUNO.id, status: 'invited' },
    ])

    await acceptLeagueInvite('lega-mia')
    await expect(acceptLeagueInvite('lega-mia')).rejects.toThrow(/invito/i)
  })
})
