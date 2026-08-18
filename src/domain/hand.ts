import { CARDS_PER_SUIT, DECK_SIZE, SUITS } from './cards'
import { type PrimieraInput, resolvePrimiera } from './primiera'
import type { RuleSet } from './rules'
import { type ByTeam, higherOf, TEAMS, type TeamId } from './teams'

/** La napola richiede almeno asso, 2 e 3 di denari nella stessa presa. */
export const MIN_NAPOLA_LENGTH = 3

/**
 * Scope massime in una mano, contando entrambe le squadre. Dopo una scopa il
 * tavolo è vuoto e chi gioca dopo è costretto a calare, quindi non se ne
 * possono fare due di fila: il tetto è molto sotto il numero di giocate.
 */
export const MAX_SCOPE_PER_HAND = 18

export type Napola = {
  team: TeamId
  /** Lunghezza della sequenza a partire dall'asso di denari. */
  length: number
}

/** Il conteggio di una singola mano, così come lo inserisce l'utente. */
export type HandInput = {
  /** Carte prese da ciascuna squadra: devono sommare a 40. */
  cards: ByTeam<number>
  /** Denari presi da ciascuna squadra: devono sommare a 10. */
  denari: ByTeam<number>
  /** Chi ha preso il 7 di denari: è sempre di qualcuno. */
  settebello: TeamId
  primiera: PrimieraInput
  scope: ByTeam<number>
  napola?: Napola
  /** Chi ha preso la donna di denari: obbligatorio se la variante è attiva. */
  donna?: TeamId
}

export type PointKind =
  | 'carte'
  | 'denari'
  | 'settebello'
  | 'primiera'
  | 'scope'
  | 'napola'
  | 'donna'

export type PointAward = {
  kind: PointKind
  /** `null` quando il punto è pareggiato e quindi non assegnato. */
  winner: TeamId | null
  value: number
  /** Dettaglio leggibile, ad esempio i totali di primiera. */
  detail?: string
}

export type HandScore = {
  totals: ByTeam<number>
  awards: PointAward[]
}

export type ValidationIssue = {
  code: string
  message: string
}

export class HandValidationError extends Error {
  readonly issues: ValidationIssue[]

  constructor(issues: ValidationIssue[]) {
    super(`Mano non valida: ${issues.map((i) => i.message).join('; ')}`)
    this.name = 'HandValidationError'
    this.issues = issues
  }
}

function isCount(value: number): boolean {
  return Number.isInteger(value) && value >= 0
}

/**
 * Controlla che la mano sia aritmeticamente possibile.
 * Restituisce la lista dei problemi invece di lanciare, così la UI può
 * mostrarli mentre l'utente digita.
 */
