import { describe, expect, it } from 'vitest'
import { suggestTeamNames } from './team-names'

describe('suggestTeamNames', () => {
  it('restituisce due nomi diversi e non vuoti', () => {
    for (let i = 0; i < 20; i++) {
      const names = suggestTeamNames()
      expect(names.A).not.toBe('')
      expect(names.B).not.toBe('')
      expect(names.A).not.toBe(names.B)
    }
  })

  it('sceglie la coppia in base al numero casuale', () => {
    expect(suggestTeamNames(() => 0)).toEqual({ A: 'Bastoni', B: 'Spade' })
    expect(suggestTeamNames(() => 0.999)).toEqual({ A: 'Monti', B: 'Valli' })
  })

  it('regge un generatore che restituisce esattamente 1', () => {
    // Math.random() non arriva mai a 1, ma un doppio nei test sì: senza la
    // normalizzazione dell'indice qui si otterrebbe undefined.
    const names = suggestTeamNames(() => 1)
    expect(names.A).not.toBe('')
    expect(names.B).not.toBe('')
  })

  it('nel tempo propone coppie diverse', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const names = suggestTeamNames()
      seen.add(`${names.A}/${names.B}`)
    }
    expect(seen.size).toBeGreaterThan(1)
  })
})
