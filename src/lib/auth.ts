import type { SupabaseClient, User } from '@supabase/supabase-js'
import { tr } from '../i18n/tr'
import type { ProfileRow } from './database.types'
import { getSupabase } from './supabase'

/**
 * L'utente come lo vede l'app: l'identificatore per le query, l'email per
 * riconoscersi al prossimo accesso, il nome per gli altri giocatori.
 * Tutto il resto di `auth.users` non serve e non viene portato in giro.
 */
export type AuthUser = {
  id: string
  email: string
  displayName: string
  /** Animale scelto come icona. Null se non ha ancora scelto. */
  avatar: string | null
}

/** Stessi limiti del check su `profiles.display_name` nella migrazione 0001. */
const NAME_MIN = 1
const NAME_MAX = 40

/** Supabase manda per email un codice numerico di sei cifre. */
const CODE_LENGTH = 6

/**
 * Un messaggio per ogni cosa che può andare storta, con dentro la mossa
 * successiva. Gli errori di Supabase parlano di token, di HTTP e di flow: chi
 * sta solo cercando di entrare non ci ricava niente.
 *
 * Sono funzioni e non stringhe perché l'oggetto viene valutato all'import:
 * tradurre qui congelerebbe la lingua a quella del primo caricamento, e chi
 * la cambia dalle impostazioni continuerebbe a leggere errori in italiano.
 */
const MESSAGES = {
  network: () => tr('auth.network'),
  invalidEmail: () => tr('auth.invalidEmail'),
  malformedCode: () => tr('auth.malformedCode', { cifre: CODE_LENGTH }),
  wrongCode: () => tr('auth.wrongCode'),
  expiredCode: () => tr('auth.expiredCode'),
  tooManyRequests: () => tr('auth.tooManyRequests'),
  signInDisabled: () => tr('auth.signInDisabled'),
  banned: () => tr('auth.banned'),
  noSession: () => tr('auth.noSession'),
  nameLength: () => tr('auth.nameLength', { minimo: NAME_MIN, massimo: NAME_MAX }),
  sendFailed: () => tr('auth.sendFailed'),
  verifyFailed: () => tr('auth.verifyFailed'),
  signOutFailed: () => tr('auth.signOutFailed'),
  saveNameFailed: () => tr('auth.saveNameFailed'),
  saveAvatarFailed: () => tr('auth.saveAvatarFailed'),
  deleteFailed: () => tr('auth.deleteFailed'),
} as const

/**
 * Nome di ripiego quando il profilo non è leggibile. Il trigger sul database
 * ne sceglie uno in italiano, ma quello è un dato: questo è solo ciò che si
 * legge a schermo finché il nome vero non arriva, e segue la lingua scelta.
 */
function fallbackName(): string {
  return tr('common.player')
}

export async function sendLoginCode(email: string): Promise<void> {
  const address = requireEmail(email)

  const { error } = await getSupabase().auth.signInWithOtp({
    email: address,
    // Non esiste una registrazione separata: il primo codice chiesto da un
    // indirizzo nuovo vale da iscrizione.
    options: { shouldCreateUser: true },
  })

  if (error) throw translate(error, MESSAGES.sendFailed())
}

export async function verifyLoginCode(email: string, code: string): Promise<AuthUser> {
  const address = requireEmail(email)
  const token = requireCode(code)
  const supabase = getSupabase()

  const { data, error } = await supabase.auth.verifyOtp({
    email: address,
    token,
    type: 'email',
  })
  if (error) throw translate(error, MESSAGES.verifyFailed())

  const user = data.user ?? data.session?.user
  if (!user) throw new Error(MESSAGES.verifyFailed())

  return toAuthUser(supabase, user)
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabase().auth.signOut()
  if (error) throw translate(error, MESSAGES.signOutFailed())
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = getSupabase()

  // `getSession` legge la sessione già salvata e non chiama il server:
  // all'avvio conta partire subito, e `getUser` senza rete fallirebbe.
  const { data, error } = await supabase.auth.getSession()
  if (error) throw translate(error, MESSAGES.noSession())

  const user = data.session?.user
  if (!user) return null

  return toAuthUser(supabase, user)
}

export async function updateDisplayName(name: string): Promise<AuthUser> {
  const displayName = name.trim()
  if (displayName.length < NAME_MIN || displayName.length > NAME_MAX) {
    throw new Error(MESSAGES.nameLength())
  }

  const supabase = getSupabase()
  const user = await requireUser(supabase)

  const { data, error } = await supabase
    .from('profiles')
    .update({ display_name: displayName })
    .eq('id', user.id)
    .select('id, display_name, avatar, created_at')
    .single()

  if (error) throw translate(error, MESSAGES.saveNameFailed())

  const row = data as ProfileRow | null
  return {
    id: user.id,
    email: user.email ?? '',
    displayName: row?.display_name ?? displayName,
    avatar: row?.avatar ?? null,
  }
}

// ------------------------------------------------------------ utilità interne

async function requireUser(supabase: SupabaseClient): Promise<User> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw translate(error, MESSAGES.noSession())

  const user = data.session?.user
  if (!user) throw new Error(MESSAGES.noSession())

  return user
}

async function toAuthUser(supabase: SupabaseClient, user: User): Promise<AuthUser> {
  const email = user.email ?? ''
  const profilo = await readProfile(supabase, user.id)

  return {
    id: user.id,
    email,
    displayName: profilo?.display_name ?? nameFromEmail(email),
    avatar: profilo?.avatar ?? null,
  }
}

