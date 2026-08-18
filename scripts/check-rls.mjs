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
]

let failures = 0

for (const testCase of CASES) {
  const response = await fetch(url + testCase.path, {
    method: 'POST',
    headers,
    body: JSON.stringify(testCase.body),
  })

  if (response.ok) {
    console.error(`✗ un anonimo è riuscito a ${testCase.what}`)
    failures++
  } else {
    const detail = await response.json().catch(() => ({}))
    console.log(`✓ respinto: ${testCase.what} — ${detail.message ?? response.status}`)
  }
}

// Le tabelle devono esistere: un errore qui vuol dire migrazione non eseguita.
for (const table of ['profiles', 'leagues', 'league_members', 'matches', 'match_players']) {
  const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, { headers })
  if (!response.ok) {
    console.error(`✗ tabella ${table} non raggiungibile: migrazione non eseguita?`)
    failures++
  }
}

if (failures > 0) {
  console.error(`\n${failures} controlli falliti: le policy non proteggono i dati.`)
  process.exit(1)
}
console.log('\nTutte le scritture anonime sono respinte e le tabelle esistono.')
