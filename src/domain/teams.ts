export const TEAMS = ['A', 'B'] as const

export type TeamId = (typeof TEAMS)[number]

/** Mappa un valore per ciascuna delle due squadre. */
export type ByTeam<T> = Record<TeamId, T>

export function otherTeam(team: TeamId): TeamId {
  return team === 'A' ? 'B' : 'A'
}

/**
 * Assegna il punto alla squadra con il valore più alto.
 * In caso di parità il punto non viene assegnato a nessuno.
 */
export function higherOf(values: ByTeam<number>): TeamId | null {
  if (values.A === values.B) return null
  return values.A > values.B ? 'A' : 'B'
}
