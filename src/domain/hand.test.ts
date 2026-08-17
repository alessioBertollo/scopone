import { describe, expect, it } from 'vitest'
import { makeHand, makeRules } from '../test/factories'
import { HandValidationError, type PointKind, scoreHand, validateHand } from './hand'

const RULES = makeRules()

function codes(issues: { code: string }[]): string[] {
  return issues.map((issue) => issue.code)
}

function awardFor(kind: PointKind, hand = makeHand(), rules = RULES) {
  return scoreHand(hand, rules).awards.find((award) => award.kind === kind)
}

describe('validateHand', () => {
  it('accetta una mano coerente', () => {
    expect(validateHand(makeHand(), RULES)).toEqual([])
  })

  it('rifiuta un totale di carte diverso da 40', () => {
    const issues = validateHand(makeHand({ cards: { A: 21, B: 20 } }), RULES)
    expect(codes(issues)).toContain('cards.total')
  })

  it('rifiuta un totale di denari diverso da 10', () => {
    const issues = validateHand(makeHand({ denari: { A: 6, B: 5 } }), RULES)
    expect(codes(issues)).toContain('denari.total')
  })

  it('rifiuta più denari che carte', () => {
    const issues = validateHand(
      makeHand({ cards: { A: 4, B: 36 }, denari: { A: 8, B: 2 } }),
      RULES,
    )
    expect(codes(issues)).toContain('denari.exceedsCards')
  })

  it('rifiuta numeri non interi o negativi', () => {
    expect(codes(validateHand(makeHand({ cards: { A: 20.5, B: 19.5 } }), RULES))).toContain(
      'cards.invalid',
    )
    expect(codes(validateHand(makeHand({ scope: { A: -1, B: 0 } }), RULES))).toContain(
      'scope.invalid',
    )
    expect(codes(validateHand(makeHand({ denari: { A: 5.5, B: 4.5 } }), RULES))).toContain(
      'denari.invalid',
    )
  })

  it('rifiuta il settebello a chi non ha denari', () => {
    const issues = validateHand(makeHand({ denari: { A: 0, B: 10 }, settebello: 'A' }), RULES)
    expect(codes(issues)).toContain('settebello.noDenari')
  })

  it('rifiuta la stessa carta come migliore di entrambe le squadre', () => {
    const issues = validateHand(
      makeHand({
        primiera: { mode: 'cards', best: { A: { denari: 7 }, B: { denari: 7 } } },
      }),
      RULES,
    )
    expect(codes(issues)).toContain('primiera.duplicateCard')
  })

  it('rifiuta la napola se la regola è disattivata', () => {
    const issues = validateHand(makeHand({ napola: { team: 'A', length: 3 } }), RULES)
    expect(codes(issues)).toContain('napola.disabled')
  })

  it('rifiuta una napola più corta di tre carte', () => {
    const rules = makeRules({ napola: 'progressive' })
    const issues = validateHand(makeHand({ napola: { team: 'A', length: 2 } }), rules)
    expect(codes(issues)).toContain('napola.tooShort')
  })

  it('rifiuta una napola più lunga dei denari posseduti', () => {
    const rules = makeRules({ napola: 'progressive' })
    const issues = validateHand(
      makeHand({ denari: { A: 3, B: 7 }, napola: { team: 'A', length: 5 } }),
      rules,
    )
    expect(codes(issues)).toContain('napola.exceedsDenari')
  })

  it('rifiuta una napola più lunga dei dieci denari esistenti', () => {
    const rules = makeRules({ napola: 'progressive' })
    const issues = validateHand(
      makeHand({ denari: { A: 10, B: 0 }, napola: { team: 'A', length: 11 } }),
      rules,
    )
    expect(codes(issues)).toContain('napola.tooLong')
  })

  it('rifiuta il rebello se la variante non è attiva', () => {
    const issues = validateHand(makeHand({ rebello: 'B' }), RULES)
    expect(codes(issues)).toContain('rebello.disabled')
  })

  it('rifiuta il rebello a chi non ha denari', () => {
    const rules = makeRules({ rebello: true })
    const issues = validateHand(
      makeHand({ denari: { A: 0, B: 10 }, settebello: 'B', rebello: 'A' }),
      rules,
    )
    expect(codes(issues)).toContain('rebello.noDenari')
  })
})

