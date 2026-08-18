/**
 * Le regole dello scopone cambiano da regione a regione e da tavolo a tavolo.
 * Tutto ciò che non è universale sta qui ed è configurabile.
 */

export type WinRule =
  /** Vince chi raggiunge il traguardo: a 21 su 21 la partita è chiusa. */
  | 'reach'
  /** Vince chi lo supera: a 21 esatti si continua, servono almeno 22. */
  | 'exceed'

export type PrimieraMode =
  /** L'utente sa già chi ha vinto la primiera e la assegna a mano. */
  | 'manual'
  /** L'app la calcola dalla carta migliore di ogni seme. */
  | 'cards'

export type RuleSet = {
  /** Punti necessari per vincere la partita (tipicamente 11 o 21). */
  targetScore: number
  /** Se il traguardo va raggiunto o superato. */
  winRule: WinRule
  /** Alcuni tavoli non contano la primiera. */
  primieraEnabled: boolean
  /** Come si inserisce la primiera a fine mano: è una preferenza del tavolo. */
  primieraMode: PrimieraMode
  /**
   * Napola: asso, due e tre di denari nella stessa presa. Vale tre punti, uno
   * per carta, e cresce di uno per ogni denaro consecutivo in più.
   */
  napolaEnabled: boolean
  /** Variante: la donna di denari vale un punto aggiuntivo. */
  donnaEnabled: boolean
  /** Se disattivato, le scope non contano (rarissimo, ma esiste). */
  scopeEnabled: boolean
}

export const DEFAULT_RULES: RuleSet = {
  targetScore: 21,
  winRule: 'reach',
  primieraEnabled: true,
  primieraMode: 'manual',
  napolaEnabled: false,
  donnaEnabled: false,
  scopeEnabled: true,
}

export const RULE_PRESETS = {
  /** Scopone scientifico "da torneo": solo i quattro punti classici più le scope. */
  scientifico: { ...DEFAULT_RULES, targetScore: 21 },
  /** Scopa classica, partita corta. */
  scopa: { ...DEFAULT_RULES, targetScore: 11 },
  /** Variante con napola e donna di denari. */
  napoletana: {
    ...DEFAULT_RULES,
    targetScore: 21,
    napolaEnabled: true,
    donnaEnabled: true,
  },
} as const satisfies Record<string, RuleSet>

export type RulePresetId = keyof typeof RULE_PRESETS
