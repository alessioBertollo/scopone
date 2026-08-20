import { type Match, scoreMatch } from '../domain/match'
import type { RuleSet } from '../domain/rules'
import type { StandingsMatch } from '../domain/standings'
import type { ByTeam, TeamId } from '../domain/teams'
import { tr } from '../i18n/tr'
import type { MatchRow, MatchStatus } from './database.types'
import { getSupabase } from './supabase'

/** Una partita sul server, con l'indicazione di cosa può farci chi guarda. */
export type RemoteMatch = {
  id: string
  leagueId: string | null
  createdBy: string
  /** Chi non l'ha avviata la vede aggiornarsi ma non può toccarla. */
  canEdit: boolean
  status: MatchStatus
  updatedAt: string
  /** La partita nel formato del dominio: il punteggio lo calcola l'app. */
  match: Match
  /** Chi ha giocato e in che squadra. Vuoto nelle partite libere. */
  lineup: MatchLineup[]
}

export type MatchLineup = { profileId: string; team: TeamId }

/**
 * Sono funzioni e non stringhe perché l'oggetto viene valutato all'import:
 * tradurre qui congelerebbe la lingua a quella del primo caricamento, e chi
 * la cambia dalle impostazioni continuerebbe a leggere errori in italiano.
 */
const MESSAGES = {
  network: () => tr('matches.network'),
  notAllowed: () => tr('matches.notAllowed'),
  notFound: () => tr('matches.notFound'),
  createFailed: () => tr('matches.createFailed'),
  saveFailed: () => tr('matches.saveFailed'),
  loadFailed: () => tr('matches.loadFailed'),
  signInRequired: () => tr('matches.signInRequired'),
} as const

/**
 * `match_players` è un innesto e non una colonna: senza di esso ogni partita
 * torna con la formazione vuota, e `toStandingsMatches` le scarta tutte in
 * silenzio. Le classifiche resterebbero vuote senza un errore da nessuna
 * parte, ed è il motivo per cui va chiesto a ogni lettura.
 */
const COLUMNS =
  'id, league_id, created_by, rules, team_names, hands, status, created_at, updated_at, match_players(profile_id, team)'

/**
 * Il rifiuto di una policy arriva come 42501 o come zero righe aggiornate.
 * Sono la stessa cosa vista da due angoli: chi non può scrivere non vede
 * nemmeno la riga.
 */
function translate(error: { code?: string; message?: string } | null, fallback: string): Error {
  if (!error) return new Error(fallback)
  if (error.code === '42501') return new Error(MESSAGES.notAllowed())
  if (error.code === 'PGRST116') return new Error(MESSAGES.notFound())
  if (/fetch|network|Failed to fetch/i.test(error.message ?? ''))
    return new Error(MESSAGES.network())
  return new Error(fallback)
}

type RowWithPlayers = MatchRow & {
  match_players?: { profile_id: string; team: TeamId }[] | null
}

function toRemoteMatch(row: MatchRow, viewerId: string | null): RemoteMatch {
  const players = (row as RowWithPlayers).match_players ?? []
  return {
    id: row.id,
    leagueId: row.league_id,
    createdBy: row.created_by,
    canEdit: viewerId !== null && row.created_by === viewerId,
    status: row.status,
    updatedAt: row.updated_at,
    match: { rules: row.rules, teamNames: row.team_names, hands: row.hands },
    lineup: players.map((player) => ({ profileId: player.profile_id, team: player.team })),
  }
}

async function viewerId(): Promise<string | null> {
  const { data } = await getSupabase().auth.getSession()
  return data.session?.user.id ?? null
}

export async function createRemoteMatch(input: {
  leagueId: string | null
  rules: RuleSet
  teamNames: ByTeam<string>
  lineup?: MatchLineup[]
}): Promise<RemoteMatch> {
  const supabase = getSupabase()
  const me = await viewerId()
  if (!me) throw new Error(MESSAGES.signInRequired())

  const { data, error } = await supabase
    .from('matches')
    .insert({
      league_id: input.leagueId,
      created_by: me,
      rules: input.rules,
      team_names: input.teamNames,
      hands: [],
    })
    .select(COLUMNS)
    .single()

  if (error || !data) throw translate(error, MESSAGES.createFailed())
  const created = toRemoteMatch(data as MatchRow, me)

  // La formazione è ciò che rende possibili le classifiche per giocatore:
  // senza, sappiamo chi ha vinto ma non chi stava in quale squadra.
  if (input.lineup && input.lineup.length > 0) {
    const { error: lineupError } = await supabase.from('match_players').insert(
      input.lineup.map((player) => ({
        match_id: created.id,
        profile_id: player.profileId,
        team: player.team,
      })),
    )
    if (lineupError) throw translate(lineupError, MESSAGES.createFailed())
  }

  return created
}

/**
 * Sostituisce l'intero elenco delle mani. Non è un'ottimizzazione mancata:
 * a modificare è sempre e solo chi ha avviato la partita, quindi non esiste
 * scrittura concorrente da fondere, e una sostituzione secca non lascia mai
 * lo stato a metà.
 */
/**
 * Lo stato viaggia con le mani, nella stessa istruzione: derivarlo qui invece
 * di affidarlo a una chiamata separata rende impossibile che i due dati si
 * contraddicano, e dà al server un campo su cui filtrare senza dover leggere
 * tutte le mani di tutte le partite.
 */
function derivedStatus(match: Match): MatchStatus {
  try {
    return scoreMatch(match).status === 'finished' ? 'finished' : 'ongoing'
  } catch {
    // Mani che questa versione non sa interpretare: meglio lasciarla aperta
    // che dichiararla conclusa sulla base di un calcolo fallito.
    return 'ongoing'
  }
}

