import { describe, expect, it } from 'vitest'
import { higherOf, otherTeam } from './teams'

describe('otherTeam', () => {
  it('restituisce la squadra avversaria', () => {
    expect(otherTeam('A')).toBe('B')
    expect(otherTeam('B')).toBe('A')
  })
})

describe('higherOf', () => {
  it('sceglie la squadra con il valore più alto', () => {
    expect(higherOf({ A: 21, B: 19 })).toBe('A')
    expect(higherOf({ A: 19, B: 21 })).toBe('B')
  })

  it('non sceglie nessuno in caso di parità', () => {
    expect(higherOf({ A: 20, B: 20 })).toBeNull()
  })
})
