import type { SupabaseClient } from '@supabase/supabase-js'
import { tr } from '../i18n/tr'
import type { FriendRow, FriendStatus, ProfileRow } from './database.types'
import { codeOf, type ErrorMessages, fallbackName, translateError } from './errors'
import { getSupabase } from './supabase'

export type { FriendStatus }

/**
 * Un'amicizia come serve alla UI. `incoming` distingue i due lati di una
 * richiesta in attesa: chi l'ha ricevuta deve poter accettare, chi l'ha
 * mandata può solo ritirarla, e sono due schermate diverse a parità di stato.
 */
export type Friend = {
  profileId: string
  displayName: string
  /** Animale scelto come icona. Null se non ha ancora scelto. */
  avatar: string | null
  status: FriendStatus
  incoming: boolean
}

/**
 * Stesso alfabeto e stessa lunghezza del check su `profiles.friend_code`.
 * Mancano 0, O, 1, I e L: il codice si detta a voce.
 */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const CODE_LENGTH = 6
const CODE_PATTERN = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`)

type FriendsMessages = ErrorMessages & {
  malformedCode: () => string
  ownCode: () => string
  codeFailed: () => string
  listFailed: () => string
  sendFailed: () => string
  acceptFailed: () => string
  removeFailed: () => string
}

const MESSAGES: FriendsMessages = {
  network: () => tr('friends.network'),
  noSession: () => tr('friends.noSession'),
  forbidden: () => tr('friends.forbidden'),
  malformedCode: () => tr('friends.malformedCode', { caratteri: CODE_LENGTH }),
  ownCode: () => tr('friends.ownCode'),
  codeFailed: () => tr('friends.codeFailed'),
  listFailed: () => tr('friends.listFailed'),
  sendFailed: () => tr('friends.sendFailed'),
  acceptFailed: () => tr('friends.acceptFailed'),
  removeFailed: () => tr('friends.removeFailed'),
}

const PROFILE_COLUMNS = 'id, display_name, friend_code, created_at'

/** Il proprio codice, da dettare a chi ci deve aggiungere. */
export async function myFriendCode(): Promise<string> {
  const supabase = getSupabase()
  const profileId = await requireProfileId(supabase)

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', profileId)
    .maybeSingle()
  if (error) throw translate(error, MESSAGES.codeFailed())

  const row = (data ?? null) as ProfileRow | null
  if (!row?.friend_code) throw new Error(MESSAGES.codeFailed())

  return row.friend_code
}

/**
 * Amicizie e richieste in una lista sola: la UI le divide, ma sono la stessa
 * relazione in due stati, e due query separate darebbero due momenti diversi.
 */
export async function listFriends(): Promise<Friend[]> {
  const supabase = getSupabase()
  await requireProfileId(supabase)

  const { data, error } = await supabase.rpc('list_my_friends')
  if (error) throw translate(error, MESSAGES.listFailed())

  return ((data ?? []) as FriendRow[]).map((row) => ({
    profileId: row.profile_id,
    displayName: row.display_name || fallbackName(),
    avatar: row.avatar,
    status: row.status,
    incoming: row.incoming,
  }))
}

/**
 * Manda la richiesta usando il codice dell'altra persona. Se era lei ad aver
 * chiesto per prima, il server completa l'amicizia invece di lasciare due
 * richieste in attesa a specchio.
 */
export async function sendFriendRequest(code: string): Promise<void> {
  const friendCode = requireFriendCode(code)

  const supabase = getSupabase()
  await requireProfileId(supabase)

  // Il codice non si può cercare: la policy sui profili non mostra chi non è
  // già amico o compagno di lega. La richiesta passa per forza da qui.
  const { error } = await supabase.rpc('send_friend_request', { code: friendCode })
  if (error) throw translate(error, MESSAGES.sendFailed())
}

export async function acceptFriendRequest(profileId: string): Promise<void> {
  const supabase = getSupabase()
  await requireProfileId(supabase)

  const { error } = await supabase.rpc('accept_friend_request', {
    other_profile: profileId,
  })
  if (error) throw translate(error, MESSAGES.acceptFailed())
}

/**
 * Serve per tre gesti che vogliono la stessa cosa: rifiutare una richiesta
 * ricevuta, ritirarne una mandata, togliere un'amicizia. Sono lo stesso
 * comando perché il risultato è identico — quella relazione non esiste più.
 */
export async function removeFriend(profileId: string): Promise<void> {
  const supabase = getSupabase()
  await requireProfileId(supabase)

  const { error } = await supabase.rpc('remove_friend', { other_profile: profileId })
  if (error) throw translate(error, MESSAGES.removeFailed())
}

// ------------------------------------------------------------ utilità interne

/**
 * Il controllo qui evita un giro di rete e risponde mentre si sta ancora
 * guardando il campo. Spazi e trattini cadono perché un codice dettato viene
 * riscritto come capita, e le minuscole pure: sul server il confronto è su
 * `upper(trim(code))`.
 */
function requireFriendCode(code: string): string {
  const normalized = code.replace(/[\s-]+/g, '').toUpperCase()
  if (!CODE_PATTERN.test(normalized)) throw new Error(MESSAGES.malformedCode())
  return normalized
}

async function requireProfileId(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw translate(error, MESSAGES.noSession())

  const id = data.session?.user.id
  if (!id) throw new Error(MESSAGES.noSession())

  return id
}

function translate(error: unknown, fallback: string): Error {
  // Violazione del check `coppia_ordinata` o `richiedente_nella_coppia`: sui
  // dati che mandiamo può volere dire solo che il codice era il proprio.
  if (codeOf(error) === '23514') return new Error(MESSAGES.ownCode(), { cause: error })
  return translateError(error, fallback, MESSAGES)
}
