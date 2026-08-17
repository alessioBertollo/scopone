import { useEffect, useState } from 'react'
import { scoreMatch } from '../domain/match'
import { useMatchStore } from './match-store'

/**
 * Sottile strato di collegamento tra lo store e React. Sta a parte da
 * `match-store.ts` perché richiede un renderer per essere eseguito, mentre
 * lo store resta verificabile in Node.
 */

/**
 * La partita viene riletta dal disco in modo asincrono. Finché non è pronta
 * lo store contiene una partita vuota, quindi la UI deve aspettare invece di
 * mostrare per un istante uno stato che non è quello dell'utente.
 */
export function useMatchHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useMatchStore.persist.hasHydrated())

  useEffect(() => {
    if (useMatchStore.persist.hasHydrated()) {
      setHydrated(true)
      return
    }
    return useMatchStore.persist.onFinishHydration(() => setHydrated(true))
  }, [])

  return hydrated
}

/** Punteggi derivati dalla partita corrente. */
export function useMatchState() {
  return scoreMatch(useMatchStore((state) => state.match))
}
