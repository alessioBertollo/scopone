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

export type RuleSet = {
  /** Punti necessari per vincere la partita (tipicamente 11, 16 o 21). */
  targetScore: number
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
