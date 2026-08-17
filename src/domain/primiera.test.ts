import { describe, expect, it } from 'vitest'
import { type BestBySuit, primieraTotal, resolvePrimiera } from './primiera'

describe('primieraTotal', () => {
  it('somma la carta migliore di ogni seme', () => {
    const best: BestBySuit = { denari: 7, coppe: 6, spade: 1, bastoni: 5 }
    // 21 + 18 + 16 + 15
    expect(primieraTotal(best)).toBe(70)
  })

  it('conta zero per i semi mancanti', () => {
    expect(primieraTotal({ denari: 7 })).toBe(21)
    expect(primieraTotal({})).toBe(0)
  })

  it('raggiunge 84 con quattro sette', () => {
    expect(primieraTotal({ denari: 7, coppe: 7, spade: 7, bastoni: 7 })).toBe(84)
  })
})

describe('resolvePrimiera', () => {
  it('assegna la primiera al totale più alto', () => {
    const result = resolvePrimiera({
      mode: 'cards',
      best: {
        A: { denari: 7, coppe: 7, spade: 6, bastoni: 1 },
        B: { denari: 6, coppe: 6, spade: 7, bastoni: 7 },
      },
    })

    expect(result.totals).toEqual({ A: 76, B: 78 })
    expect(result.winner).toBe('B')
  })

  it('non assegna nulla in caso di parità', () => {
    const result = resolvePrimiera({
      mode: 'cards',
      best: {
        A: { denari: 7, coppe: 6, spade: 1, bastoni: 5 },
        B: { denari: 6, coppe: 7, spade: 5, bastoni: 1 },
      },
    })

    expect(result.totals).toEqual({ A: 70, B: 70 })
    expect(result.winner).toBeNull()
  })

  it('penalizza chi non ha carte di un seme', () => {
    const result = resolvePrimiera({
      mode: 'cards',
      best: {
        A: { denari: 7, coppe: 7, spade: 7 },
        B: { denari: 6, coppe: 6, spade: 6, bastoni: 6 },
      },
    })

    expect(result.totals).toEqual({ A: 63, B: 72 })
    expect(result.winner).toBe('B')
  })

  it('rispetta l assegnazione manuale senza calcolare totali', () => {
    const result = resolvePrimiera({ mode: 'manual', winner: 'A' })
    expect(result.winner).toBe('A')
    expect(result.totals).toBeNull()
  })

  it('accetta una primiera manualmente pareggiata', () => {
    expect(resolvePrimiera({ mode: 'manual', winner: null }).winner).toBeNull()
  })
})