export function validateHand(hand: HandInput, rules: RuleSet): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  for (const team of TEAMS) {
    if (!isCount(hand.cards[team])) {
      issues.push({
        code: 'cards.invalid',
        message: `Le carte della squadra ${team} devono essere un numero intero non negativo`,
      })
    }
    if (!isCount(hand.denari[team])) {
      issues.push({
        code: 'denari.invalid',
        message: `I denari della squadra ${team} devono essere un numero intero non negativo`,
      })
    }
    if (!isCount(hand.scope[team])) {
      issues.push({
        code: 'scope.invalid',
        message: `Le scope della squadra ${team} devono essere un numero intero non negativo`,
      })
    }
  }

  // Senza numeri validi i controlli successivi produrrebbero solo rumore.
  if (issues.length > 0) return issues

  const totalCards = hand.cards.A + hand.cards.B
  if (totalCards !== DECK_SIZE) {
    issues.push({
      code: 'cards.total',
      message: `Le carte prese devono sommare a ${DECK_SIZE}, non ${totalCards}`,
    })
  }

  const totalDenari = hand.denari.A + hand.denari.B
  if (totalDenari !== CARDS_PER_SUIT) {
    issues.push({
      code: 'denari.total',
      message: `I denari devono sommare a ${CARDS_PER_SUIT}, non ${totalDenari}`,
    })
  }

  const totalScope = hand.scope.A + hand.scope.B
  if (rules.scopeEnabled && totalScope > MAX_SCOPE_PER_HAND) {
    issues.push({
      code: 'scope.total',
      message: `In una mano non si possono fare più di ${MAX_SCOPE_PER_HAND} scope in tutto, non ${totalScope}`,
    })
  }

  for (const team of TEAMS) {
    if (hand.denari[team] > hand.cards[team]) {
      issues.push({
        code: 'denari.exceedsCards',
        message: `La squadra ${team} non può avere più denari (${hand.denari[team]}) che carte (${hand.cards[team]})`,
      })
    }
  }

  if (hand.denari[hand.settebello] < 1) {
    issues.push({
      code: 'settebello.noDenari',
      message: `La squadra ${hand.settebello} non ha denari, non può avere il settebello`,
    })
  }

  if (rules.primieraEnabled && hand.primiera.mode === 'cards') {
    for (const suit of SUITS) {
      const a = hand.primiera.best.A[suit]
      const b = hand.primiera.best.B[suit]
      if (a !== undefined && b !== undefined && a === b) {
        issues.push({
          code: 'primiera.duplicateCard',
          message: `La stessa carta di ${suit} non può essere la migliore di entrambe le squadre`,
        })
      }
    }
  }

  if (hand.napola) {
    if (!rules.napolaEnabled) {
      issues.push({
        code: 'napola.disabled',
        message: 'La napola è stata inserita ma non è attiva nelle regole',
      })
    }
    if (!isCount(hand.napola.length) || hand.napola.length < MIN_NAPOLA_LENGTH) {
      issues.push({
        code: 'napola.tooShort',
        message: `La napola parte da almeno ${MIN_NAPOLA_LENGTH} carte (asso, 2, 3 di denari)`,
      })
    } else if (hand.napola.length > CARDS_PER_SUIT) {
      issues.push({
        code: 'napola.tooLong',
        message: `La napola non può superare le ${CARDS_PER_SUIT} carte di denari`,
      })
    } else if (hand.napola.length > hand.denari[hand.napola.team]) {
      issues.push({
        code: 'napola.exceedsDenari',
        message: `La squadra ${hand.napola.team} ha ${hand.denari[hand.napola.team]} denari, non può avere una napola da ${hand.napola.length}`,
      })
    }
  }

  if (hand.donna === undefined) {
    if (rules.donnaEnabled) {
      issues.push({
        code: 'donna.missing',
        message: 'La donna di denari è sempre di qualcuno: va assegnata',
      })
    }
  } else if (!rules.donnaEnabled) {
    issues.push({
      code: 'donna.disabled',
      message: 'La donna di denari è stata inserita ma non è attiva nelle regole',
    })
  } else if (hand.denari[hand.donna] < 1) {
    issues.push({
      code: 'donna.noDenari',
      message: `La squadra ${hand.donna} non ha denari, non può avere la donna di denari`,
    })
  }

  return issues
}

/**
 * La napola vale un punto per carta: asso, due e tre di denari fanno tre
 * punti, e ogni denaro consecutivo in più ne aggiunge uno.
 */
function napolaPoints(napola: Napola): number {
  return napola.length
}

/**
 * Calcola i punti di una mano.
 * @throws {HandValidationError} se la mano non è aritmeticamente valida.
 */
export function scoreHand(hand: HandInput, rules: RuleSet): HandScore {
  const issues = validateHand(hand, rules)
  if (issues.length > 0) throw new HandValidationError(issues)

  const awards: PointAward[] = []

  awards.push({
    kind: 'carte',
    winner: higherOf(hand.cards),
    value: 1,
    detail: `${hand.cards.A} - ${hand.cards.B}`,
  })

  awards.push({
    kind: 'denari',
    winner: higherOf(hand.denari),
    value: 1,
    detail: `${hand.denari.A} - ${hand.denari.B}`,
  })

  awards.push({ kind: 'settebello', winner: hand.settebello, value: 1 })

  if (rules.primieraEnabled) {
    const primiera = resolvePrimiera(hand.primiera)
    awards.push({
      kind: 'primiera',
      winner: primiera.winner,
      value: 1,
      detail: primiera.totals ? `${primiera.totals.A} - ${primiera.totals.B}` : undefined,
    })
  }

  if (rules.scopeEnabled) {
    for (const team of TEAMS) {
      if (hand.scope[team] > 0) {
        awards.push({ kind: 'scope', winner: team, value: hand.scope[team] })
      }
    }
  }

  if (hand.napola) {
    awards.push({
      kind: 'napola',
      winner: hand.napola.team,
      value: napolaPoints(hand.napola),
      detail: `${hand.napola.length} carte`,
    })
  }

  if (rules.donnaEnabled && hand.donna !== undefined) {
    awards.push({ kind: 'donna', winner: hand.donna, value: 1 })
  }

  const totals: ByTeam<number> = { A: 0, B: 0 }
  for (const award of awards) {
    if (award.winner !== null) totals[award.winner] += award.value
  }

  return { totals, awards }
}
