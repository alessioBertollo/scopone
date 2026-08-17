import { beforeEach, describe, expect, it } from 'vitest'
import { scoreMatch } from '../domain/match'
import { makeHand, makeRules } from '../test/factories'
import { useMatchStore } from './match-store'

const A_SWEEP = makeHand({
  cards: { A: 21, B: 19 },
  denari: { A: 6, B: 4 },
  settebello: 'A',
  primiera: { mode: 'manual', winner: 'A' },
})

const store = useMatchStore

beforeEach(() => {
  store.getState().reset()
})

describe('useMatchStore', () => {
  it('parte da una partita vuota e non iniziata', () => {
    const state = store.getState()
    expect(state.hasStarted).toBe(false)
    expect(state.match.hands).toHaveLength(0)
  })

  it('avvia una partita con nomi e regole scelti', () => {
    const rules = makeRules({ targetScore: 11 })
    store.getState().startMatch({ A: 'Rossi', B: 'Bianchi' }, rules)

    const state = store.getState()
    expect(state.hasStarted).toBe(true)
    expect(state.match.teamNames).toEqual({ A: 'Rossi', B: 'Bianchi' })
    expect(state.match.rules.targetScore).toBe(11)
  })

  it('usa le regole di default se non specificate', () => {
    store.getState().startMatch({ A: 'Noi', B: 'Loro' })
    expect(store.getState().match.rules.targetScore).toBe(21)
  })

  it('aggiunge mani e le riflette nel punteggio', () => {
    store.getState().startMatch({ A: 'Noi', B: 'Loro' })
    store.getState().addHand(A_SWEEP)
    store.getState().addHand(A_SWEEP)

    expect(scoreMatch(store.getState().match).totals).toEqual({ A: 8, B: 0 })
  })

  it('sostituisce una mano esistente', () => {
    store.getState().startMatch({ A: 'Noi', B: 'Loro' })
    store.getState().addHand(A_SWEEP)
    store.getState().replaceHand(0, makeHand({ scope: { A: 0, B: 2 } }))

    // La mano neutra assegna solo il settebello ad A, più due scope a B.
    expect(scoreMatch(store.getState().match).totals).toEqual({ A: 1, B: 2 })
  })

  it('rimuove una mano', () => {
    store.getState().startMatch({ A: 'Noi', B: 'Loro' })
    store.getState().addHand(A_SWEEP)
    store.getState().addHand(A_SWEEP)
    store.getState().removeHand(0)

    expect(store.getState().match.hands).toHaveLength(1)
    expect(scoreMatch(store.getState().match).totals).toEqual({ A: 4, B: 0 })
  })

  it('azzera tutto al reset', () => {
    store.getState().startMatch({ A: 'Rossi', B: 'Bianchi' })
    store.getState().addHand(A_SWEEP)
    store.getState().reset()

    const state = store.getState()
    expect(state.hasStarted).toBe(false)
    expect(state.match.hands).toHaveLength(0)
    expect(state.match.teamNames).toEqual({ A: 'Noi', B: 'Loro' })
  })

  it('non muta la partita precedente quando aggiunge una mano', () => {
    store.getState().startMatch({ A: 'Noi', B: 'Loro' })
    const before = store.getState().match
    store.getState().addHand(A_SWEEP)

    expect(before.hands).toHaveLength(0)
    expect(store.getState().match).not.toBe(before)
  })
})
