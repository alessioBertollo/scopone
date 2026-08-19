import type { Rank, Suit } from '../domain/cards'

/**
 * A scopa si gioca con mazzi diversi a seconda della regione, e le carte
 * cambiano nome: chi usa le carte francesi dice "quadri" dove chi usa le
 * italiane dice "denari", e al posto del cavallo ha la donna.
 *
 * Le chiavi del dominio restano quelle italiane (`denari`, `coppe`, …) perché
 * sono identificatori, non testo: cambiarle vorrebbe dire riscrivere i dati
 * salvati e quelli già sul server ogni volta che qualcuno cambia mazzo.
 * Qui vive solo la traduzione verso ciò che l'utente legge.
 */
export type DeckKind = 'italiane' | 'francesi'

const SUIT_LABELS: Record<DeckKind, Record<Suit, string>> = {
  italiane: {
    denari: 'Denari',
    coppe: 'Coppe',
    spade: 'Spade',
    bastoni: 'Bastoni',
  },
  francesi: {
    denari: 'Quadri',
    coppe: 'Cuori',
    spade: 'Picche',
    bastoni: 'Fiori',
  },
}

/** Il nove è la carta che distingue i due mazzi: cavallo o donna. */
const NINE: Record<DeckKind, string> = {
  italiane: 'Cavallo',
  francesi: 'Donna',
}

export function suitLabel(suit: Suit, deck: DeckKind): string {
  return SUIT_LABELS[deck][suit]
}

export function rankLabelFor(rank: Rank, deck: DeckKind): string {
  switch (rank) {
    case 1:
      return 'Asso'
    case 8:
      return 'Fante'
    case 9:
      return NINE[deck]
    case 10:
      return 'Re'
    default:
      return String(rank)
  }
}

/** Iniziale per i chip della primiera, dove lo spazio è di una carta. */
export function shortRankFor(rank: Rank, deck: DeckKind): string {
  switch (rank) {
    case 1:
      return 'A'
    case 8:
      return 'F'
    case 9:
      return deck === 'italiane' ? 'C' : 'D'
    case 10:
      return 'R'
    default:
      return String(rank)
  }
}

/** Nome della variante opzionale, che segue il mazzo scelto. */
export function nineOfCoinsLabel(deck: DeckKind): string {
  return `${NINE[deck]} di ${SUIT_LABELS[deck].denari.toLowerCase()}`
}

/** Il settebello si chiama così ovunque, ma il seme cambia nome. */
export function settebelloLabel(deck: DeckKind): string {
  return `7 di ${SUIT_LABELS[deck].denari.toLowerCase()}`
}
