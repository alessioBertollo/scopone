import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeHand, makeRules } from '../test/factories'

/**
 * Stesso impianto di `auth-store.test.ts`: le variabili d'ambiente vanno
 * scritte prima dell'import di `supabase.ts`, che le legge una volta sola,
 * quindi tutto sta in `vi.hoisted`.
 */
const backend = vi.hoisted(() => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://prova.supabase.co'
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'chiave-anonima-di-prova'

  type Reply = { data: unknown; error: unknown }

  const state = {
    userId: 'io' as string | null,
    row: null as Record<string, unknown> | null,
    rows: [] as Record<string, unknown>[],
    error: null as unknown,
    /** Righe passate a insert, per verificare cosa scriviamo davvero. */
    inserted: [] as { table: string; values: unknown }[],
    /** Colonne chieste a select, per verificare cosa leggiamo davvero. */
    selected: [] as string[],
    /** Coppie passate a neq, per verificare cosa teniamo fuori. */
    excluded: [] as [string, string][],
    updated: [] as unknown[],
  }

  function reset(): void {
    state.userId = 'io'
    state.row = null
    state.rows = []
    state.error = null
    state.inserted = []
    state.selected = []
    state.excluded = []
    state.updated = []
  }

  function table(name: string) {
    const builder = {
      select: (columns?: string) => {
        if (typeof columns === 'string') state.selected.push(columns)
        return builder
      },
      eq: () => builder,
      neq: (column: string, value: string) => {
        state.excluded.push([column, value])
        return builder
      },
      order: () => builder,
      limit: async (): Promise<Reply> => ({
        data: state.error ? null : state.rows,
        error: state.error,
      }),
      insert: (values: unknown) => {
        state.inserted.push({ table: name, values })
        // `match_players` non richiede select: l'errore torna subito.
        const withSelect = {
          select: () => withSelect,
          single: async (): Promise<Reply> => ({
            data: state.error ? null : state.row,
            error: state.error,
          }),
        }
        return Object.assign(Promise.resolve({ data: null, error: state.error }), withSelect)
      },
      update: (values: unknown) => {
        state.updated.push(values)
        return builder
      },
      single: async (): Promise<Reply> => ({
        data: state.error ? null : state.row,
        error: state.error,
      }),
    }
    return builder
  }

  const client = {
    auth: {
      // Chiamate da `supabase.ts` alla creazione del client.
      startAutoRefresh: () => {},
      stopAutoRefresh: () => {},
      getSession: async () => ({
        data: { session: state.userId ? { user: { id: state.userId } } : null },
        error: null,
      }),
    },
    from: (name: string) => table(name),
  }

  return { state, reset, client }
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => backend.client,
}))

// `supabase.ts` importa AppState, che è scritto in Flow e non è analizzabile qui.
vi.mock('react-native', () => ({
  AppState: { currentState: 'active', addEventListener: () => ({ remove: () => {} }) },
}))

const {
  createRemoteMatch,
  getRemoteMatch,
  listLeagueMatches,
  listMyMatches,
  saveHands,
  summarise,
  toStandingsMatches,
  trySummarise,
} = await import('./matches')

const RULES = makeRules()

function match(hands: ReturnType<typeof makeHand>[] = []) {
  return { rules: RULES, teamNames: { A: 'Allegri', B: 'Musoni' }, hands }
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'partita-1',
    league_id: 'lega-1',
    created_by: 'io',
    rules: RULES,
    team_names: { A: 'Allegri', B: 'Musoni' },
    hands: [],
    status: 'ongoing',
    created_at: '2026-08-18T20:00:00Z',
    updated_at: '2026-08-18T20:00:00Z',
    ...overrides,
  }
}

beforeEach(() => backend.reset())

