import { useRouter } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import type { HandScore, PointKind } from '../src/domain/hand'
import type { ByTeam, TeamId } from '../src/domain/teams'
import { useMatchState } from '../src/store/hooks'
import { useMatchStore } from '../src/store/match-store'
import { Button } from '../src/ui/Button'
import { Card } from '../src/ui/Card'
import { cn } from '../src/ui/cn'
import { Screen } from '../src/ui/Screen'

const POINT_LABEL: Record<PointKind, string> = {
  carte: 'Carte',
  denari: 'Denari',
  settebello: 'Settebello',
  primiera: 'Primiera',
  scope: 'Scope',
  napola: 'Napola',
  donna: 'Donna',
}

function TeamTotal({
  name,
  total,
  remaining,
  team,
  isWinner,
}: {
  name: string
  total: number
  remaining: number
  team: TeamId
  isWinner: boolean
}) {
  return (
    <View className="flex-1 items-center">
      <Text
        numberOfLines={1}
        className={cn(
          'font-semibold text-xs uppercase tracking-widest',
          team === 'A' ? 'text-team-a' : 'text-team-b',
        )}
      >
        {name}
      </Text>
      <Text
        testID={`totale-${team}`}
        className={cn(
          'mt-1 font-bold text-6xl tabular-nums',
          team === 'A' ? 'text-team-a' : 'text-team-b',
        )}
      >
        {total}
      </Text>
      <Text className="mt-1 text-muted text-xs">
        {isWinner ? 'Vittoria' : remaining > 0 ? `mancano ${remaining}` : 'al traguardo'}
      </Text>
    </View>
  )
}

function AwardChip({ label, team }: { label: string; team: TeamId }) {
  return (
    <View
      className={cn('rounded-full px-2 py-0.5', team === 'A' ? 'bg-team-a/15' : 'bg-team-b/15')}
    >
      <Text className={cn('text-xs', team === 'A' ? 'text-team-a' : 'text-team-b')}>
        {label}
      </Text>
    </View>
  )
}

function HandRow({
  index,
  score,
  onPress,
}: {
  index: number
  score: HandScore
  onPress: () => void
}) {
  const scored = score.awards.filter((award) => award.winner !== null)

  return (
    <Pressable
      testID={`mano-${index}`}
      accessibilityRole="button"
      accessibilityLabel={`Mano ${index + 1}, modifica`}
      onPress={onPress}
      className="rounded-2xl border border-line bg-surface p-3 active:opacity-70"
    >
      <View className="flex-row items-center justify-between">
        <Text className="font-medium text-muted text-xs uppercase tracking-widest">
          Mano {index + 1}
        </Text>
        <View className="flex-row items-baseline gap-1">
          <Text className="font-semibold text-base text-team-a tabular-nums">
            {score.totals.A}
          </Text>
          <Text className="text-muted text-xs">—</Text>
          <Text className="font-semibold text-base text-team-b tabular-nums">
            {score.totals.B}
          </Text>
        </View>
      </View>

      <View className="mt-2 flex-row flex-wrap gap-1.5">
        {scored.map((award) => (
          <AwardChip
            key={`${award.kind}-${award.winner}`}
            team={award.winner as TeamId}
            label={
              award.value > 1
                ? `${POINT_LABEL[award.kind]} ×${award.value}`
                : POINT_LABEL[award.kind]
            }
          />
        ))}
      </View>
    </Pressable>
  )
}

export default function MatchScreen() {
  const router = useRouter()
  const teamNames: ByTeam<string> = useMatchStore((state) => state.match.teamNames)
  const targetScore = useMatchStore((state) => state.match.rules.targetScore)
  const state = useMatchState()

  const finished = state.status === 'finished'
  const winnerName = state.winner ? teamNames[state.winner] : null

  return (
    <Screen
      scroll
      footer={
        <View className="gap-2">
          {finished ? (
            <Button
              label="Nuova partita"
              testID="nuova-partita"
              onPress={() => router.replace('/new-match')}
            />
          ) : (
            <Button
              label="Aggiungi mano"
              testID="aggiungi-mano"
              onPress={() => router.push('/hand')}
            />
          )}
          <Button
            label="Torna alle impostazioni"
            variant="ghost"
            onPress={() => router.back()}
          />
        </View>
      }
    >
      <View className="pt-2">
        <Text className="text-muted text-xs uppercase tracking-widest">
          Partita a {targetScore} punti
        </Text>
      </View>

      <Card>
        <View className="flex-row items-start">
          <TeamTotal
            team="A"
            name={teamNames.A}
            total={state.totals.A}
            remaining={state.remaining.A}
            isWinner={state.winner === 'A'}
          />
          <View className="w-px self-stretch bg-line" />
          <TeamTotal
            team="B"
            name={teamNames.B}
            total={state.totals.B}
            remaining={state.remaining.B}
            isWinner={state.winner === 'B'}
          />
        </View>
      </Card>

      {finished && winnerName ? (
        <View className="rounded-card bg-felt p-4">
          <Text className="text-center font-semibold text-base text-white">
            Ha vinto {winnerName}
          </Text>
        </View>
      ) : null}

      {state.handScores.length === 0 ? (
        <Card>
          <Text className="text-center text-muted text-sm">
            Nessuna mano registrata. Aggiungi la prima quando avete finito di contare.
          </Text>
        </Card>
      ) : (
        <View className="gap-2">
          <Text className="text-muted text-xs uppercase tracking-widest">Mani giocate</Text>
          {state.handScores.map((score, index) => (
            <HandRow
              // biome-ignore lint/suspicious/noArrayIndexKey: le mani sono una sequenza ordinata senza identità propria, e la riga non ha stato interno da preservare
              key={`hand-${index}`}
              index={index}
              score={score}
              onPress={() => router.push(`/hand?index=${index}`)}
            />
          ))}
        </View>
      )}
    </Screen>
  )
}
