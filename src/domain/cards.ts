export const SUITS = ['denari', 'coppe', 'spade', 'bastoni'] as const

export type Suit = (typeof SUITS)[number]

export const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const

export type Rank = (typeof RANKS)[number]

/** Carte totali in un mazzo italiano da scopa. */
export const DECK_SIZE = 40

/** Carte per seme, quindi anche il numero di denari in gioco. */
export const CARDS_PER_SUIT = 10

/** Il settebello è il 7 di denari. */
export const SETTEBELLO: { suit: Suit; rank: Rank } = { suit: 'denari', rank: 7 }

/** La donna di denari, variante opzionale: è il 9, fra fante e re. */
export const DONNA_DI_DENARI: { suit: Suit; rank: Rank } = { suit: 'denari', rank: 9 }

/**
 * Valori di primiera. Non seguono l'ordine delle carte: il 7 vale più di
 * tutto, l'asso viene subito dopo il 6, e le figure valgono il minimo.
 */
const PRIMIERA_BY_RANK: Record<Rank, number> = {
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

export function primieraValue(rank: Rank): number {
  return PRIMIERA_BY_RANK[rank]
}

export function isRank(value: number): value is Rank {
  return Number.isInteger(value) && value >= 1 && value <= 10
}

/** Nome della carta in italiano, per la UI. */
export function rankLabel(rank: Rank): string {
  switch (rank) {
    case 1:
      return 'Asso'
    case 8:
      return 'Fante'
    case 9:
      return 'Donna'
    case 10:
      return 'Re'
    default:
      return String(rank)
  }
}