describe('createRemoteMatch', () => {
  it('registra la formazione, che è ciò che rende possibili le classifiche', async () => {
    backend.state.row = row()

    await createRemoteMatch({
      leagueId: 'lega-1',
      rules: RULES,
      teamNames: { A: 'Allegri', B: 'Musoni' },
      lineup: [
        { kind: 'member', profileId: 'io', team: 'A' },
        { kind: 'member', profileId: 'tu', team: 'B' },
        { kind: 'guest', guestName: 'Ospite', team: 'B' },
      ],
    })

    const formazione = backend.state.inserted.find((i) => i.table === 'match_players')
    expect(formazione?.values).toEqual([
      { match_id: 'partita-1', profile_id: 'io', guest_name: null, team: 'A' },
      { match_id: 'partita-1', profile_id: 'tu', guest_name: null, team: 'B' },
      { match_id: 'partita-1', profile_id: null, guest_name: 'Ospite', team: 'B' },
    ])
  })

  it('accetta una partita senza formazione, fuori da ogni lega', async () => {
    backend.state.row = row({ league_id: null })

    const created = await createRemoteMatch({
      leagueId: null,
      rules: RULES,
      teamNames: { A: 'Allegri', B: 'Musoni' },
    })

    expect(created.leagueId).toBeNull()
    expect(backend.state.inserted.some((i) => i.table === 'match_players')).toBe(false)
  })

  it('rifiuta chi non ha una sessione', async () => {
    backend.state.userId = null
    await expect(
      createRemoteMatch({ leagueId: null, rules: RULES, teamNames: { A: 'A', B: 'B' } }),
    ).rejects.toThrow(/accedere/i)
  })
})

describe('permessi', () => {
  it('marca modificabile solo la partita di chi guarda', async () => {
    backend.state.row = row({ created_by: 'io' })
    const mia = await saveHands('partita-1', match())
    expect(mia.canEdit).toBe(true)

    backend.state.row = row({ created_by: 'qualcun-altro' })
    const altrui = await saveHands('partita-1', match())
    expect(altrui.canEdit).toBe(false)
  })

  it('traduce il rifiuto della policy in un messaggio comprensibile', async () => {
    backend.state.error = {
      code: '42501',
      message: 'new row violates row-level security policy',
    }
    await expect(saveHands('partita-1', match())).rejects.toThrow(
      /Solo chi ha avviato la partita/,
    )
  })

  it('riconosce l assenza di rete', async () => {
    backend.state.error = { message: 'Failed to fetch' }
    await expect(listLeagueMatches('lega-1')).rejects.toThrow(/connessione/i)
  })
})

describe('formazione', () => {
  it('rilegge la formazione insieme alla partita', async () => {
    backend.state.row = row({
      match_players: [
        { profile_id: 'io', team: 'A' },
        { profile_id: 'tu', team: 'B' },
      ],
    })

    const partita = await getRemoteMatch('partita-1')

    expect(partita.lineup).toEqual([
      { kind: 'member', profileId: 'io', team: 'A' },
      { kind: 'member', profileId: 'tu', team: 'B' },
    ])
  })

  it('chiede la formazione a ogni lettura, o le classifiche restano vuote in silenzio', async () => {
    backend.state.row = row()
    backend.state.rows = [row()]

    await getRemoteMatch('partita-1')
    await saveHands('partita-1', match())
    await listLeagueMatches('lega-1')

    expect(backend.state.selected.length).toBeGreaterThan(2)
    for (const columns of backend.state.selected) {
      expect(columns).toContain('match_players')
    }
  })
})

describe('saveHands', () => {
  it('sostituisce l intero elenco delle mani', async () => {
    backend.state.row = row()
    const hands = [makeHand(), makeHand({ scope: { A: 2, B: 0 } })]

    await saveHands('partita-1', match(hands))

    expect(backend.state.updated).toEqual([{ hands, status: 'ongoing' }])
  })

  it('dichiara conclusa la partita che ha raggiunto l obiettivo', async () => {
    backend.state.row = row()
    // Ogni mano di prova vale un punto: tante mani quanto l'obiettivo.
    const hands = Array.from({ length: RULES.targetScore }, () => makeHand())

    await saveHands('partita-1', match(hands))

    expect(backend.state.updated).toEqual([{ hands, status: 'finished' }])
  })

  it('lascia aperta una partita con mani che non sa interpretare', async () => {
    backend.state.row = row()
    const rotte = [{ cards: { A: 99, B: 99 } }] as unknown as ReturnType<typeof makeHand>[]

    await saveHands('partita-1', match(rotte))

    expect(backend.state.updated).toEqual([{ hands: rotte, status: 'ongoing' }])
  })
})

describe('elenchi', () => {
  it('tiene fuori le partite abbandonate, che non sono un risultato', async () => {
    backend.state.rows = [row()]

    await listMyMatches()

    expect(backend.state.excluded).toEqual([['status', 'abandoned']])
  })
})

describe('trySummarise', () => {
  it('riassume una partita leggibile', async () => {
    backend.state.row = row({ hands: [makeHand()] })
    const partita = await getRemoteMatch('partita-1')

    expect(trySummarise(partita)?.score).toContain('Allegri 1')
  })

  it('torna null invece di far cadere la schermata che la elencava', async () => {
    backend.state.row = row({ hands: [{ cards: { A: 99, B: 99 } }] })
    const partita = await getRemoteMatch('partita-1')

    expect(trySummarise(partita)).toBeNull()
  })
})

