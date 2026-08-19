import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { useTranslation } from '../src/i18n/useTranslation'
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
  const { t } = useTranslation()

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
          label={t('home.newMatch')}
          testID="nuova-partita"
          onPress={() => router.push('/new-match')}
        />
      }
    >
      <View className="flex-row items-start justify-between pt-6 pb-1">
        <View className="flex-1">
          <Text className="font-bold text-4xl text-felt tracking-tight">Scopone</Text>
          <Text className="mt-1 text-base text-muted">{t('app.tagline')}</Text>
        </View>
        {
          <Pressable
            testID="vai-impostazioni"
            accessibilityRole="button"
            accessibilityLabel={t('home.settings')}
            onPress={() => router.push('/settings')}
            className="mt-2 rounded-full border border-line bg-surface px-3 py-2 active:opacity-70"
          >
            <Text className="text-ink text-sm" numberOfLines={1}>
              {signedIn && user ? user.displayName : t('home.settings')}
            </Text>
          </Pressable>
        }
      </View>

      {inCorso ? (
        <>
          <SectionTitle>{t('home.pending')}</SectionTitle>
          <RowCard
            accent
            testID="riprendi-partita"
            title={punteggioLocale}
            detail={t('home.resume', {
              punti: Math.min(local.remaining.A, local.remaining.B),
            })}
            onPress={() => router.push('/match')}
          />
        </>
      ) : null}

      <SectionTitle>{t('home.leagues')}</SectionTitle>
      {!isBackendConfigured ? (
        <Card>
          <Text className="text-muted text-sm">{t('home.noBackend')}</Text>
        </Card>
      ) : !signedIn ? (
        <Card>
          <Text className="text-ink text-sm">{t('home.leaguesPitch')}</Text>
          <View className="mt-4">
            <Button
              label={t('home.signInToStart')}
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
          <Text className="text-ink text-sm">{t('home.noLeagues')}</Text>
          <View className="mt-4">
            <Button
              label={t('home.createOrJoin')}
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
              detail={t(
                league.memberCount === 1 ? 'home.leagueOnePlayer' : 'home.leagueManyPlayers',
                { numero: league.memberCount, codice: league.inviteCode },
              )}
              onPress={() => router.push(`/league/${league.id}`)}
            />
          ))}
          <Button
            label={t('home.createOrJoin')}
            variant="ghost"
            testID="crea-lega"
            onPress={() => router.push('/league/new')}
          />
        </View>
      )}

      <SectionTitle>{t('home.recent')}</SectionTitle>
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
                    ? t('home.winner', {
                        nome: riepilogo.winnerName ?? t('home.nobody'),
                      })
                    : match.canEdit
                      ? t('home.ongoingYours')
                      : t('home.ongoingWatching')
                }
                onPress={() => router.push(`/match?remote=${match.id}`)}
              />
            )
          })}
        </View>
      ) : (
        <Card>
          <Text className="text-muted text-sm">
            {signedIn ? t('home.noMatchesSignedIn') : t('home.noMatchesSignedOut')}
          </Text>
        </Card>
      )}
    </Screen>
  )
}
