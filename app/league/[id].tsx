import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native'
import { getLeague, type League, type LeagueMember } from '../../src/lib/leagues'
import { listLeagueMatches, type RemoteMatch, summarise } from '../../src/lib/matches'
import { useLeaguesStore } from '../../src/store/leagues-store'
import { Button } from '../../src/ui/Button'
import { Card } from '../../src/ui/Card'
import { Screen } from '../../src/ui/Screen'

type Dettaglio = { league: League; members: LeagueMember[] }

function messaggio(cause: unknown): string {
  return cause instanceof Error && cause.message.length > 0
    ? cause.message
    : 'Qualcosa è andato storto.'
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
function riepilogo(remote: RemoteMatch): { punteggio: string; esito: string } {
  const { A, B } = remote.match.teamNames

  try {
    const { score, finished, winnerName } = summarise(remote)

    if (remote.status === 'abandoned') return { punteggio: score, esito: 'Abbandonata' }
    if (!finished) return { punteggio: score, esito: 'In corso' }

    return {
      punteggio: score,
      esito: winnerName ? `Ha vinto ${winnerName}` : 'Conclusa in parità',
    }
  } catch {
    return { punteggio: `${A} – ${B}`, esito: 'Punteggio non leggibile su questa versione' }
  }
}

export default function LeagueScreen() {
  const router = useRouter()
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
      setErroreLega(messaggio(cause))
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
      setErrore(messaggio(cause))
    } finally {
      setCaricamento(false)
    }
  }, [id])

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
      setErrore(messaggio(cause))
    } finally {
      setBusy(false)
    }
  }

  const esci = () => {
    Alert.alert(
      'Uscire dalla lega?',
      'Per rientrare ti servirà di nuovo il codice di invito.',
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Esci', style: 'destructive', onPress: () => void agisci(() => leave(id)) },
      ],
    )
  }

  const elimina = () => {
    Alert.alert(
      'Eliminare la lega?',
      'Spariscono anche le partite e le iscrizioni di tutti. Non si torna indietro.',
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Elimina', style: 'destructive', onPress: () => void agisci(() => remove(id)) },
      ],
    )
  }

  if (caricamento && !dettaglio) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator />
          <Text className="text-muted text-sm">Carico la lega…</Text>
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
            <Button label="Riprova" testID="riprova-lega" onPress={() => void carica()} />
            <Button
              label="Torna indietro"
              variant="ghost"
              testID="torna-indietro-lega"
              onPress={() => router.replace('/')}
            />
          </View>
        }
      >
        <Text className="pt-2 font-bold text-2xl text-ink">Lega</Text>
        <Card title="Non ci siamo">
          <Text className="text-ink text-sm">
            {erroreLega ?? 'Non è stato possibile caricare la lega. Riprova.'}
          </Text>
        </Card>
      </Screen>
    )
  }

  const { league, members } = dettaglio
  const proprietario = league.role === 'owner'

  return (
    <Screen
      scroll
      footer={
        <View className="gap-2">
          <Button
            label="Nuova partita in questa lega"
            testID="nuova-partita-lega"
            disabled={busy}
            onPress={() => router.push(`/new-match?league=${id}`)}
          />
          {proprietario ? (
            <Button
              label="Elimina la lega"
              variant="danger"
              testID="elimina-lega"
              disabled={busy}
              onPress={elimina}
            />
          ) : (
            <Button
              label="Esci dalla lega"
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
            ? 'Per ora ci sei solo tu'
            : `Siete in ${league.memberCount}`}
        </Text>
      </View>

      {errore ? <ErrorNote message={errore} /> : null}

      <Card title="Codice di invito" subtitle="Dettalo a chi vuoi far entrare nella lega.">
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
          Tienilo premuto per selezionarlo e copiarlo.
        </Text>
      </Card>

      <Card title={`Partecipanti · ${members.length}`}>
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
                {membro.role === 'owner' ? 'Fondatore' : 'Giocatore'}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <SectionTitle>Partite</SectionTitle>

      {matches.length === 0 ? (
        <Card>
          <Text className="text-ink text-sm">Qui non si è ancora giocato niente.</Text>
          <Text className="mt-1 text-muted text-sm">
            Avvia la prima partita: gli altri della lega la vedranno aggiornarsi mentre la
            giocate, senza poterla modificare.
          </Text>
        </Card>
      ) : (
        matches.map((remote, indice) => {
          const { punteggio, esito } = riepilogo(remote)

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
