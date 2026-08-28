import { useEffect, useState } from 'react'
import { scoreMatch } from '../domain/match'
import { watchPending } from '../lib/pending'
import { useAuthStore } from './auth-store'
import { useFriendsStore } from './friends-store'
import { useLeaguesStore } from './leagues-store'
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

/**
 * Tiene aggiornate le cose in attesa — richieste di amicizia e inviti alle
 * leghe — mentre l'app è aperta, così l'indicatore sulle schede compare
 * nell'istante in cui qualcuno risponde invece che al prossimo passaggio su
 * quella schermata.
 *
 * Va montato una volta sola, in cima all'albero: due sottoscrizioni allo
 * stesso canale non raddoppiano gli avvisi ma raddoppiano le letture.
 */
export function usePendingWatch(): void {
  const userId = useAuthStore((state) => state.user?.id ?? null)
  const refreshFriends = useFriendsStore((state) => state.refresh)
  const refreshLeagues = useLeaguesStore((state) => state.refresh)

  useEffect(() => {
    if (!userId) return

    return watchPending(userId, () => {
      void refreshFriends()
      void refreshLeagues()
    })
  }, [userId, refreshFriends, refreshLeagues])
}
