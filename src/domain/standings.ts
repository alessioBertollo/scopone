import type { ByTeam, TeamId } from './teams'

/**
 * Una partita conclusa, ridotta a ciò che serve alla classifica: chi ha
 * giocato, in che squadra, e come è finita.
 */
export type StandingsMatch = {
  totals: ByTeam<number>
  winner: TeamId
  lineup: { profileId: string; team: TeamId }[]
}

type Record_ = {
  played: number
  won: number
  lost: number
  pointsFor: number
  pointsAgainst: number
}

export type PlayerStanding = Record_ & { profileId: string }

/**
 * Una coppia è identificata dall'insieme dei suoi giocatori, non dall'ordine
 * in cui compaiono: Ada con Bruno e Bruno con Ada sono la stessa coppia.
 */
export type PairStanding = Record_ & { profileIds: string[] }

const EMPTY: Record_ = { played: 0, won: 0, lost: 0, pointsFor: 0, pointsAgainst: 0 }

function accumulate(
  current: Record_,
  won: boolean,
  forPoints: number,
  against: number,
): Record_ {
  return {
    played: current.played + 1,
    won: current.won + (won ? 1 : 0),
    lost: current.lost + (won ? 0 : 1),
    pointsFor: current.pointsFor + forPoints,
    pointsAgainst: current.pointsAgainst + against,
  }
}

/** Differenza fra punti fatti e subiti: distingue chi vince di misura da chi domina. */
export function differential(standing: Record_): number {
  return standing.pointsFor - standing.pointsAgainst
}

/**
 * Ordina per vittorie, poi per differenza punti, poi per punti fatti. Chi ha
 * giocato meno non è penalizzato dall'ordinamento: lo si vede dalla colonna
 * delle partite, che resta l'informazione onesta da mostrare accanto.
 */
function byMerit<T extends Record_>(a: T, b: T): number {
  if (b.won !== a.won) return b.won - a.won
  const delta = differential(b) - differential(a)
  if (delta !== 0) return delta
  return b.pointsFor - a.pointsFor
}

export function playerStandings(matches: StandingsMatch[]): PlayerStanding[] {
  const totals = new Map<string, Record_>()

  for (const match of matches) {
    for (const player of match.lineup) {
      const won = player.team === match.winner
      const forPoints = match.totals[player.team]
      const against = match.totals[player.team === 'A' ? 'B' : 'A']
      totals.set(
        player.profileId,
        accumulate(totals.get(player.profileId) ?? EMPTY, won, forPoints, against),
      )
    }
  }

  return [...totals.entries()]
    .map(([profileId, record]) => ({ profileId, ...record }))
    .sort(byMerit)
}

/** Chiave stabile di una coppia: gli id ordinati, uniti da un separatore. */
function pairKey(profileIds: string[]): string {
  return [...profileIds].sort().join('|')
}

/**
 * Classifica delle formazioni che hanno giocato insieme. Comprende anche i
 * giocatori singoli, quando si gioca uno contro uno: è la stessa cosa vista
 * dal lato della squadra invece che del giocatore.
 */
export function pairStandings(matches: StandingsMatch[]): PairStanding[] {
  // Componenti e conteggi nella stessa voce: due mappe separate lascerebbero
  // aperto il caso, impossibile, di una chiave presente in una sola delle due.
  const squadre = new Map<string, { profileIds: string[]; record: Record_ }>()

  for (const match of matches) {
    for (const team of ['A', 'B'] as const) {
      const ids = match.lineup
        .filter((player) => player.team === team)
        .map((player) => player.profileId)
      if (ids.length === 0) continue

      const key = pairKey(ids)
      const corrente = squadre.get(key)

      squadre.set(key, {
        profileIds: corrente?.profileIds ?? [...ids].sort(),
        record: accumulate(
          corrente?.record ?? EMPTY,
          team === match.winner,
          match.totals[team],
          match.totals[team === 'A' ? 'B' : 'A'],
        ),
      })
    }
  }

  return [...squadre.values()]
    .map(({ profileIds, record }) => ({ profileIds, ...record }))
    .sort(byMerit)
}
