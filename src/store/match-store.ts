import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { HandInput } from '../domain/hand'
import {
  addHand,
  createMatch,
  type Match,
  removeHand,
  replaceHand,
  scoreMatch,
} from '../domain/match'
import { DEFAULT_RULES, type RuleSet } from '../domain/rules'
import type { ByTeam } from '../domain/teams'

/** Cambiare questa chiave scarta le partite salvate dalle versioni precedenti. */
export const MATCH_STORAGE_KEY = 'scopone.match'

export type MatchStore = {
  match: Match
  /** Diventa true appena si avvia una partita. */
  hasStarted: boolean
  startMatch: (teamNames: ByTeam<string>, rules?: RuleSet) => void
  addHand: (hand: HandInput) => void
  replaceHand: (index: number, hand: HandInput) => void
  removeHand: (index: number) => void
  reset: () => void
}

type PersistedState = Pick<MatchStore, 'match' | 'hasStarted'>

const EMPTY_MATCH = createMatch()

/**
 * Una partita salvata da una versione precedente potrebbe non essere più
 * calcolabile. Meglio ripartire puliti che far crashare l'app all'avvio.
 */
function isUsable(match: Match): boolean {
  try {
    scoreMatch(match)
    return true
  } catch {
    return false
  }
}

/**
 * Lo store è un guscio sottile attorno al dominio: non contiene regole di
 * punteggio, si limita a tenere la partita corrente, a delegare e a salvarla.
 */
export const useMatchStore = create<MatchStore>()(
  persist(
    (set) => ({
      match: EMPTY_MATCH,
      hasStarted: false,

      startMatch: (teamNames, rules = DEFAULT_RULES) =>
        set({ match: createMatch(teamNames, rules), hasStarted: true }),

      addHand: (hand) => set((state) => ({ match: addHand(state.match, hand) })),

      replaceHand: (index, hand) =>
        set((state) => ({ match: replaceHand(state.match, index, hand) })),

      removeHand: (index) => set((state) => ({ match: removeHand(state.match, index) })),

      reset: () => set({ match: EMPTY_MATCH, hasStarted: false }),
    }),
    {
      name: MATCH_STORAGE_KEY,
      // v2: la variante del re di denari è diventata la donna, e sia la
      // regola sia il campo della mano hanno cambiato nome.
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): PersistedState => ({
        match: state.match,
        hasStarted: state.hasStarted,
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<PersistedState> | undefined
        if (!saved?.match || !isUsable(saved.match)) return current

        return {
          ...current,
          match: saved.match,
          hasStarted: saved.hasStarted ?? saved.match.hands.length > 0,
        }
      },
    },
  ),
)
