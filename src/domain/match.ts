import { type HandInput, type HandScore, scoreHand } from './hand'
import { DEFAULT_RULES, type RuleSet } from './rules'
import type { ByTeam, TeamId } from './teams'

export type Match = {
  rules: RuleSet
  teamNames: ByTeam<string>
  hands: HandInput[]
}

export type MatchStatus = 'ongoing' | 'finished'

export type MatchState = {
  handScores: HandScore[]
  /** Totali cumulati dopo ciascuna mano, utili per il grafico dell'andamento. */
  progression: ByTeam<number>[]
  totals: ByTeam<number>
  status: MatchStatus
  winner: TeamId | null
  /** Indice della mano che ha chiuso la partita, `null` se è ancora aperta. */
  decidedAtHand: number | null
  /** Punti che mancano a ciascuna squadra per raggiungere il traguardo. */
  remaining: ByTeam<number>
}

export function createMatch(
  teamNames: ByTeam<string> = { A: 'Noi', B: 'Loro' },
  rules: RuleSet = DEFAULT_RULES,
): Match {
  return { rules, teamNames, hands: [] }
}

export function addHand(match: Match, hand: HandInput): Match {
  return { ...match, hands: [...match.hands, hand] }
}

export function replaceHand(match: Match, index: number, hand: HandInput): Match {
  const hands = match.hands.map((existing, i) => (i === index ? hand : existing))
  return { ...match, hands }
}

export function removeHand(match: Match, index: number): Match {
  return { ...match, hands: match.hands.filter((_, i) => i !== index) }
}

/**
 * La partita è chiusa quando almeno una squadra ha raggiunto il traguardo
 * e le due squadre non sono in parità: a pari punti si gioca un'altra mano.
 */
function decide(totals: ByTeam<number>, targetScore: number): TeamId | null {
  const best = Math.max(totals.A, totals.B)
  if (best < targetScore || totals.A === totals.B) return null
  return totals.A > totals.B ? 'A' : 'B'
}

export function scoreMatch(match: Match): MatchState {
  const handScores: HandScore[] = []
  const progression: ByTeam<number>[] = []
  const totals: ByTeam<number> = { A: 0, B: 0 }

  let winner: TeamId | null = null
  let decidedAtHand: number | null = null

  for (const [index, hand] of match.hands.entries()) {
    const score = scoreHand(hand, match.rules)
    handScores.push(score)

    totals.A += score.totals.A
    totals.B += score.totals.B
    progression.push({ ...totals })

    if (decidedAtHand === null) {
      const decided = decide(totals, match.rules.targetScore)
      if (decided !== null) {
        winner = decided
        decidedAtHand = index
      }
    }
  }

  return {
    handScores,
    progression,
    totals,
    status: decidedAtHand === null ? 'ongoing' : 'finished',
    winner,
    decidedAtHand,
    remaining: {
      A: Math.max(0, match.rules.targetScore - totals.A),
      B: Math.max(0, match.rules.targetScore - totals.B),
    },
  }
}
