import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { AppState } from 'react-native'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

/**
 * L'app deve restare usabile senza backend: si conta una partita al tavolo
 * anche senza account e senza rete. Quindi il client non viene creato
 * all'avvio, ma solo quando qualcuno lo chiede davvero.
 */
export const isBackendConfigured = Boolean(url && anonKey)

let client: SupabaseClient | null = null
let refreshWired = false

export function getSupabase(): SupabaseClient {
  if (client) return client

  if (!url || !anonKey) {
    throw new Error(
      'Backend non configurato: mancano EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Copia .env.example in .env e riempili.',
    )
  }

  client = createClient(url, anonKey, {
    auth: {
      // La sessione sopravvive alla chiusura dell'app, come la partita.
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      // Non c'è nessun redirect da interpretare: si accede con un codice
      // digitato nell'app, e su React Native `window.location` non esiste.
      detectSessionInUrl: false,
    },
  })

  wireTokenRefresh(client)
  return client
}

/**
 * Il rinnovo automatico del token va fermato quando l'app va in secondo
 * piano: un timer che gira a schermo spento consuma batteria e fallisce
 * comunque, perché il sistema sospende la rete.
 */
function wireTokenRefresh(active: SupabaseClient): void {
  if (refreshWired) return
  refreshWired = true

  AppState.addEventListener('change', (state) => {
    if (state === 'active') active.auth.startAutoRefresh()
    else active.auth.stopAutoRefresh()
  })

  if (AppState.currentState === 'active') active.auth.startAutoRefresh()
}
