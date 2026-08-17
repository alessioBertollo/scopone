import { describe, expect, it } from 'vitest'
import { makeHand, makeRules } from '../test/factories'
import type { HandInput } from './hand'
import { addHand, createMatch, removeHand, replaceHand, scoreMatch } from './match'

/** Cappotto: la squadra A prende tutti e quattro i punti base. */
const A_SWEEP: HandInput = makeHand({
  cards: { A: 21, B: 19 },
  denari: { A: 6, B: 4 },
  settebello: 'A',
  primiera: { mode: 'manual', winner: 'A' },
})

/** Mano che chiude quattro pari, usata per verificare lo spareggio. */
const FOUR_ALL: HandInput = makeHand({
  cards: { A: 21, B: 19 },
  denari: { A: 4, B: 6 },
  settebello: 'A',
  primiera: { mode: 'manual', winner: 'B' },
  scope: { A: 2, B: 2 },
})

describe('scoreMatch', () => {
  it('gestisce una partita senza mani giocate', () => {
    const state = scoreMatch(createMatch())
    expect(state.totals).toEqual({ A: 0, B: 0 })
    expect(state.status).toBe('ongoing')
    expect(state.winner).toBeNull()
    expect(state.remaining).toEqual({ A: 21, B: 21 })
  })

  it('cumula i punteggi mano dopo mano', () => {
    const match = {
      ...createMatch(),
      rules: makeRules({ targetScore: 21 }),
      hands: [A_SWEEP, A_SWEEP],
    }
    const state = scoreMatch(match)

    expect(state.progression).toEqual([
      { A: 4, B: 0 },
      { A: 8, B: 0 },
    ])
    expect(state.totals).toEqual({ A: 8, B: 0 })
    expect(state.remaining).toEqual({ A: 13, B: 21 })
  })

  it('chiude la partita alla mano che raggiunge il traguardo', () => {
    const match = {
      ...createMatch(),
      rules: makeRules({ targetScore: 11 }),
      hands: [A_SWEEP, A_SWEEP, A_SWEEP],
    }
    const state = scoreMatch(match)

    expect(state.status).toBe('finished')
    expect(state.winner).toBe('A')
    expect(state.decidedAtHand).toBe(2)
    expect(state.remaining).toEqual({ A: 0, B: 11 })
  })

  it('non chiude la partita se le squadre arrivano pari al traguardo', () => {
    const match = {
      ...createMatch(),
      rules: makeRules({ targetScore: 4 }),
      hands: [FOUR_ALL],
    }
    const state = scoreMatch(match)

    expect(state.totals).toEqual({ A: 4, B: 4 })
    expect(state.status).toBe('ongoing')
    expect(state.winner).toBeNull()
    expect(state.decidedAtHand).toBeNull()
  })

  it('assegna la vittoria alla mano di spareggio', () => {
    const match = {
      ...createMatch(),
      rules: makeRules({ targetScore: 4 }),
      hands: [FOUR_ALL, A_SWEEP],
    }
    const state = scoreMatch(match)

    expect(state.totals).toEqual({ A: 8, B: 4 })
    expect(state.status).toBe('finished')
    expect(state.winner).toBe('A')
    expect(state.decidedAtHand).toBe(1)
  })

  it('assegna la vittoria anche alla squadra B', () => {
    const bSweep = makeHand({
      cards: { A: 19, B: 21 },
      denari: { A: 4, B: 6 },
      settebello: 'B',
      primiera: { mode: 'manual', winner: 'B' },
    })
    const match = {
      ...createMatch(),
      rules: makeRules({ targetScore: 4 }),
      hands: [bSweep],
    }
    const state = scoreMatch(match)

    expect(state.totals).toEqual({ A: 0, B: 4 })
    expect(state.winner).toBe('B')
    expect(state.status).toBe('finished')
  })

  it('propaga l errore di una mano non valida', () => {
    const match = { ...createMatch(), hands: [makeHand({ cards: { A: 1, B: 1 } })] }
    expect(() => scoreMatch(match)).toThrow()
  })
})

describe('modifiche alla partita', () => {
  it('aggiunge una mano senza mutare l originale', () => {
    const match = createMatch()
    const updated = addHand(match, A_SWEEP)

    expect(match.hands).toHaveLength(0)
    expect(updated.hands).toHaveLength(1)
  })

  it('sostituisce una mano per indice', () => {
    const match = addHand(addHand(createMatch(), A_SWEEP), A_SWEEP)
    const updated = replaceHand(match, 1, FOUR_ALL)

    expect(updated.hands[0]).toBe(A_SWEEP)
    expect(updated.hands[1]).toBe(FOUR_ALL)
    expect(match.hands[1]).toBe(A_SWEEP)
  })

  it('rimuove una mano per indice', () => {
    const match = addHand(addHand(createMatch(), A_SWEEP), FOUR_ALL)
    const updated = removeHand(match, 0)

    expect(updated.hands).toEqual([FOUR_ALL])
    expect(match.hands).toHaveLength(2)
  })

  it('usa i nomi squadra di default', () => {
    expect(createMatch().teamNames).toEqual({ A: 'Noi', B: 'Loro' })
  })
})
