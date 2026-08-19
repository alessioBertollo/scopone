import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native'
import { Standings } from '../../src/components/Standings'
import { useTranslation } from '../../src/i18n/useTranslation'
import { getLeague, type League, type LeagueMember } from '../../src/lib/leagues'
import {
  listLeagueMatches,
  type RemoteMatch,
  summarise,
  toStandingsMatches,
} from '../../src/lib/matches'
import { useLeaguesStore } from '../../src/store/leagues-store'
import { Button } from '../../src/ui/Button'
import { Card } from '../../src/ui/Card'
import { Screen } from '../../src/ui/Screen'

type Dettaglio = { league: League; members: LeagueMember[] }

/**
 * Le due funzioni qui sotto stanno fuori dal componente e non possono usare
 * l'hook: la traduzione gliela passa chi le chiama.
 */
type Traduci = ReturnType<typeof useTranslation>['t']

function messaggio(cause: unknown, t: Traduci): string {
  return cause instanceof Error && cause.message.length > 0 ? cause.message : t('common.error')
}

function ErrorNote({ message }: { message: string }) {
  return (
    <View className="rounded-xl bg-danger/10 px-3 py-2">
      <Text className="text-danger text-sm">{message}</Text>
    </View>
  )
}

function SectionTitle({ children }: { children: string }) {
  return <Text className="mt-2 text-muted text-xs uppercase tracking-widest">{children}</Text>
}

/**
 * Punteggio ed esito di una riga dell'elenco. Il calcolo sta dietro un
 * `try`: le mani sono dati scritti da altri dispositivi, e una partita che
 * questa versione non sa leggere non deve portarsi via l'intera schermata.
 */
function riepilogo(remote: RemoteMatch, t: Traduci): { punteggio: string; esito: string } {
  const { A, B } = remote.match.teamNames

  try {
    const { score, finished, winnerName } = summarise(remote)

    if (remote.status === 'abandoned') {
      return { punteggio: score, esito: t('league.matchAbandoned') }
    }
    if (!finished) return { punteggio: score, esito: t('league.matchOngoing') }

    return {
      punteggio: score,
      esito: winnerName ? t('league.matchWinner', { nome: winnerName }) : t('league.matchTie'),
    }
  } catch {
    return { punteggio: `${A} – ${B}`, esito: t('league.matchUnreadable') }
  }
}