/**
 * Il profilo lo crea un trigger alla registrazione, ma per giocare non è
 * indispensabile. Se la lettura non riesce — rete assente, riga non ancora
 * visibile — si va avanti con un nome ricavato dall'email invece di buttare
 * fuori chi la sessione ce l'ha già.
 */
async function readProfile(supabase: SupabaseClient, id: string): Promise<ProfileRow | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar, created_at')
      .eq('id', id)
      .maybeSingle()

    if (error) return null

    return (data ?? null) as ProfileRow | null
  } catch {
    return null
  }
}

/** Stessa regola del trigger `create_profile_for_new_user`, così i due nomi coincidono. */
function nameFromEmail(email: string): string {
  const local = email.split('@')[0]?.trim()
  return local ? local : fallbackName()
}

/**
 * Controllare l'indirizzo qui evita un giro di rete inutile e dà la risposta
 * mentre l'utente sta ancora guardando il campo.
 */
function requireEmail(email: string): string {
  const address = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) throw new Error(MESSAGES.invalidEmail())
  return address
}

function requireCode(code: string): string {
  // Chi incolla il codice dalla mail si porta dietro spazi e a capo.
  const digits = code.replace(/\s+/g, '')
  if (digits.length !== CODE_LENGTH || !/^\d+$/.test(digits)) {
    throw new Error(MESSAGES.malformedCode())
  }
  return digits
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
  // `name`, `message` e `status` di `AuthError` stanno sul prototipo o sono
  // non enumerabili: lo spread da solo non li porta via.
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
 * operazione a operazione perché un guasto ignoto durante l'invio del codice
 * e uno durante il salvataggio del nome chiedono cose diverse all'utente.
 */
function translate(error: unknown, fallback: string): Error {
  const { name, code, status, message } = readErrorFields(error)

  // `AuthRetryableFetchError`, o uno status 0, è come Supabase segnala che la
  // richiesta non è nemmeno partita: quasi sempre è la rete.
  const offline =
    name === 'AuthRetryableFetchError' ||
    status === 0 ||
    (message !== undefined &&
      /failed to fetch|network request failed|networkerror/i.test(message))
  if (offline) return fail(MESSAGES.network(), error)

  switch (code) {
    // Con un codice sbagliato GoTrue risponde `otp_expired` esattamente come
    // con uno scaduto: i due casi non sono distinguibili, e il messaggio li
    // copre entrambi.
    case 'otp_expired':
      return fail(MESSAGES.expiredCode(), error)
    case 'invalid_credentials':
      return fail(MESSAGES.wrongCode(), error)
    case 'validation_failed':
    case 'email_address_invalid':
      return fail(MESSAGES.invalidEmail(), error)
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return fail(MESSAGES.tooManyRequests(), error)
    case 'user_banned':
      return fail(MESSAGES.banned(), error)
    case 'signup_disabled':
    case 'email_provider_disabled':
    case 'email_address_not_authorized':
      return fail(MESSAGES.signInDisabled(), error)
    case 'session_expired':
    case 'session_not_found':
    case 'refresh_token_not_found':
    case 'bad_jwt':
      return fail(MESSAGES.noSession(), error)
    // Codice SQLSTATE di PostgREST: il check sulla lunghezza del nome.
    case '23514':
      return fail(MESSAGES.nameLength(), error)
    default:
      break
  }

  if (status === 429) return fail(MESSAGES.tooManyRequests(), error)

  return fail(fallback, error)
}

/**
 * Cancella account, profilo, leghe possedute e partite create. Irreversibile.
 *
 * Il lavoro lo fa una funzione del database, non una sequenza di chiamate
 * dall'app: i vincoli sulle tabelle impongono un ordine preciso, e una
 * cancellazione interrotta a metà lascerebbe un account inutilizzabile invece
 * di uno intatto.
 */
export async function deleteAccount(): Promise<void> {
  const supabase = getSupabase()
  await requireUser(supabase)

  const { error } = await supabase.rpc('delete_my_account')
  if (error) throw translate(error, MESSAGES.deleteFailed())

  // Il token è già firmato e resta valido finché non lo si butta: nessuno
  // lo revoca al posto nostro solo perché l'utente non esiste più.
  await supabase.auth.signOut()
}

/**
 * Salva l'animale scelto come icona.
 *
 * Non valida il nome contro l'elenco dell'app: il database accetta qualunque
 * parola minuscola di proposito, e chi legge ricade su un'icona derivata se
 * non la riconosce. Così un'app più nuova può salvare un animale che una più
 * vecchia non conosce, senza che nessuna delle due si rompa.
 */
export async function updateAvatar(avatar: string): Promise<AuthUser> {
  const supabase = getSupabase()
  const user = await requireUser(supabase)

  const { data, error } = await supabase
    .from('profiles')
    .update({ avatar })
    .eq('id', user.id)
    .select('id, display_name, avatar, created_at')
    .single()

  if (error) throw translate(error, MESSAGES.saveAvatarFailed())

  const row = data as ProfileRow | null
  return {
    id: user.id,
    email: user.email ?? '',
    displayName: row?.display_name ?? nameFromEmail(user.email ?? ''),
    avatar: row?.avatar ?? avatar,
  }
}
