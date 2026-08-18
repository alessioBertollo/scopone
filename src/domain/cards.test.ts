import { describe, expect, it } from 'vitest'
import { isRank, primieraValue, RANKS, type Rank, rankLabel } from './cards'

describe('primieraValue', () => {
  it('assegna il valore corretto a ogni carta', () => {
    const expected: Record<Rank, number> = {
      7: 21,
      6: 18,
      1: 16,
      5: 15,
      4: 14,
      3: 13,
      2: 12,
      8: 10,
      9: 10,
      10: 10,
    }

    for (const rank of RANKS) {
      expect(primieraValue(rank)).toBe(expected[rank])
    }
  })

  it('rispetta la gerarchia della primiera, che non è quella delle carte', () => {
    // Il 7 batte tutto, l'asso si infila tra il 6 e il 5, le figure valgono meno di ogni numerica.
    const order: Rank[] = [7, 6, 1, 5, 4, 3, 2]
    for (let i = 1; i < order.length; i++) {
      const higher = order[i - 1] as Rank
      const lower = order[i] as Rank
      expect(primieraValue(higher)).toBeGreaterThan(primieraValue(lower))
    }

    for (const figure of [8, 9, 10] as Rank[]) {
      expect(primieraValue(figure)).toBeLessThan(primieraValue(2))
    }
  })
})

describe('isRank', () => {
  it('accetta i valori da 1 a 10', () => {
    for (const rank of RANKS) {
      expect(isRank(rank)).toBe(true)
    }
  })

  it('rifiuta valori fuori scala o non interi', () => {
    expect(isRank(0)).toBe(false)
    expect(isRank(11)).toBe(false)
    expect(isRank(-1)).toBe(false)
    expect(isRank(7.5)).toBe(false)
  })
})

describe('rankLabel', () => {
  it('usa i nomi italiani per asso e figure', () => {
    expect(rankLabel(1)).toBe('Asso')
    expect(rankLabel(8)).toBe('Fante')
    expect(rankLabel(9)).toBe('Donna')
    expect(rankLabel(10)).toBe('Re')
  })

  it('usa il numero per le carte numeriche', () => {
    expect(rankLabel(7)).toBe('7')
  })
})
