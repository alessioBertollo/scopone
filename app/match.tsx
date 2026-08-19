import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import type { HandScore, PointKind } from '../src/domain/hand'
import { scoreMatch } from '../src/domain/match'
import type { ByTeam, TeamId } from '../src/domain/teams'
import { getRemoteMatch, type RemoteMatch, watchRemoteMatch } from '../src/lib/matches'
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
  /** Assente per chi sta solo seguendo: la riga resta leggibile ma inerte. */
  onPress?: () => void
}) {
  const scored = score.awards.filter((award) => award.winner !== null)
  const modificabile = onPress !== undefined

  return (
    <Pressable
      testID={`mano-${index}`}
      accessibilityRole={modificabile ? 'button' : 'text'}
      accessibilityLabel={modificabile ? `Mano ${index + 1}, modifica` : `Mano ${index + 1}`}
      disabled={!modificabile}
      onPress={onPress}
      className={cn(
        'rounded-2xl border border-line bg-surface p-3',
        modificabile && 'active:opacity-70',
      )}
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
  const params = useLocalSearchParams<{ remote?: string }>()
  const remoteId = params.remote ?? null

  const localTeamNames: ByTeam<string> = useMatchStore((state) => state.match.teamNames)
  const localTarget = useMatchStore((state) => state.match.rules.targetScore)
  const localState = useMatchState()

  const [remote, setRemote] = useState<RemoteMatch | null>(null)
  const [remoteError, setRemoteError] = useState<string | null>(null)

  /**
   * Una partita di lega si segue mentre viene giocata: la sottoscrizione
   * consegna il tabellone aggiornato senza interrogare il server a intervalli.
   * Chi non l'ha avviata riceve gli aggiornamenti e non può scrivere, e non
   * perché nascondiamo i comandi: sono le policy a rifiutare la scrittura.
   */
  useEffect(() => {
    if (!remoteId) return

    let annullato = false
    void getRemoteMatch(remoteId)
      .then((caricata) => {
        if (!annullato) setRemote(caricata)
      })
      .catch((cause: unknown) => {
        if (!annullato) {
          setRemoteError(cause instanceof Error ? cause.message : 'Partita non raggiungibile.')
        }
      })

    const smetti = watchRemoteMatch(remoteId, (aggiornata) => {
      if (!annullato) setRemote(aggiornata)
    })

    return () => {
      annullato = true
      smetti()
    }
  }, [remoteId])

  // Una partita remota con dati illeggibili non deve far sparire la schermata.
  let remoteState: ReturnType<typeof scoreMatch> | null = null
  if (remote) {
    try {
      remoteState = scoreMatch(remote.match)
    } catch {
      remoteState = null
    }
  }

  const seguendo = remoteId !== null
  const state = remoteState ?? localState
  const teamNames = remote ? remote.match.teamNames : localTeamNames
  const targetScore = remote ? remote.match.rules.targetScore : localTarget
  const puoModificare = !seguendo || remote?.canEdit === true

  const finished = state.status === 'finished'
  const winnerName = state.winner ? teamNames[state.winner] : null

  if (seguendo && !remote) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-3">
          {remoteError ? (
            <>
              <Text className="text-center text-danger text-sm">{remoteError}</Text>
              <Button label="Torna indietro" variant="ghost" onPress={() => router.back()} />
            </>
          ) : (
            <ActivityIndicator />
          )}
        </View>
      </Screen>
    )
  }

  return (
    <Screen
      scroll
      footer={
        <View className="gap-2">
          {!puoModificare ? (
            <View className="rounded-xl bg-sunken px-3 py-3">
              <Text className="text-center text-muted text-sm">
                La sta conducendo chi l'ha avviata. Il tabellone si aggiorna da solo.
              </Text>
            </View>
          ) : finished ? (
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
          <Button label="Torna indietro" variant="ghost" onPress={() => router.back()} />
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
              onPress={puoModificare ? () => router.push(`/hand?index=${index}`) : undefined}
            />
          ))}
        </View>
      )}
    </Screen>
  )
}
