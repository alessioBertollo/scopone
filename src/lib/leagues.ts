import type { SupabaseClient } from '@supabase/supabase-js'
import { tr } from '../i18n/tr'
import type { LeagueMemberRow, LeagueRole, LeagueRow, ProfileRow } from './database.types'
import { getSupabase } from './supabase'

export type { LeagueRole }

/**
 * La lega come serve alla UI: il codice da dettare, chi l'ha creata, e le due
 * informazioni che altrimenti costringerebbero ogni schermata a rifare le
 * stesse due query — il proprio ruolo e quanti sono dentro.
 */
export type League = {
  id: string
  name: string
  inviteCode: string
  createdBy: string
  role: LeagueRole
  memberCount: number
}

export type LeagueMember = {
  profileId: string
  displayName: string
  role: LeagueRole
  joinedAt: string
}

/** Stessi limiti del check su `leagues.name` nella migrazione 0001. */
const NAME_MIN = 1
const NAME_MAX = 60

/**
 * Stesso alfabeto del check su `leagues.invite_code`. Mancano 0, O, 1, I e L:
 * il codice si detta a voce, e quelle coppie si confondono.
 */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6
const CODE_PATTERN = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`)

/**
 * Nome di ripiego quando il profilo di un membro non è leggibile: è solo
 * ciò che si legge a schermo, quindi segue la lingua scelta.
 */
function fallbackName(): string {
  return tr('common.player')
}

/**
 * Un messaggio per ogni cosa che può andare storta, con dentro la mossa
 * successiva. Postgres parla di SQLSTATE e di policy: a chi sta cercando di
 * entrare in una lega non dicono niente di utile.
 *
 * Sono funzioni e non stringhe perché l'oggetto viene valutato all'import:
 * tradurre qui congelerebbe la lingua a quella del primo caricamento.
 */
const MESSAGES = {
  network: () => tr('leagues.network'),
  noSession: () => tr('leagues.noSession'),
  nameLength: () => tr('leagues.nameLength', { minimo: NAME_MIN, massimo: NAME_MAX }),
  malformedCode: () => tr('leagues.malformedCode', { caratteri: CODE_LENGTH }),
  invalidCode: () => tr('leagues.invalidCode'),
  notFound: () => tr('leagues.notFound'),
  notMember: () => tr('leagues.notMember'),
  ownerCannotLeave: () => tr('leagues.ownerCannotLeave'),
  deleteFailed: () => tr('leagues.deleteFailed'),
  forbidden: () => tr('leagues.forbidden'),
  createFailed: () => tr('leagues.createFailed'),
  joinFailed: () => tr('leagues.joinFailed'),
  listFailed: () => tr('leagues.listFailed'),
  loadFailed: () => tr('leagues.loadFailed'),
  leaveFailed: () => tr('leagues.leaveFailed'),
} as const

const LEAGUE_COLUMNS = 'id, name, created_by, invite_code, created_at'
const MEMBER_COLUMNS = 'league_id, profile_id, role, joined_at'
const PROFILE_COLUMNS = 'id, display_name, created_at'

/** Crea la lega, genera il codice e iscrive chi la crea, in transazione. */
export async function createLeague(name: string): Promise<League> {
  const leagueName = name.trim()
  if (leagueName.length < NAME_MIN || leagueName.length > NAME_MAX) {
    throw new Error(MESSAGES.nameLength())
  }

  const supabase = getSupabase()
  const profileId = await requireProfileId(supabase)

  // L'insert diretto è vietato dalle policy di proposito: lega, codice
  // univoco e iscrizione del proprietario devono nascere insieme o non
  // nascere affatto, e solo la funzione sa rigenerare il codice se collide.
  const { data, error } = await supabase.rpc('create_league', { league_name: leagueName })
  if (error) throw translate(error, MESSAGES.createFailed())

  const row = firstRow<LeagueRow>(data)
  if (!row) throw new Error(MESSAGES.createFailed())

  // Appena creata la lega ha un solo iscritto, chi l'ha creata: chiederlo al
  // server sarebbe un giro di rete per sapere una cosa che già sappiamo.
  return toLeague(row, 1, roleOf(row, profileId))
}

/** Entra con il codice di invito. Idempotente se sei già dentro. */
export async function joinLeagueByCode(code: string): Promise<League> {
  const inviteCode = requireInviteCode(code)

  const supabase = getSupabase()
  const profileId = await requireProfileId(supabase)

  // Con RLS attivo la lega non è leggibile finché non se ne fa parte, quindi
  // il codice non si può nemmeno cercare: l'ingresso passa per forza di qui.
  const { data, error } = await supabase.rpc('join_league_by_code', { code: inviteCode })
  if (error) throw translate(error, MESSAGES.joinFailed())

  const id = readUuid(data)
  if (!id) throw new Error(MESSAGES.invalidCode())

  // La funzione non fa nulla se l'iscrizione c'era già, ma restituisce
  // comunque la lega: rileggerla è anche il modo di gestire il caso «ero già
  // dentro» senza distinguerlo.
  return readLeague(supabase, id, profileId, MESSAGES.joinFailed())
}

export async function listMyLeagues(): Promise<League[]> {
  const supabase = getSupabase()
  const profileId = await requireProfileId(supabase)

  // Nessun filtro sulle due query: le policy di select mostrano solo le leghe
  // di cui si fa parte e le iscrizioni che le riguardano. Rifiltrare qui
  // darebbe l'illusione che sia l'app a decidere chi vede cosa, e ci
  // metterebbe una seconda regola da tenere allineata alla prima.
  const [rows, members] = await Promise.all([
    fetchLeagueRows(supabase, MESSAGES.listFailed()),
    fetchMemberRows(supabase, MESSAGES.listFailed()),
  ])

  const counts = new Map<string, number>()
  for (const member of members) {
    counts.set(member.league_id, (counts.get(member.league_id) ?? 0) + 1)
  }

  return rows.map((row) => toLeague(row, counts.get(row.id) ?? 0, roleOf(row, profileId)))
}

export async function getLeague(
  id: string,
): Promise<{ league: League; members: LeagueMember[] }> {
  const supabase = getSupabase()
  const profileId = await requireProfileId(supabase)

  const [row, memberRows] = await Promise.all([
    fetchLeagueRow(supabase, id, MESSAGES.loadFailed()),
    fetchMemberRows(supabase, MESSAGES.loadFailed(), id),
  ])

  const names = await fetchDisplayNames(
    supabase,
    memberRows.map((member) => member.profile_id),
  )

  const members = memberRows
    .map((member) => ({
      profileId: member.profile_id,
      displayName: names.get(member.profile_id) ?? fallbackName(),
      role: member.role,
      joinedAt: member.joined_at,
    }))
    .sort(byRoleThenJoined)

  return { league: toLeague(row, memberRows.length, roleOf(row, profileId)), members }
}

/** Esce dalla lega. Chi l'ha creata non può uscire: deve eliminarla. */
export async function leaveLeague(id: string): Promise<void> {
  const supabase = getSupabase()
  const profileId = await requireProfileId(supabase)

  const { data, error } = await supabase
    .from('league_members')
    .select(MEMBER_COLUMNS)
    .eq('league_id', id)
    .eq('profile_id', profileId)
    .maybeSingle()
  if (error) throw translate(error, MESSAGES.leaveFailed())

  const membership = (data ?? null) as LeagueMemberRow | null
  if (!membership) throw new Error(MESSAGES.notMember())

  // Il database lascerebbe uscire anche il proprietario, perché la policy
  // guarda solo `profile_id = auth.uid()`. Ne resterebbe una lega che nessuno
  // può più eliminare: `leagues.created_by` ha un `on delete restrict`, e
  // rinominare o cancellare è riservato a chi l'ha creata.
  if (membership.role === 'owner') throw new Error(MESSAGES.ownerCannotLeave())

  const { error: deleteError } = await supabase
    .from('league_members')
    .delete()
    .eq('league_id', id)
    .eq('profile_id', profileId)
  if (deleteError) throw translate(deleteError, MESSAGES.leaveFailed())
}

// ------------------------------------------------------------ utilità interne

async function readLeague(
  supabase: SupabaseClient,
  id: string,
  profileId: string,
  fallback: string,
): Promise<League> {
  const [row, members] = await Promise.all([
    fetchLeagueRow(supabase, id, fallback),
    fetchMemberRows(supabase, fallback, id),
  ])

  return toLeague(row, members.length, roleOf(row, profileId))
}

async function fetchLeagueRows(
  supabase: SupabaseClient,
  fallback: string,
): Promise<LeagueRow[]> {
  const { data, error } = await supabase
    .from('leagues')
    .select(LEAGUE_COLUMNS)
    .order('created_at', { ascending: true })
  if (error) throw translate(error, fallback)

  return (data ?? []) as LeagueRow[]
}

async function fetchLeagueRow(
  supabase: SupabaseClient,
  id: string,
  fallback: string,
): Promise<LeagueRow> {
  const { data, error } = await supabase
    .from('leagues')
    .select(LEAGUE_COLUMNS)
    .eq('id', id)
    .maybeSingle()
  if (error) throw translate(error, fallback)

  const row = (data ?? null) as LeagueRow | null
  // Una lega inesistente e una di cui non si fa parte sono la stessa cosa
  // vista da fuori, ed è voluto: altrimenti si potrebbero sondare gli id.
  if (!row) throw new Error(MESSAGES.notFound())

  return row
}

async function fetchMemberRows(
  supabase: SupabaseClient,
  fallback: string,
  leagueId?: string,
): Promise<LeagueMemberRow[]> {
  const query = supabase.from('league_members').select(MEMBER_COLUMNS)
  const { data, error } = await (leagueId === undefined
    ? query
    : query.eq('league_id', leagueId))
  if (error) throw translate(error, fallback)

  return (data ?? []) as LeagueMemberRow[]
}

/**
 * I nomi sono un ornamento: se la lettura non riesce si mostra il ripiego
 * invece di far fallire l'intera schermata della lega.
 */
async function fetchDisplayNames(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Map<string, string>> {
  const names = new Map<string, string>()
  if (ids.length === 0) return names

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .in('id', ids)
    if (error) return names

    for (const row of (data ?? []) as ProfileRow[]) {
      names.set(row.id, row.display_name)
    }
  } catch {
    return names
  }

  return names
}

function toLeague(row: LeagueRow, memberCount: number, role: LeagueRole): League {
  return {
    id: row.id,
    name: row.name,
    inviteCode: row.invite_code,
    createdBy: row.created_by,
    role,
    // Chi legge la lega ne fa parte per definizione: uno zero vorrebbe dire
    // che le iscrizioni non sono arrivate, non che la lega è deserta.
    memberCount: memberCount > 0 ? memberCount : 1,
  }
}

function roleOf(row: LeagueRow, profileId: string): LeagueRole {
  return row.created_by === profileId ? 'owner' : 'member'
}

function byRoleThenJoined(a: LeagueMember, b: LeagueMember): number {
  if (a.role !== b.role) return a.role === 'owner' ? -1 : 1
  return a.joinedAt.localeCompare(b.joinedAt)
}

/**
 * Controllare il codice qui evita un giro di rete inutile e risponde mentre
 * l'utente sta ancora guardando il campo. Spazi e trattini cadono perché un
 * codice dettato a voce viene riscritto come capita, e le minuscole pure: sul
 * server il confronto è su `upper(trim(code))`.
 */
function requireInviteCode(code: string): string {
  const normalized = code.replace(/[\s-]+/g, '').toUpperCase()
  if (!CODE_PATTERN.test(normalized)) throw new Error(MESSAGES.malformedCode())
  return normalized
}

async function requireProfileId(supabase: SupabaseClient): Promise<string> {
  // `getSession` legge la sessione già salvata e non chiama il server: le
  // leghe si guardano spesso, e un giro di rete in più a ogni lettura si sente.
  const { data, error } = await supabase.auth.getSession()
  if (error) throw translate(error, MESSAGES.noSession())

  const id = data.session?.user.id
  if (!id) throw new Error(MESSAGES.noSession())

  return id
}

/**
 * Una funzione che restituisce un record può tornare come oggetto o come
 * lista di un elemento a seconda di come PostgREST negozia la risposta.
 */
function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] ?? null) as T | null
  return (data ?? null) as T | null
}

function readUuid(data: unknown): string | null {
  if (typeof data === 'string') return data.length > 0 ? data : null
  if (Array.isArray(data)) {
    const first: unknown = data[0]
    return typeof first === 'string' && first.length > 0 ? first : null
  }
  return null
}

type ErrorFields = {
  name: string | undefined
  code: string | undefined
  status: number | undefined
  message: string | undefined
}

function readErrorFields(error: unknown): ErrorFields {
  if (typeof error !== 'object' || error === null) return empty()

  const fields: Record<string, unknown> = { ...error }
  // Su un `Error` vero `name` e `message` stanno sul prototipo o sono non
  // enumerabili: lo spread da solo non se li porta dietro.
  if (error instanceof Error) {
    fields.name = error.name
    fields.message = error.message
  }

  return {
    name: typeof fields.name === 'string' ? fields.name : undefined,
    code: typeof fields.code === 'string' ? fields.code : undefined,
    status: typeof fields.status === 'number' ? fields.status : undefined,
    message: typeof fields.message === 'string' ? fields.message : undefined,
  }
}

function empty(): ErrorFields {
  return { name: undefined, code: undefined, status: undefined, message: undefined }
}

function fail(message: string, cause: unknown): Error {
  return new Error(message, { cause })
}

/**
 * Traduce l'errore grezzo in una frase utile. Il `fallback` cambia da
 * operazione a operazione perché un guasto ignoto mentre si crea una lega e
 * uno mentre la si carica chiedono all'utente cose diverse.
 */
function translate(error: unknown, fallback: string): Error {
  const { name, code, status, message } = readErrorFields(error)

  const offline =
    name === 'AuthRetryableFetchError' ||
    status === 0 ||
    (message !== undefined &&
      /failed to fetch|network request failed|networkerror/i.test(message))
  if (offline) return fail(MESSAGES.network(), error)

  // P0001 è il codice del `raise exception` di plpgsql: i messaggi di
  // `create_league` e `join_league_by_code` sono già scritti per l'utente,
  // quindi sostituirli con un generico sarebbe una perdita. Restano in
  // italiano anche in inglese: li scrive il database, non l'app.
  if (code === 'P0001' && message !== undefined && message.trim().length > 0) {
    return fail(ensureStop(message.trim()), error)
  }

  switch (code) {
    // Violazione di un check: sui dati che mandiamo può essere solo il nome,
    // perché il codice di invito lo genera il server.
    case '23514':
      return fail(MESSAGES.nameLength(), error)
    // Nessun profilo a cui agganciare l'iscrizione: la sessione c'è ma la
    // riga creata dal trigger non è ancora arrivata.
    case '23503':
      return fail(MESSAGES.noSession(), error)
    case '42501':
      return fail(MESSAGES.forbidden(), error)
    case 'PGRST301':
    case 'session_expired':
    case 'session_not_found':
    case 'refresh_token_not_found':
    case 'bad_jwt':
      return fail(MESSAGES.noSession(), error)
    default:
      break
  }

  if (status === 401 || status === 403) return fail(MESSAGES.forbidden(), error)

  return fail(fallback, error)
}

/** I messaggi di Postgres arrivano senza punto finale, gli altri ce l'hanno. */
function ensureStop(message: string): string {
  return /[.!?]$/.test(message) ? message : `${message}.`
}

/**
 * Elimina la lega, con le sue iscrizioni e le sue partite. Riservata a chi
 * l'ha creata: è la via d'uscita del proprietario, che non può limitarsi ad
 * abbandonarla senza lasciarla senza padrone.
 */
export async function deleteLeague(id: string): Promise<void> {
  const supabase = getSupabase()
  await requireProfileId(supabase)

  const { error } = await supabase.from('leagues').delete().eq('id', id)
  if (error) throw translate(error, MESSAGES.deleteFailed())
}
