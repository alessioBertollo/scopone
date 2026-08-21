import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { Standings } from '../src/components/Standings'
import { useTranslation } from '../src/i18n/useTranslation'
import { getLeague, type LeagueMember } from '../src/lib/leagues'
import { listLeagueMatches, type RemoteMatch, toStandingsMatches } from '../src/lib/matches'
import { isBackendConfigured } from '../src/lib/supabase'
import { useAuthStore } from '../src/store/auth-store'
import { useLeaguesStore } from '../src/store/leagues-store'
import { Button } from '../src/ui/Button'
import { Card } from '../src/ui/Card'
import { Screen } from '../src/ui/Screen'
import { Segmented } from '../src/ui/Segmented'

function ErrorNote({ message }: { message: string }) {
  return (
    <View className="rounded-xl bg-danger/10 px-3 py-2">
      <Text className="text-danger text-sm">{message}</Text>
    </View>
  )
}

/**
 * Classifica di una lega alla volta: mescolare i giocatori di leghe diverse
 * in un'unica tabella li tratterebbe come la stessa persona solo perché
 * condividono un nome, e i punti di squadre mai scese in campo insieme.
 */
export default function StandingsScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const authStatus = useAuthStore((state) => state.status)
  const leagues = useLeaguesStore((state) => state.leagues)
  const refreshLeagues = useLeaguesStore((state) => state.refresh)

  const [selected, setSelected] = useState<string | null>(null)
  const [members, setMembers] = useState<LeagueMember[]>([])
  const [matches, setMatches] = useState<RemoteMatch[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      void refreshLeagues()
    }, [refreshLeagues]),
  )

  // Se la lega scelta prima è sparita dall'elenco (es. si è usciti nel
  // frattempo), si ripiega sulla prima disponibile.
  const leagueId =
    selected && leagues.some((league) => league.id === selected)
      ? selected
      : (leagues[0]?.id ?? null)

  const carica = useCallback(
    async (id: string) => {
      setLoading(true)
      setError(null)
      try {
        const [{ members: elenco }, partite] = await Promise.all([
          getLeague(id),
          listLeagueMatches(id),
        ])
        setMembers(elenco)
        setMatches(partite)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : t('standings.loadFailed'))
        setMembers([])
        setMatches([])
      } finally {
        setLoading(false)
      }
    },
    [t],
  )

  useFocusEffect(
    useCallback(() => {
      if (leagueId) void carica(leagueId)
    }, [leagueId, carica]),
  )

  const nomeDi = (profileId: string) =>
    members.find((membro) => membro.profileId === profileId)?.displayName ?? '?'

  if (!isBackendConfigured) {
    return (
      <Screen scroll tabs>
        <Text className="pt-2 font-bold text-2xl text-ink">{t('standings.title')}</Text>
        <Card>
          <Text className="text-ink text-sm">{t('standings.noBackend')}</Text>
        </Card>
      </Screen>
    )
  }

  if (authStatus !== 'signedIn') {
    const attesa = authStatus === 'unknown'

    return (
      <Screen
        scroll
        tabs
        footer={
          <Button
            label={attesa ? t('standings.wait') : t('standings.signIn')}
            testID="vai-accesso-classifiche"
            disabled={attesa}
            onPress={() => router.push('/sign-in')}
          />
        }
      >
        <Text className="pt-2 font-bold text-2xl text-ink">{t('standings.title')}</Text>
        <Card title={t('standings.needAccount')}>
          <Text className="text-ink text-sm">{t('standings.needAccountBody')}</Text>
          {attesa ? <ActivityIndicator className="mt-3" /> : null}
        </Card>
      </Screen>
    )
  }

  if (leagues.length === 0) {
    return (
      <Screen
        scroll
        tabs
        footer={
          <Button
            label={t('home.createOrJoin')}
            testID="vai-crea-lega-classifiche"
            onPress={() => router.push('/league/new')}
          />
        }
      >
        <Text className="pt-2 font-bold text-2xl text-ink">{t('standings.title')}</Text>
        <Card>
          <Text className="text-ink text-sm">{t('standings.noLeagues')}</Text>
        </Card>
      </Screen>
    )
  }

  return (
    <Screen scroll tabs>
      <Text className="pt-2 font-bold text-2xl text-ink">{t('standings.title')}</Text>

      {leagues.length > 1 ? (
        <Segmented
          testID="classifica-lega"
          options={leagues.map((league) => ({ value: league.id, label: league.name }))}
          value={leagueId ?? ''}
          onChange={setSelected}
        />
      ) : null}

      {error ? <ErrorNote message={error} /> : null}

      <Card>
        {loading && matches.length === 0 ? (
          <View className="items-center py-4">
            <ActivityIndicator />
          </View>
        ) : (
          <Standings matches={toStandingsMatches(matches)} nameOf={nomeDi} />
        )}
      </Card>
    </Screen>
  )
}
