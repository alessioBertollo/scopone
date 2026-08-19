import { Pressable, ScrollView, Text, View } from 'react-native'
import { RANKS, type Rank, SUITS, type Suit } from '../domain/cards'
import { type BestBySuit, primieraTotal } from '../domain/primiera'
import { type ByTeam, otherTeam, TEAMS, type TeamId } from '../domain/teams'
import { useTranslation } from '../i18n/useTranslation'
import { shortRankFor, suitLabel } from '../lib/deck'
import { useSettingsStore } from '../store/settings-store'
import { cn } from '../ui/cn'

type Props = {
  best: ByTeam<BestBySuit>
  teamNames: ByTeam<string>
  onChange: (best: ByTeam<BestBySuit>) => void
}

function RankChip({
  label,
  selected,
  disabled,
  team,
  onPress,
  testID,
}: {
  label: string
  selected: boolean
  disabled: boolean
  team: TeamId
  onPress: () => void
  testID: string
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      className={cn(
        'h-9 w-9 items-center justify-center rounded-lg active:opacity-60',
        selected ? (team === 'A' ? 'bg-team-a' : 'bg-team-b') : 'bg-sunken',
        disabled && 'opacity-25',
      )}
    >
      <Text className={cn('font-medium text-sm', selected ? 'text-white' : 'text-ink')}>
        {label}
      </Text>
    </Pressable>
  )
}

export function PrimieraCardsInput({ best, teamNames, onChange }: Props) {
  const { t } = useTranslation()
  const deck = useSettingsStore((state) => state.deck)

  const setRank = (team: TeamId, suit: Suit, rank: Rank | undefined) => {
    onChange({ ...best, [team]: { ...best[team], [suit]: rank } })
  }

  return (
    <View className="gap-4">
      {SUITS.map((suit) => (
        <View key={suit}>
          <Text className="mb-1.5 font-medium text-ink text-sm">{suitLabel(suit, deck)}</Text>

          {TEAMS.map((team) => {
            const current = best[team][suit]
            const takenByOther = best[otherTeam(team)][suit]

            return (
              <View key={team} className="mb-1.5 flex-row items-center gap-2">
                <Text
                  numberOfLines={1}
                  className={cn('w-16 text-xs', team === 'A' ? 'text-team-a' : 'text-team-b')}
                >
                  {teamNames[team]}
                </Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-1.5 pr-2">
                    <RankChip
                      label="—"
                      testID={`primiera-${team}-${suit}-nessuna`}
                      team={team}
                      selected={current === undefined}
                      disabled={false}
                      onPress={() => setRank(team, suit, undefined)}
                    />
                    {RANKS.map((rank) => (
                      <RankChip
                        key={rank}
                        label={shortRankFor(rank, deck)}
                        testID={`primiera-${team}-${suit}-${rank}`}
                        team={team}
                        selected={current === rank}
                        disabled={takenByOther === rank}
                        onPress={() => setRank(team, suit, rank)}
                      />
                    ))}
                  </View>
                </ScrollView>
              </View>
            )
          })}
        </View>
      ))}

      <View className="flex-row justify-between rounded-xl bg-sunken px-3 py-2">
        <Text className="text-muted text-xs">{t('primiera.total')}</Text>
        <Text className="text-xs">
          <Text testID="primiera-totale-A" className="font-semibold text-team-a">
            {primieraTotal(best.A)}
          </Text>
          <Text className="text-muted"> — </Text>
          <Text testID="primiera-totale-B" className="font-semibold text-team-b">
            {primieraTotal(best.B)}
          </Text>
        </Text>
      </View>
    </View>
  )
}