export default function LeagueScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id: string }>()
  const leave = useLeaguesStore((state) => state.leave)
  const remove = useLeaguesStore((state) => state.remove)

  const [dettaglio, setDettaglio] = useState<Dettaglio | null>(null)
  const [matches, setMatches] = useState<RemoteMatch[]>([])
  const [caricamento, setCaricamento] = useState(true)
  const [busy, setBusy] = useState(false)
  // Due errori distinti: uno impedisce di mostrare la lega, l'altro riguarda
  // solo l'elenco delle partite o l'ultimo gesto e convive con la schermata.
  const [erroreLega, setErroreLega] = useState<string | null>(null)
  const [errore, setErrore] = useState<string | null>(null)

  const carica = useCallback(async () => {
    setCaricamento(true)
    setErroreLega(null)
    setErrore(null)

    try {
      setDettaglio(await getLeague(id))
    } catch (cause) {
      setDettaglio(null)
      setErroreLega(messaggio(cause, t))
      setCaricamento(false)
      return
    }

    // Le partite sono un di più: se non arrivano, la lega resta consultabile
    // e il codice di invito — il motivo principale per aprire questa
    // schermata — è comunque sotto gli occhi di chi la guarda.
    try {
      setMatches(await listLeagueMatches(id))
    } catch (cause) {
      setMatches([])
      setErrore(messaggio(cause, t))
    } finally {
      setCaricamento(false)
    }
  }, [id, t])

  useEffect(() => {
    void carica()
  }, [carica])

  const agisci = async (action: () => Promise<void>) => {
    setBusy(true)
    setErrore(null)
    try {
      await action()
      // Uscendo o eliminando questa schermata non ha più niente da mostrare,
      // e la lega non è più fra quelle a cui si può tornare indietro.
      router.replace('/')
    } catch (cause) {
      setErrore(messaggio(cause, t))
    } finally {
      setBusy(false)
    }
  }

  const esci = () => {
    Alert.alert(t('league.leaveTitle'), t('league.leaveBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('league.leaveOk'),
        style: 'destructive',
        onPress: () => void agisci(() => leave(id)),
      },
    ])
  }

  const elimina = () => {
    Alert.alert(t('league.deleteTitle'), t('league.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('league.deleteOk'),
        style: 'destructive',
        onPress: () => void agisci(() => remove(id)),
      },
    ])
  }

  if (caricamento && !dettaglio) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator />
          <Text className="text-muted text-sm">{t('league.loading')}</Text>
        </View>
      </Screen>
    )
  }

  if (!dettaglio) {
    return (
      <Screen
        scroll
        footer={
          <View className="gap-2">
            <Button
              label={t('league.retry')}
              testID="riprova-lega"
              onPress={() => void carica()}
            />
            <Button
              label={t('common.back')}
              variant="ghost"
              testID="torna-indietro-lega"
              onPress={() => router.replace('/')}
            />
          </View>
        }
      >
        <Text className="pt-2 font-bold text-2xl text-ink">{t('league.detailTitle')}</Text>
        <Card title={t('league.loadErrorTitle')}>
          <Text className="text-ink text-sm">{erroreLega ?? t('league.loadErrorBody')}</Text>
        </Card>
      </Screen>
    )
  }

  const { league, members } = dettaglio

  // Il nome per esteso lo conosce solo l'elenco dei partecipanti: la
  // classifica lavora sugli id, che da soli non direbbero niente a nessuno.
  const nomeDi = (profileId: string) =>
    members.find((membro) => membro.profileId === profileId)?.displayName ?? '?'
  const proprietario = league.role === 'owner'

  return (
    <Screen
      scroll
      footer={
        <View className="gap-2">
          <Button
            label={t('league.newMatch')}
            testID="nuova-partita-lega"
            disabled={busy}
            onPress={() => router.push(`/new-match?league=${id}`)}
          />
          {proprietario ? (
            <Button
              label={t('league.delete')}
              variant="danger"
              testID="elimina-lega"
              disabled={busy}
              onPress={elimina}
            />
          ) : (
            <Button
              label={t('league.leave')}
              variant="danger"
              testID="esci-dalla-lega"
              disabled={busy}
              onPress={esci}
            />
          )}
        </View>
      }
    >
      <View className="pt-2">
        <Text className="font-bold text-2xl text-ink">{league.name}</Text>
        <Text className="mt-1 text-muted text-sm">
          {league.memberCount === 1
            ? t('league.onlyYou')
            : t('league.memberCount', { numero: league.memberCount })}
        </Text>
      </View>

      {errore ? <ErrorNote message={errore} /> : null}

      <Card title={t('league.inviteCode')} subtitle={t('league.inviteCodeShare')}>
        {/*
          Il codice si legge a voce agli altri: grande, spaziato e
          selezionabile, così si può anche copiare tenendolo premuto. Manca
          un pulsante «copia» perché `expo-clipboard` non è fra le dipendenze.
        */}
        <Text
          testID="codice-invito"
          selectable
          className="text-center font-bold text-4xl text-felt tracking-[8px]"
        >
          {league.inviteCode}
        </Text>
        <Text className="mt-3 text-center text-muted text-xs">
          {t('league.inviteCodeCopy')}
        </Text>
      </Card>

      <Card title={t('league.members', { numero: members.length })}>
        <View className="gap-3">
          {members.map((membro) => (
            <View
              key={membro.profileId}
              className="flex-row items-center justify-between gap-3"
            >
              <Text numberOfLines={1} className="flex-1 text-base text-ink">
                {membro.displayName}
              </Text>
              <Text className="text-muted text-xs uppercase tracking-widest">
                {membro.role === 'owner' ? t('league.roleOwner') : t('league.rolePlayer')}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <SectionTitle>{t('standings.title')}</SectionTitle>
      <Card>
        <Standings matches={toStandingsMatches(matches)} nameOf={nomeDi} />
      </Card>

      <SectionTitle>{t('league.matches')}</SectionTitle>

      {matches.length === 0 ? (
        <Card>
          <Text className="text-ink text-sm">{t('league.noMatches')}</Text>
          <Text className="mt-1 text-muted text-sm">{t('league.noMatchesHint')}</Text>
        </Card>
      ) : (
        matches.map((remote, indice) => {
          const { punteggio, esito } = riepilogo(remote, t)

          return (
            <Pressable
              key={remote.id}
              // Indice e non id: i flow Maestro puntano alla prima riga, e
              // gli identificatori delle partite cambiano a ogni esecuzione.
              testID={`partita-${indice}`}
              accessibilityRole="button"
              onPress={() => router.push(`/match?remote=${remote.id}`)}
              className="rounded-card border border-line bg-surface p-4 active:opacity-70"
            >
              <Text className="font-semibold text-base text-ink">{punteggio}</Text>
              <Text className="mt-0.5 text-muted text-sm">{esito}</Text>
            </Pressable>
          )
        })
      )}
    </Screen>
  )
}
