import { tr } from '../i18n/tr'

/**
 * Traduzione degli errori che tornano da Supabase, condivisa fra i moduli che
 * parlano col server.
 *
 * Sta fuori da ciascuno perché la casistica è la stessa — rete assente,
 * sessione scaduta, policy che rifiuta — e due copie vogliono dire correggerne
 * una sola quando cambia. Quel che resta specifico di un modulo lo gestisce il
 * modulo, prima di delegare qui.
 */

/** I tre messaggi che ogni modulo deve saper dire, nella propria lingua. */
export type ErrorMessages = {
  network: () => string
  noSession: () => string
  forbidden: () => string
}

type ErrorFields = {
  name: string | undefined
  code: string | undefined
  status: number | undefined
  message: string | undefined
}

function readErrorFields(error: unknown): ErrorFields {
  const empty: ErrorFields = {
    name: undefined,
    code: undefined,
    status: undefined,
    message: undefined,
  }
  if (typeof error !== 'object' || error === null) return empty

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

/** Il codice SQLSTATE o PostgREST, per chi deve trattare un caso a parte. */
export function codeOf(error: unknown): string | undefined {
  return readErrorFields(error).code
}

/** I messaggi di Postgres arrivano senza punto finale, gli altri ce l'hanno. */
function ensureStop(message: string): string {
  return /[.!?]$/.test(message) ? message : `${message}.`
}

export function translateError(
  error: unknown,
  fallback: string,
  messages: ErrorMessages,
): Error {
  const { name, code, status, message } = readErrorFields(error)
  const fail = (text: string) => new Error(text, { cause: error })

  const offline =
    name === 'AuthRetryableFetchError' ||
    status === 0 ||
    (message !== undefined &&
      /failed to fetch|network request failed|networkerror/i.test(message))
  if (offline) return fail(messages.network())

  // P0001 è il codice del `raise exception` di plpgsql: i messaggi delle
  // nostre funzioni sono già scritti per chi legge, quindi sostituirli con un
  // generico sarebbe una perdita. Restano in italiano anche in inglese: li
  // scrive il database, non l'app.
  if (code === 'P0001' && message !== undefined && message.trim().length > 0) {
    return fail(ensureStop(message.trim()))
  }

  switch (code) {
    // Nessun profilo a cui agganciare la riga: la sessione c'è ma quella
    // creata dal trigger non è ancora arrivata.
    case '23503':
      return fail(messages.noSession())
    case '42501':
      return fail(messages.forbidden())
    case 'PGRST301':
    case 'session_expired':
    case 'session_not_found':
    case 'refresh_token_not_found':
    case 'bad_jwt':
      return fail(messages.noSession())
    default:
      break
  }

  if (status === 401 || status === 403) return fail(messages.forbidden())

  return fail(fallback)
}

/** Ripiego per un nome che non si riesce a leggere. */
export function fallbackName(): string {
  return tr('common.player')
}
