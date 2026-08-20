import { describe, expect, it } from 'vitest'
import {
  CONFETTI_COUNT,
  celebrationDuration,
  celebrationSeed,
  confetti,
  SUIT_GLYPHS,
  TONES,
} from './celebration'

describe('confetti', () => {
  it('produce la quantità richiesta', () => {
    expect(confetti(CONFETTI_COUNT, 1)).toHaveLength(CONFETTI_COUNT)
    expect(confetti(3, 1)).toHaveLength(3)
    expect(confetti(0, 1)).toEqual([])
  })

  it('dà sempre la stessa caduta a parità di seme', () => {
    expect(confetti(12, 42)).toEqual(confetti(12, 42))
  })

  it('dà cadute diverse con semi diversi', () => {
    expect(confetti(12, 42)).not.toEqual(confetti(12, 43))
  })

  it('tiene ogni pezzo dentro lo schermo e dentro la palette', () => {
    for (const piece of confetti(CONFETTI_COUNT, 7)) {
      expect(piece.left).toBeGreaterThanOrEqual(0)
      expect(piece.left).toBeLessThanOrEqual(1)
      expect(piece.delay).toBeGreaterThanOrEqual(0)
      expect(piece.duration).toBeGreaterThan(0)
      expect(piece.size).toBeGreaterThan(0)
      expect(Math.abs(piece.drift)).toBeLessThanOrEqual(0.15)
      expect(SUIT_GLYPHS).toContain(piece.glyph)
      expect(TONES).toContain(piece.tone)
    }
  })

  it('sparge le partenze invece di allinearle', () => {
    const colonne = confetti(CONFETTI_COUNT, 9).map((piece) => piece.left)
    expect(new Set(colonne).size).toBeGreaterThan(CONFETTI_COUNT / 2)
  })
})

describe('celebrationDuration', () => {
  it('è quando finisce l ultimo pezzo, non il primo', () => {
    const pieces = confetti(CONFETTI_COUNT, 3)
    const atteso = Math.max(...pieces.map((piece) => piece.delay + piece.duration))
    expect(celebrationDuration(pieces)).toBe(atteso)
  })

  it('è zero senza pezzi', () => {
    expect(celebrationDuration([])).toBe(0)
  })
})

describe('celebrationSeed', () => {
  it('lega il seme alla partita e non al render', () => {
    expect(celebrationSeed(7, 'Allegri')).toBe(celebrationSeed(7, 'Allegri'))
  })

  it('cambia con le mani giocate e con il vincitore', () => {
    expect(celebrationSeed(7, 'Allegri')).not.toBe(celebrationSeed(8, 'Allegri'))
    expect(celebrationSeed(7, 'Allegri')).not.toBe(celebrationSeed(7, 'Musoni'))
  })

  it('resta un intero positivo, che è ciò che il generatore accetta', () => {
    for (const mani of [0, 1, 13, 400]) {
      const seed = celebrationSeed(mani, 'Squadra')
      expect(Number.isInteger(seed)).toBe(true)
      expect(seed).toBeGreaterThanOrEqual(0)
    }
  })
})
