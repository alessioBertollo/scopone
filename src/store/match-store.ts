import { create } from 'zustand'
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

export type MatchStore = {
  match: Match
  /** Diventa true appena si gioca la prima mano di una partita. */
  hasStarted: boolean
  startMatch: (teamNames: ByTeam<string>, rules?: RuleSet) => void
  addHand: (hand: HandInput) => void
  replaceHand: (index: number, hand: HandInput) => void
  removeHand: (index: number) => void
  reset: () => void
}

const EMPTY_MATCH = createMatch()

/**
 * Lo store è un guscio sottile attorno al dominio: non contiene regole di
 * punteggio, si limita a tenere la partita corrente e a delegare.
 */
export const useMatchStore = create<MatchStore>()((set) => ({
  match: EMPTY_MATCH,
  hasStarted: false,

  startMatch: (teamNames, rules = DEFAULT_RULES) =>
    set({ match: createMatch(teamNames, rules), hasStarted: true }),

  addHand: (hand) => set((state) => ({ match: addHand(state.match, hand) })),

  replaceHand: (index, hand) =>
    set((state) => ({ match: replaceHand(state.match, index, hand) })),

  removeHand: (index) => set((state) => ({ match: removeHand(state.match, index) })),

  reset: () => set({ match: EMPTY_MATCH, hasStarted: false }),
}))

/** Punteggi derivati dalla partita corrente. */
export function useMatchState() {
  return scoreMatch(useMatchStore((state) => state.match))
}