describe('scoreHand', () => {
  it('lancia un errore tipizzato su una mano impossibile', () => {
    expect(() => scoreHand(makeHand({ cards: { A: 30, B: 30 } }), RULES)).toThrow(
      HandValidationError,
    )
  })

  it('non assegna carte e denari in caso di parità', () => {
    const score = scoreHand(makeHand({ settebello: 'A' }), RULES)
    expect(awardFor('carte')?.winner).toBeNull()
    expect(awardFor('denari')?.winner).toBeNull()
    expect(score.totals).toEqual({ A: 1, B: 0 })
  })

  it('assegna carte e denari a chi ne ha di più', () => {
    const hand = makeHand({ cards: { A: 21, B: 19 }, denari: { A: 6, B: 4 } })
    expect(awardFor('carte', hand)?.winner).toBe('A')
    expect(awardFor('denari', hand)?.winner).toBe('A')
  })

  it('conta una scopa per punto', () => {
    const score = scoreHand(makeHand({ scope: { A: 3, B: 1 } }), RULES)
    expect(score.totals).toEqual({ A: 4, B: 1 })
  })

  it('ignora le scope se la regola è disattivata', () => {
    const rules = makeRules({ scopeEnabled: false })
    const score = scoreHand(makeHand({ scope: { A: 3, B: 1 } }), rules)
    expect(score.awards.some((award) => award.kind === 'scope')).toBe(false)
    expect(score.totals).toEqual({ A: 1, B: 0 })
  })

  it('conta la napola a valore fisso', () => {
    const rules = makeRules({ napola: 'fixed', napolaFixedValue: 3 })
    const hand = makeHand({ denari: { A: 6, B: 4 }, napola: { team: 'A', length: 5 } })
    expect(awardFor('napola', hand, rules)?.value).toBe(3)
  })

  it('conta la napola progressiva in base alla lunghezza', () => {
    const rules = makeRules({ napola: 'progressive' })
    const hand = makeHand({ denari: { A: 6, B: 4 }, napola: { team: 'A', length: 5 } })
    expect(awardFor('napola', hand, rules)?.value).toBe(5)
  })

  it('conta il rebello quando la variante è attiva', () => {
    const rules = makeRules({ rebello: true })
    const hand = makeHand({ rebello: 'B' })
    expect(awardFor('rebello', hand, rules)?.value).toBe(1)
    expect(scoreHand(hand, rules).totals).toEqual({ A: 1, B: 1 })
  })

  it('distribuisce esattamente quattro punti base quando nulla è pari', () => {
    const hand = makeHand({
      cards: { A: 21, B: 19 },
      denari: { A: 6, B: 4 },
      settebello: 'A',
      primiera: { mode: 'manual', winner: 'B' },
    })
    const score = scoreHand(hand, RULES)
    expect(score.totals.A + score.totals.B).toBe(4)
  })

  it('calcola correttamente una mano realistica', () => {
    const hand = makeHand({
      cards: { A: 22, B: 18 },
      denari: { A: 6, B: 4 },
      settebello: 'A',
      primiera: {
        mode: 'cards',
        best: {
          A: { denari: 7, coppe: 7, spade: 6, bastoni: 1 },
          B: { denari: 6, coppe: 6, spade: 7, bastoni: 7 },
        },
      },
      scope: { A: 1, B: 2 },
    })

    const score = scoreHand(hand, RULES)

    // A: carte, denari, settebello, 1 scopa. B: primiera, 2 scope.
    expect(score.totals).toEqual({ A: 4, B: 3 })
    expect(awardFor('primiera', hand)?.detail).toBe('76 - 78')
  })
})
