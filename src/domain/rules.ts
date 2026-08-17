/**
 * Le regole dello scopone cambiano da regione a regione e da tavolo a tavolo.
 * Tutto ciò che non è universale sta qui ed è configurabile.
 */
export type NapolaRule =
  /** Napola non conteggiata. */
  | 'off'
  /** Vale sempre lo stesso numero di punti, indipendentemente dalla lunghezza. */
  | 'fixed'
  /** Vale un punto per carta della sequenza: asso-2-3 = 3, asso-2-3-4 = 4, ecc. */
  | 'progressive'

export type WinRule =
  /** Vince chi raggiunge il traguardo: a 21 su 21 la partita è chiusa. */
  | 'reach'
  /** Vince chi lo supera: a 21 esatti si continua, servono almeno 22. */
  | 'exceed'

export type RuleSet = {
  /** Punti necessari per vincere la partita (tipicamente 11, 16 o 21). */
  targetScore: number
  /** Se il traguardo va raggiunto o superato. */
  winRule: WinRule
  /** Alcuni tavoli non contano la primiera: è la variante più diffusa. */
  primieraEnabled: boolean
  /** Come conteggiare la napola (asso, 2, 3... di denari consecutivi). */
  napola: NapolaRule
  /** Punti della napola quando `napola` è 'fixed'. */
  napolaFixedValue: number
  /** Variante: il re di denari vale un punto aggiuntivo. */
  rebello: boolean
  /** Se disattivato, le scope non contano (rarissimo, ma esiste). */
  scopeEnabled: boolean
}

export const DEFAULT_RULES: RuleSet = {
  targetScore: 21,
  winRule: 'reach',
  primieraEnabled: true,
  napola: 'off',
  napolaFixedValue: 3,
  rebello: false,
  scopeEnabled: true,
}

export const RULE_PRESETS = {
  /** Scopone scientifico "da torneo": solo i quattro punti classici più le scope. */
  scientifico: { ...DEFAULT_RULES, targetScore: 21 },
  /** Scopa classica, partita corta. */
  scopa: { ...DEFAULT_RULES, targetScore: 11 },
  /** Variante con napola progressiva e rebello. */
  napoletana: {
    ...DEFAULT_RULES,
    targetScore: 21,
    napola: 'progressive',
    rebello: true,
  },
} as const satisfies Record<string, RuleSet>

export type RulePresetId = keyof typeof RULE_PRESETS
