import { useRouter } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { useMatchState } from '../src/store/hooks'
import { useMatchStore } from '../src/store/match-store'
import { Button } from '../src/ui/Button'
import { Card } from '../src/ui/Card'
import { cn } from '../src/ui/cn'
import { Screen } from '../src/ui/Screen'

function SectionTitle({ children }: { children: string }) {
  return <Text className="mt-2 text-muted text-xs uppercase tracking-widest">{children}</Text>
}

/** Riga cliccabile con un titolo e una riga di dettaglio. */
function RowCard({
  title,
  detail,
  onPress,
  testID,
  accent,
}: {
  title: string
  detail: string
  onPress: () => void
  testID: string
  accent?: boolean
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        'rounded-card border p-4 active:opacity-70',
        accent ? 'border-felt bg-felt/10' : 'border-line bg-surface',
      )}
    >
      <Text className="font-semibold text-base text-ink">{title}</Text>
      <Text className="mt-0.5 text-muted text-sm">{detail}</Text>
    </Pressable>
  )
}

export default function HomeScreen() {
  const router = useRouter()
  const hasStarted = useMatchStore((state) => state.hasStarted)
  const teamNames = useMatchStore((state) => state.match.teamNames)
  const state = useMatchState()

  const inCorso = hasStarted && state.status === 'ongoing'
  const conclusa = hasStarted && state.status === 'finished'
  const punteggio = `${teamNames.A} ${state.totals.A} – ${teamNames.B} ${state.totals.B}`

  return (
    <Screen
      scroll
      footer={
        <Button
          label="Nuova partita"
          testID="nuova-partita"
          onPress={() => router.push('/new-match')}
        />
      }
    >
      <View className="pt-6 pb-1">
        <Text className="font-bold text-4xl text-felt tracking-tight">Scopone</Text>
        <Text className="mt-1 text-base text-muted">
          Il conto dei punti, primiera compresa.
        </Text>
      </View>

      {inCorso ? (
        <>
          <SectionTitle>Partita in sospeso</SectionTitle>
          <RowCard
            accent
            testID="riprendi-partita"
            title={punteggio}
            detail={`Mancano ${Math.min(state.remaining.A, state.remaining.B)} punti · riprendi da dove eravate`}
            onPress={() => router.push('/match')}
          />
        </>
      ) : null}

      <SectionTitle>Le tue leghe</SectionTitle>
      <Card>
        <Text className="text-ink text-sm">Non fai ancora parte di nessuna lega.</Text>
        <Text className="mt-1 text-muted text-sm">
          Una lega tiene insieme un gruppo di giocatori: le partite restano in comune e chiunque
          può seguirle mentre si giocano.
        </Text>
        <View className="mt-4 gap-2">
          <Button
            label="Crea una lega"
            variant="secondary"
            testID="crea-lega"
            onPress={() => router.push('/league/new')}
          />
          <Button
            label="Accedi per iniziare"
            variant="ghost"
            testID="vai-accesso"
            onPress={() => router.push('/sign-in')}
          />
        </View>
      </Card>

      <SectionTitle>Partite recenti</SectionTitle>
      {conclusa ? (
        <RowCard
          testID="ultima-partita"
          title={punteggio}
          detail={state.winner ? `Ha vinto ${teamNames[state.winner]}` : 'Conclusa'}
          onPress={() => router.push('/match')}
        />
      ) : (
        <Card>
          <Text className="text-muted text-sm">
            Qui compariranno le partite giocate. Al momento l'app ne tiene una sola: lo storico
            arriva insieme alle leghe.
          </Text>
        </Card>
      )}
    </Screen>
  )
}
