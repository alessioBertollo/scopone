#!/usr/bin/env node
/**
 * Prova a fare, da anonimo, tutto ciò che un anonimo non deve poter fare.
 * Fallisce se una di queste operazioni riesce.
 *
 * La chiave pubblica è dentro l'app e va considerata nota a chiunque: queste
 * policy sono l'unica cosa fra quella chiave e i dati dei giocatori. Un
 * controllo nascosto in una schermata non conta.
 *
 * Uso: npm run check:rls   (legge .env, si ferma se non è configurato)
 */
import { readFileSync } from 'node:fs'

function loadEnv() {
  try {
    const raw = readFileSync(new URL('../.env', import.meta.url), 'utf8')
    return Object.fromEntries(
      raw
        .split('\n')
        .filter((line) => line.includes('=') && !line.trimStart().startsWith('#'))
        .map((line) => {
          const at = line.indexOf('=')
          return [line.slice(0, at).trim(), line.slice(at + 1).trim()]
        }),
    )
  } catch {
    return {}
  }
}

const env = loadEnv()
const url = env.EXPO_PUBLIC_SUPABASE_URL
const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  console.log('Backend non configurato in .env: controllo saltato.')
  process.exit(0)
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
}

const NOBODY = '00000000-0000-0000-0000-000000000000'
const SOMEBODY = '11111111-1111-1111-1111-111111111111'

/** Ogni caso descrive un'operazione che deve essere respinta. */
const CASES = [
  {
    what: 'creare una lega',
    path: '/rest/v1/leagues',
    body: { name: 'Intrusione', created_by: NOBODY, invite_code: 'ABCDEF' },
  },
  {
    what: 'creare un profilo altrui',
    path: '/rest/v1/profiles',
    body: { id: NOBODY, display_name: 'Intruso' },
  },
  {
    what: 'creare una partita',
    path: '/rest/v1/matches',
    body: { created_by: NOBODY, rules: {}, team_names: {} },
  },
  {
    what: 'iscriversi a una lega',
    path: '/rest/v1/league_members',
    body: { league_id: NOBODY, profile_id: NOBODY },
  },
  {
    what: 'creare una lega tramite funzione',
    path: '/rest/v1/rpc/create_league',
    body: { league_name: 'Intrusione' },
  },
  {
    what: 'entrare in una lega col codice',
    path: '/rest/v1/rpc/join_league_by_code',
    body: { code: 'ABCDEF' },
  },
  // Amicizie. La riga inserita a mano è il caso peggiore: dichiararsi amico
  // di qualcuno senza che abbia accettato dà accesso alle sue partite libere.
  {
    what: 'dichiararsi amico di qualcuno',
    path: '/rest/v1/friendships',
    body: { low_id: NOBODY, high_id: SOMEBODY, requested_by: NOBODY, status: 'accepted' },
  },
  {
    what: 'mandare una richiesta di amicizia',
    path: '/rest/v1/rpc/send_friend_request',
    body: { code: 'ABCDE2' },
  },
  {
    what: 'accettare una richiesta di amicizia',
    path: '/rest/v1/rpc/accept_friend_request',
    body: { other_profile: SOMEBODY },
  },
  {
    what: 'togliere un amico',
    path: '/rest/v1/rpc/remove_friend',
    body: { other_profile: SOMEBODY },
  },
  // Inviti alla lega.
  {
    what: 'invitare qualcuno in una lega',
    path: '/rest/v1/rpc/invite_friend_to_league',
    body: { target_league: NOBODY, friend: SOMEBODY },
  },
  {
    what: 'accettare un invito a una lega',
    path: '/rest/v1/rpc/accept_league_invite',
    body: { target_league: NOBODY },
  },
  {
    what: 'promuoversi da invitato a membro',
    method: 'PATCH',
    path: `/rest/v1/league_members?profile_id=eq.${NOBODY}`,
    body: { status: 'member' },
  },
  // L'avatar è modificabile solo sul proprio profilo: la colonna è nuova e
  // la policy di update è quella di prima, quindi va provata anche lei.
  {
    what: 'cambiare l avatar di un altro',
    method: 'PATCH',
    path: `/rest/v1/profiles?id=eq.${SOMEBODY}`,
    body: { avatar: 'volpe' },
  },
  {
    what: 'cancellare l account di qualcun altro',
    path: '/rest/v1/rpc/delete_my_account',
    body: {},
  },
]

let failures = 0

for (const testCase of CASES) {
  const response = await fetch(url + testCase.path, {
    method: testCase.method ?? 'POST',
    headers,
    body: JSON.stringify(testCase.body),
  })

  if (response.ok) {
    // Una PATCH che non trova righe risponde comunque 2xx: quello che conta
    // è che non abbia toccato niente, e il corpo lo dice.
    const changed = await response.text()
    if (testCase.method === 'PATCH' && (changed === '' || changed === '[]')) {
      console.log(`✓ respinto: ${testCase.what} — nessuna riga modificata`)
    } else {
      console.error(`✗ un anonimo è riuscito a ${testCase.what}`)
      failures++
    }
  } else {
    const detail = await response.json().catch(() => ({}))
    console.log(`✓ respinto: ${testCase.what} — ${detail.message ?? response.status}`)
  }
}

/**
 * Le tabelle devono esistere — un errore qui vuol dire migrazione non
 * eseguita — e a un anonimo devono restituire zero righe.
 *
 * La seconda metà è quella che conta di più: una policy di lettura allargata
 * per sbaglio non fa fallire nessun test e non rompe nessuna schermata. Si
 * nota solo guardando cosa risponde a chi non ha diritto a niente.
 */
const TABLES = [
  'profiles',
  'leagues',
  'league_members',
  'matches',
  'match_players',
  'friendships',
]

for (const table of TABLES) {
  const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, { headers })

  if (!response.ok) {
    console.error(`✗ tabella ${table} non raggiungibile: migrazione non eseguita?`)
    failures++
    continue
  }

  const rows = await response.json().catch(() => null)
  if (!Array.isArray(rows)) {
    console.error(`✗ ${table}: risposta inattesa alla lettura anonima`)
    failures++
  } else if (rows.length > 0) {
    console.error(`✗ ${table}: un anonimo legge ${rows.length} righe`)
    failures++
  } else {
    console.log(`✓ ${table}: esiste e a un anonimo non mostra nulla`)
  }
}

if (failures > 0) {
  console.error(`\n${failures} controlli falliti: le policy non proteggono i dati.`)
  process.exit(1)
}
console.log('\nNessuna scrittura anonima riesce, e nessuna lettura anonima vede dati.')
