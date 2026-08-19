import { describe, expect, it } from 'vitest'
import { SUITS } from '../domain/cards'
import { nineOfCoinsLabel, rankLabelFor, shortRankFor, suitLabel } from './deck'

describe('nomi delle carte per mazzo', () => {
  it('traduce i semi senza toccare le chiavi del dominio', () => {
    expect(SUITS.map((suit) => suitLabel(suit, 'italiane'))).toEqual([
      'Denari',
      'Coppe',
      'Spade',
      'Bastoni',
    ])
    expect(SUITS.map((suit) => suitLabel(suit, 'francesi'))).toEqual([
      'Quadri',
      'Cuori',
      'Picche',
      'Fiori',
    ])
  })

  it('il nove è la carta che distingue i due mazzi', () => {
    expect(rankLabelFor(9, 'italiane')).toBe('Cavallo')
    expect(rankLabelFor(9, 'francesi')).toBe('Donna')
    expect(shortRankFor(9, 'italiane')).toBe('C')
    expect(shortRankFor(9, 'francesi')).toBe('D')
  })

  it('le altre figure si chiamano uguale in entrambi', () => {
    for (const deck of ['italiane', 'francesi'] as const) {
      expect(rankLabelFor(1, deck)).toBe('Asso')
      expect(rankLabelFor(8, deck)).toBe('Fante')
      expect(rankLabelFor(10, deck)).toBe('Re')
      expect(rankLabelFor(7, deck)).toBe('7')
    }
  })

  it('la variante prende il nome dal mazzo scelto', () => {
    expect(nineOfCoinsLabel('italiane')).toBe('Cavallo di denari')
    expect(nineOfCoinsLabel('francesi')).toBe('Donna di quadri')
  })
})