export async function saveHands(matchId: string, match: Match): Promise<RemoteMatch> {
  const supabase = getSupabase()
  const me = await viewerId()

  const { data, error } = await supabase
    .from('matches')
    .update({ hands: match.hands, status: derivedStatus(match) })
    .eq('id', matchId)
    .select(COLUMNS)
    .single()

  if (error || !data) throw translate(error, MESSAGES.saveFailed())
  return toRemoteMatch(data as MatchRow, me)
}

export async function setMatchStatus(
  matchId: string,
  status: MatchStatus,
): Promise<RemoteMatch> {
  const supabase = getSupabase()
  const me = await viewerId()

  const { data, error } = await supabase
    .from('matches')
    .update({ status })
    .eq('id', matchId)
    .select(COLUMNS)
    .single()

  if (error || !data) throw translate(error, MESSAGES.saveFailed())
  return toRemoteMatch(data as MatchRow, me)
}

export async function getRemoteMatch(matchId: string): Promise<RemoteMatch> {
  const supabase = getSupabase()
  const me = await viewerId()

  const { data, error } = await supabase
    .from('matches')
    .select(COLUMNS)
    .eq('id', matchId)
    .single()
  if (error || !data) throw translate(error, MESSAGES.notFound())
  return toRemoteMatch(data as MatchRow, me)
}

/** Partite di una lega, dalla più recente. */
export async function listLeagueMatches(leagueId: string, limit = 20): Promise<RemoteMatch[]> {
  const supabase = getSupabase()
  const me = await viewerId()

  const { data, error } = await supabase
    .from('matches')
    .select(COLUMNS)
    .eq('league_id', leagueId)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) throw translate(error, MESSAGES.loadFailed())
  return (data as MatchRow[]).map((row) => toRemoteMatch(row, me))
}

/**
 * Partite che riguardano chi guarda: quelle avviate da lui e quelle delle
 * sue leghe. Le policy fanno già il filtro, qui si ordina e si tronca.
 */
export async function listMyMatches(limit = 30): Promise<RemoteMatch[]> {
  const supabase = getSupabase()
  const me = await viewerId()

  const { data, error } = await supabase
    .from('matches')
    .select(COLUMNS)
    // Una partita abbandonata non è né da concludere né un risultato: non
    // appartiene a nessuna delle due sezioni della home.
    .neq('status', 'abandoned')
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) throw translate(error, MESSAGES.loadFailed())
  return (data as MatchRow[]).map((row) => toRemoteMatch(row, me))
}

/**
 * Segue una partita mentre viene giocata. Chi guarda riceve il tabellone
 * aggiornato senza interrogare il server a intervalli, e senza poter
 * modificare nulla: le policy valgono anche qui.
 *
 * Restituisce la funzione per smettere di ascoltare, da chiamare quando la
 * schermata sparisce.
 */
export function watchRemoteMatch(
  matchId: string,
  onChange: (match: RemoteMatch) => void,
): () => void {
  const supabase = getSupabase()
  let stopped = false

  /**
   * La notifica di Postgres porta soltanto le colonne di `matches`: la
   * formazione vive in un'altra tabella e nel payload non c'è. Costruire la
   * partita da lì consegnerebbe uno schieramento vuoto a ogni aggiornamento.
   * Perciò la notifica fa solo da sveglia, e la partita si rilegge intera.
   */
  const channel = supabase
    .channel(`match:${matchId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
      () => {
        void getRemoteMatch(matchId)
          .then((aggiornata) => {
            if (!stopped) onChange(aggiornata)
          })
          // Un giro a vuoto non deve rompere la schermata di chi guarda: la
          // prossima notifica riporta comunque lo stato corrente.
          .catch(() => {})
      },
    )
    .subscribe()

  return () => {
    stopped = true
    void supabase.removeChannel(channel)
  }
}

/** Riepilogo per gli elenchi, senza far ricalcolare il punteggio alla UI. */
export function summarise(remote: RemoteMatch): {
  score: string
  finished: boolean
  winnerName: string | null
} {
  const state = scoreMatch(remote.match)
  const { A, B } = remote.match.teamNames
  return {
    score: `${A} ${state.totals.A} – ${B} ${state.totals.B}`,
    finished: state.status === 'finished',
    winnerName: state.winner ? remote.match.teamNames[state.winner] : null,
  }
}

/**
 * Come `summarise`, ma una partita che questa versione non sa interpretare
 * torna `null` invece di far cadere la schermata che la stava elencando.
 */
export function trySummarise(remote: RemoteMatch): ReturnType<typeof summarise> | null {
  try {
    return summarise(remote)
  } catch {
    return null
  }
}

/**
 * Riduce le partite a ciò che serve alla classifica, scartando quelle che non
 * possono contribuire: ancora in corso, abbandonate, senza formazione, o con
 * mani che questa versione non sa interpretare.
 *
 * Lo scarto è silenzioso di proposito: una partita illeggibile non deve
 * impedire di vedere la classifica di tutte le altre.
 */
export function toStandingsMatches(matches: RemoteMatch[]): StandingsMatch[] {
  const risultato: StandingsMatch[] = []

  for (const remote of matches) {
    if (remote.status === 'abandoned' || remote.lineup.length === 0) continue

    try {
      const state = scoreMatch(remote.match)
      if (state.winner === null) continue
      risultato.push({ totals: state.totals, winner: state.winner, lineup: remote.lineup })
    } catch {}
  }

  return risultato
}