describe('summarise', () => {
  it('riassume il punteggio usando il dominio, non un conto a parte', () => {
    const remote = {
      id: 'partita-1',
      leagueId: 'lega-1',
      createdBy: 'io',
      canEdit: true,
      status: 'ongoing' as const,
      updatedAt: '2026-08-18T20:00:00Z',
      lineup: [],
      match: {
        rules: RULES,
        teamNames: { A: 'Allegri', B: 'Musoni' },
        // Settebello ad A più due scope: quattro punti in tutto, tre ad A.
        hands: [makeHand({ scope: { A: 2, B: 1 } })],
      },
    }

    expect(summarise(remote)).toEqual({
      score: 'Allegri 3 – Musoni 1',
      finished: false,
      winnerName: null,
    })
  })
})

describe('toStandingsMatches', () => {
  const base = {
    id: 'partita-1',
    leagueId: 'lega-1',
    createdBy: 'io',
    canEdit: true,
    updatedAt: '2026-08-18T20:00:00Z',
  }

  const formazione = [
    { kind: 'member' as const, profileId: 'ada', team: 'A' as const },
    { kind: 'member' as const, profileId: 'bruno', team: 'B' as const },
  ]
  const formazioneAttesa = [
    { profileId: 'ada', team: 'A' as const },
    { profileId: 'bruno', team: 'B' as const },
  ]

  /** Una mano che chiude la partita: settebello più venti scope ad A. */
  const conclusa = [makeHand({ scope: { A: 18, B: 0 } }), makeHand({ scope: { A: 3, B: 0 } })]

  it('tiene le partite concluse con una formazione', () => {
    const risultato = toStandingsMatches([
      {
        ...base,
        status: 'ongoing',
        lineup: formazione,
        match: { rules: RULES, teamNames: { A: 'A', B: 'B' }, hands: conclusa },
      },
    ])

    expect(risultato).toHaveLength(1)
    expect(risultato[0]?.winner).toBe('A')
    expect(risultato[0]?.lineup).toEqual(formazioneAttesa)
  })

  it('scarta gli ospiti dalla classifica personale, restano nel punteggio', () => {
    const risultato = toStandingsMatches([
      {
        ...base,
        status: 'ongoing',
        lineup: [
          ...formazione,
          { kind: 'guest' as const, guestName: 'Ospite', team: 'B' as const },
        ],
        match: { rules: RULES, teamNames: { A: 'A', B: 'B' }, hands: conclusa },
      },
    ])

    expect(risultato[0]?.lineup).toEqual(formazioneAttesa)
  })

  it('scarta le partite ancora in corso', () => {
    const risultato = toStandingsMatches([
      {
        ...base,
        status: 'ongoing',
        lineup: formazione,
        match: { rules: RULES, teamNames: { A: 'A', B: 'B' }, hands: [makeHand()] },
      },
    ])
    expect(risultato).toEqual([])
  })

  it('scarta le partite abbandonate', () => {
    const risultato = toStandingsMatches([
      {
        ...base,
        status: 'abandoned',
        lineup: formazione,
        match: { rules: RULES, teamNames: { A: 'A', B: 'B' }, hands: conclusa },
      },
    ])
    expect(risultato).toEqual([])
  })

  it('scarta le partite senza formazione, che non direbbero chi ha giocato', () => {
    const risultato = toStandingsMatches([
      {
        ...base,
        status: 'ongoing',
        lineup: [],
        match: { rules: RULES, teamNames: { A: 'A', B: 'B' }, hands: conclusa },
      },
    ])
    expect(risultato).toEqual([])
  })

  it('scarta in silenzio una partita illeggibile senza perdere le altre', () => {
    const rotta = {
      ...base,
      id: 'rotta',
      status: 'ongoing' as const,
      lineup: formazione,
      // Mani prive dei campi obbligatori: scoreMatch non le sa calcolare.
      match: {
        rules: RULES,
        teamNames: { A: 'A', B: 'B' },
        hands: [{ cards: { A: 99, B: 99 } }] as never,
      },
    }
    const buona = {
      ...base,
      status: 'ongoing' as const,
      lineup: formazione,
      match: { rules: RULES, teamNames: { A: 'A', B: 'B' }, hands: conclusa },
    }

    expect(toStandingsMatches([rotta, buona])).toHaveLength(1)
  })
})
