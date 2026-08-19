import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { listMyMatches, type RemoteMatch, summarise } from '../src/lib/matches'
import { isBackendConfigured } from '../src/lib/supabase'
import { useAuthStore } from '../src/store/auth-store'
import { useMatchState } from '../src/store/hooks'
import { useLeaguesStore } from '../src/store/leagues-store'
import { useMatchStore } from '../src/store/match-store'
import { Button } from '../src/ui/Button'
import { Card } from '../src/ui/Card'
import { cn } from '../src/ui/cn'
import { Screen } from '../src/ui/Screen'

function SectionTitle({ children }: { children: string }) {
  return <Text className="mt-2 text-muted text-xs uppercase tracking-widest">{children}</Text>
}

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
  const local = useMatchState()

  const user = useAuthStore((state) => state.user)
  const authStatus = useAuthStore((state) => state.status)
  const leagues = useLeaguesStore((state) => state.leagues)
  const leaguesStatus = useLeaguesStore((state) => state.status)
  const refreshLeagues = useLeaguesStore((state) => state.refresh)

  const [remote, setRemote] = useState<RemoteMatch[]>([])
  const [loadingRemote, setLoadingRemote] = useState(false)

  const signedIn = authStatus === 'signedIn' && user !== null

  // Leghe e partite si ricaricano quando cambia chi ha effettuato l'accesso:
  // dopo un login o un'uscita l'elenco precedente non vale più.
  const reload = useCallback(async () => {
    if (!signedIn) {
      setRemote([])
      return
    }
    setLoadingRemote(true)
    try {
      setRemote(await listMyMatches(10))
    } catch {
      // Un elenco che non si carica non deve impedire di giocare: la partita
      // locale resta a portata di mano anche senza rete.
      setRemote([])
    } finally {
      setLoadingRemote(false)
    }
  }, [signedIn])

  useEffect(() => {
    void refreshLeagues()
    void reload()
  }, [refreshLeagues, reload])

  const inCorso = hasStarted && local.status === 'ongoing'
  const punteggioLocale = `${teamNames.A} ${local.totals.A} – ${teamNames.B} ${local.totals.B}`

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
      <View className="flex-row items-start justify-between pt-6 pb-1">
        <View className="flex-1">
          <Text className="font-bold text-4xl text-felt tracking-tight">Scopone</Text>
          <Text className="mt-1 text-base text-muted">
            Il conto dei punti, primiera compresa.
          </Text>
        </View>
        {isBackendConfigured ? (
          <Pressable
            testID="vai-account"
            accessibilityRole="button"
            accessibilityLabel="Account"
            onPress={() => router.push(signedIn ? '/account' : '/sign-in')}
            className="mt-2 rounded-full border border-line bg-surface px-3 py-2 active:opacity-70"
          >
            <Text className="text-ink text-sm" numberOfLines={1}>
              {signedIn && user ? user.displayName : 'Accedi'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {inCorso ? (
        <>
          <SectionTitle>Partita in sospeso</SectionTitle>
          <RowCard
            accent
            testID="riprendi-partita"
            title={punteggioLocale}
            detail={`Mancano ${Math.min(local.remaining.A, local.remaining.B)} punti · riprendi da dove eravate`}
            onPress={() => router.push('/match')}
          />
        </>
      ) : null}

      <SectionTitle>Le tue leghe</SectionTitle>
      {!isBackendConfigured ? (
        <Card>
          <Text className="text-muted text-sm">
            Questa copia dell'app non è collegata a nessun server: le leghe non sono
            disponibili, ma le partite in solitaria funzionano.
          </Text>
        </Card>
      ) : !signedIn ? (
        <Card>
          <Text className="text-ink text-sm">
            Una lega tiene insieme un gruppo di giocatori: le partite restano in comune e
            chiunque può seguirle mentre si giocano.
          </Text>
          <View className="mt-4">
            <Button
              label="Accedi per iniziare"
              variant="secondary"
              testID="vai-accesso"
              onPress={() => router.push('/sign-in')}
            />
          </View>
        </Card>
      ) : leaguesStatus === 'loading' ? (
        <Card>
          <ActivityIndicator />
        </Card>
      ) : leagues.length === 0 ? (
        <Card>
          <Text className="text-ink text-sm">Non fai ancora parte di nessuna lega.</Text>
          <View className="mt-4">
            <Button
              label="Crea una lega o entra con un codice"
              variant="secondary"
              testID="crea-lega"
              onPress={() => router.push('/league/new')}
            />
          </View>
        </Card>
      ) : (
        <View className="gap-2">
          {leagues.map((league) => (
            <RowCard
              key={league.id}
              testID={`lega-${league.id}`}
              title={league.name}
              detail={`${league.memberCount} ${league.memberCount === 1 ? 'giocatore' : 'giocatori'} · codice ${league.inviteCode}`}
              onPress={() => router.push(`/league/${league.id}`)}
            />
          ))}
          <Button
            label="Crea una lega o entra con un codice"
            variant="ghost"
            testID="crea-lega"
            onPress={() => router.push('/league/new')}
          />
        </View>
      )}

      <SectionTitle>Partite recenti</SectionTitle>
      {loadingRemote ? (
        <Card>
          <ActivityIndicator />
        </Card>
      ) : remote.length > 0 ? (
        <View className="gap-2">
          {remote.map((match) => {
            const riepilogo = summarise(match)
            return (
              <RowCard
                key={match.id}
                testID={`partita-${match.id}`}
                title={riepilogo.score}
                detail={
                  riepilogo.finished
                    ? `Ha vinto ${riepilogo.winnerName ?? 'nessuno'}`
                    : match.canEdit
                      ? 'In corso · la stai conducendo tu'
                      : 'In corso · la stai seguendo'
                }
                onPress={() => router.push(`/match?remote=${match.id}`)}
              />
            )
          })}
        </View>
      ) : (
        <Card>
          <Text className="text-muted text-sm">
            {signedIn
              ? 'Nessuna partita ancora. Quelle che giocherai in lega compariranno qui.'
              : 'Le partite giocate in lega compariranno qui. Al momento l’app tiene solo quella in corso sul telefono.'}
          </Text>
        </Card>
      )}
    </Screen>
  )
}
