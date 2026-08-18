import type { HandInput } from '../domain/hand'
import type { RuleSet } from '../domain/rules'
import type { ByTeam, TeamId } from '../domain/teams'

/**
 * Forma delle tabelle su Supabase. Scritta a mano e non generata, perché le
 * colonne `jsonb` vanno tipizzate col dominio vero: il generatore le
 * dichiarerebbe `Json`, cioè `unknown`, e perderemmo il controllo proprio
 * dove serve di più.
 *
 * Fonte di verità: supabase/migrations/0001_leghe_e_partite.sql
 */

export type MatchStatus = 'ongoing' | 'finished' | 'abandoned'
export type LeagueRole = 'owner' | 'member'

export type ProfileRow = {
  id: string
  display_name: string
  created_at: string
}

export type LeagueRow = {
  id: string
  name: string
  created_by: string
  invite_code: string
  created_at: string
}

export type LeagueMemberRow = {
  league_id: string
  profile_id: string
  role: LeagueRole
  joined_at: string
}

export type MatchRow = {
  id: string
  /** `null` per una partita libera, fuori da ogni lega. */
  league_id: string | null
  created_by: string
  rules: RuleSet
  team_names: ByTeam<string>
  hands: HandInput[]
  status: MatchStatus
  created_at: string
  updated_at: string
}

export type MatchPlayerRow = {
  match_id: string
  profile_id: string
  team: TeamId
}
