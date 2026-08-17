import { primieraValue, type Rank, SUITS, type Suit } from './cards'
import { type ByTeam, higherOf, type TeamId } from './teams'

/**
 * La carta di primiera più alta che una squadra possiede per ciascun seme.
 * Un seme assente significa che la squadra non ha preso nessuna carta di
 * quel seme e quindi contribuisce zero al totale.
 */
export type BestBySuit = Partial<Record<Suit, Rank>>

export type PrimieraInput =
  /** L'app calcola la primiera dalle carte migliori dichiarate. */
  | { mode: 'cards'; best: ByTeam<BestBySuit> }
  /** L'utente sa già chi ha vinto la primiera e la assegna a mano. */
  | { mode: 'manual'; winner: TeamId | null }

export type PrimieraResult = {
  winner: TeamId | null
  /** Presente solo quando la primiera è stata calcolata dalle carte. */
  totals: ByTeam<number> | null
}

/** Somma dei valori di primiera delle carte migliori, un seme alla volta. */
export function primieraTotal(best: BestBySuit): number {
  let total = 0
  for (const suit of SUITS) {
    const rank = best[suit]
    if (rank !== undefined) total += primieraValue(rank)
  }
  return total
}

export function resolvePrimiera(input: PrimieraInput): PrimieraResult {
  if (input.mode === 'manual') {
    return { winner: input.winner, totals: null }
  }

  const totals: ByTeam<number> = {
    A: primieraTotal(input.best.A),
    B: primieraTotal(input.best.B),
  }

  return { winner: higherOf(totals), totals }
}
