/**
 * La coreografia dei coriandoli, separata dal componente che la disegna.
 *
 * Sta qui e non dentro `Victory.tsx` per due motivi: si verifica senza un
 * renderer, e la casualità è seminata invece che libera — due render della
 * stessa partita producono la stessa caduta, quindi il tabellone non si
 * rimescola sotto gli occhi di chi guarda quando la schermata si aggiorna.
 */

/** Semi come glifi: nessuna immagine da scaricare, e li disegna ogni sistema. */
export const SUIT_GLYPHS = ['♠', '♥', '♦', '♣'] as const

/** Non colori ma ruoli: il componente li traduce nella palette del tema. */
export const TONES = ['winner', 'brass', 'felt'] as const
export type ConfettoTone = (typeof TONES)[number]

export type Confetto = {
  glyph: string
  tone: ConfettoTone
  /** Partenza orizzontale, come frazione della larghezza. */
  left: number
  /** Ritardo prima di cadere, in millisecondi. */
  delay: number
  /** Durata della caduta, in millisecondi. */
  duration: number
  /** Spostamento laterale lungo la caduta, come frazione della larghezza. */
  drift: number
  /** Giri completi lungo la caduta, con segno. */
  spin: number
  /** Corpo del glifo, in punti. */
  size: number
}

export const CONFETTI_COUNT = 24

const SPREAD_MS = 900
const FALL_MIN_MS = 1500
const FALL_MAX_MS = 2600

/**
 * Generatore deterministico: `Math.random` renderebbe questa funzione
 * inverificabile, e il seme la lega alla partita invece che al render.
 */
function sequence(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function confetti(count: number, seed: number): Confetto[] {
  const next = sequence(seed)
  const pieces: Confetto[] = []

  for (let i = 0; i < count; i += 1) {
    // Le colonne sono ripartite e non estratte: una caduta ammassata da un
    // lato sembra un difetto di disegno, non una festa.
    const column = (i + 0.5) / count
    const jitter = (next() - 0.5) * (0.8 / count)

    pieces.push({
      glyph: SUIT_GLYPHS[Math.floor(next() * SUIT_GLYPHS.length)] ?? SUIT_GLYPHS[0],
      tone: TONES[Math.floor(next() * TONES.length)] ?? TONES[0],
      left: clamp(column + jitter, 0, 1),
      delay: Math.round(next() * SPREAD_MS),
      duration: FALL_MIN_MS + Math.round(next() * (FALL_MAX_MS - FALL_MIN_MS)),
      drift: (next() - 0.5) * 0.3,
      spin: (next() - 0.5) * 3,
      size: 18 + Math.round(next() * 14),
    })
  }

  return pieces
}

/** Quando l'ultimo pezzo ha finito di cadere, in millisecondi. */
export function celebrationDuration(pieces: Confetto[]): number {
  return pieces.reduce((longest, piece) => Math.max(longest, piece.delay + piece.duration), 0)
}

/**
 * Un seme stabile per una partita: le stesse mani e lo stesso vincitore
 * danno la stessa caduta, mani diverse ne danno una nuova.
 */
export function celebrationSeed(hands: number, winner: string): number {
  let hash = hands * 2654435761
  for (let i = 0; i < winner.length; i += 1) {
    hash = (hash * 31 + winner.charCodeAt(i)) >>> 0
  }
  return hash >>> 0
}
