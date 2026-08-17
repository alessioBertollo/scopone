import type { HandInput } from '../domain/hand'
import { DEFAULT_RULES, type RuleSet } from '../domain/rules'

/** Mano neutra e valida: tutto pari, nessun punto tranne il settebello. */
export function makeHand(overrides: Partial<HandInput> = {}): HandInput {
  return {
    cards: { A: 20, B: 20 },
    denari: { A: 5, B: 5 },
    settebello: 'A',
    primiera: { mode: 'manual', winner: null },
    scope: { A: 0, B: 0 },
    ...overrides,
  }
}

export function makeRules(overrides: Partial<RuleSet> = {}): RuleSet {
  return { ...DEFAULT_RULES, ...overrides }
}
