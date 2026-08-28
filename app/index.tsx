import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { useTranslation } from '../src/i18n/useTranslation'
import {
  acceptLeagueInvite,
  declineLeagueInvite,
  type LeagueInvite,
  listMyLeagueInvites,
} from '../src/lib/leagues'
import { listMyMatches, type RemoteMatch, trySummarise } from '../src/lib/matches'
import { isBackendConfigured } from '../src/lib/supabase'
import { useAuthStore } from '../src/store/auth-store'
import { useMatchState } from '../src/store/hooks'
import { useLeaguesStore } from '../src/store/leagues-store'
import { useMatchStore } from '../src/store/match-store'
import { Avatar } from '../src/ui/Avatar'
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
  const [inviti, setInviti] = useState<LeagueInvite[]>([])
  const [rispondendo, setRispondendo] = useState(false)
  const [erroreInvito, setErroreInvito] = useState<string | null>(null)

  const signedIn = authStatus === 'signedIn' && user !== null

  // Leghe e partite si ricaricano quando cambia chi ha effettuato l'accesso:
  // dopo un login o un'uscita l'elenco precedente non vale più.
  const reload = useCallback(async () => {
    if (!signedIn) {
      setRemote([])
      setInviti([])
      return
    }

    // Gli inviti stanno in un tentativo a parte: se non arrivano, le partite
    // si vedono comunque, e viceversa. Un guasto solo non svuota la home.
    try {
      setInviti(await listMyLeagueInvites())
    } catch {
      setInviti([])
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

  /**
   * La home si rilegge ogni volta che torna in primo piano. Caricarla al solo
   * cambio di accesso la lasciava ferma ai dati del login: si tornava da una
   * partita appena conclusa e l'elenco mostrava ancora zero a zero, e una
   * lega appena creata non compariva.
   */
  useFocusEffect(
    useCallback(() => {
      void refreshLeagues()
      void reload()
    }, [refreshLeagues, reload]),
  )

  /**
   * La divisione si fa sulle mani e non sullo stato memorizzato: lo stato è
   * una comodità per il server, ma le partite create prima che venisse
   * scritto sono tutte marcate «in corso», e finirebbero tutte in cima.
   *
   * Le proprie stanno davanti perché sono le uniche che chi guarda può
   * davvero concludere. L'ordinamento per data che arriva dal server
   * sopravvive dentro i due gruppi, perché `sort` in JavaScript è stabile.
   */
  const { daConcludere, concluse } = useMemo(() => {
    const aperte: RemoteMatch[] = []
    const chiuse: RemoteMatch[] = []

    for (const match of remote) {
      const riepilogo = trySummarise(match)
      if (!riepilogo) continue
      if (riepilogo.finished) chiuse.push(match)
      else aperte.push(match)
    }

    aperte.sort((a, b) => Number(b.canEdit) - Number(a.canEdit))
    return { daConcludere: aperte, concluse: chiuse }
  }, [remote])

  const righe = (matches: RemoteMatch[]) =>
    matches.map((match) => {
      const riepilogo = trySummarise(match)
      if (!riepilogo) return null

      return (
        <RowCard
          key={match.id}
          testID={`partita-${match.id}`}
          title={riepilogo.score}
          accent={!riepilogo.finished && match.canEdit}
          detail={
            riepilogo.finished
              ? t('home.winner', { nome: riepilogo.winnerName ?? t('home.nobody') })
              : match.canEdit
                ? t('home.ongoingYours')
                : t('home.ongoingWatching')
          }
          onPress={() => router.push(`/match?remote=${match.id}`)}
        />
      )
    })

  /**
   * Accettare o rifiutare cambia due elenchi: gli inviti e le leghe. Vanno
   * riletti entrambi, altrimenti la lega appena accettata non compare finché
   * non si esce e si rientra.
   */
  const rispondi = async (azione: () => Promise<void>) => {
    setRispondendo(true)
    setErroreInvito(null)
    try {
      await azione()
      await Promise.all([refreshLeagues(), reload()])
    } catch (cause) {
      setErroreInvito(cause instanceof Error ? cause.message : t('common.error'))
    } finally {
      setRispondendo(false)
    }
  }

  const inCorso = hasStarted && local.status === 'ongoing'
  const punteggioLocale = `${teamNames.A} ${local.totals.A} – ${teamNames.B} ${local.totals.B}`

  return (
    // La barra delle schede compare solo con l'accesso fatto: senza account
    // porta a pagine vuote, e lo spazio che le si riserva sotto va tolto con lei.
    <Screen scroll tabs={signedIn}>
      <View className="flex-row items-start justify-between pt-6 pb-1">
        <View className="flex-1">
          <Text className="font-bold text-4xl text-felt tracking-tight">Scopone</Text>
          <Text className="mt-1 text-base text-muted">{t('app.tagline')}</Text>
        </View>
        <Pressable
          testID="vai-impostazioni"
          accessibilityRole="button"
          accessibilityLabel={t('home.settings')}
          onPress={() => router.push('/settings')}
          className="mt-2 rounded-full border border-line bg-surface px-3 py-2 active:opacity-70"
        >
          <View className="flex-row items-center gap-2">
            {signedIn && user ? <Avatar name={user.avatar} seed={user.id} size={18} /> : null}
            <Text className="text-ink text-sm" numberOfLines={1}>
              {signedIn && user ? user.displayName : t('home.settings')}
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Contare una partita al tavolo è il caso principale: sta in cima e
          non dipende da niente — né da un account né dalla rete. */}
      <SectionTitle>{t('home.play')}</SectionTitle>
      <Button
        label={t('home.newMatch')}
        testID="nuova-partita"
        onPress={() => router.push('/new-match')}
      />

      {inCorso ? (
        <RowCard
          accent
          testID="riprendi-partita"
          title={punteggioLocale}
          detail={t('home.resume', {
            punti: Math.min(local.remaining.A, local.remaining.B),
          })}
          onPress={() => router.push('/match')}
        />
      ) : null}

      {/* Era un collegamento in corpo piccolo, e chi arrivava con un codice in
          mano non lo trovava. Entrare in una partita altrui è un modo d'uso a
          sé, non una nota a margine. */}
      {isBackendConfigured ? (
        <>
          <SectionTitle>{t('home.join')}</SectionTitle>
          <Card>
            <Text className="text-ink text-sm">{t('home.joinPitch')}</Text>
            <View className="mt-4">
              <Button
                label={t('home.joinByCode')}
                variant="secondary"
                testID="vai-ingresso-codice"
                onPress={() => router.push('/join')}
              />
            </View>
          </Card>
        </>
      ) : null}

      {!isBackendConfigured ? (
        <>
          <SectionTitle>{t('home.leagues')}</SectionTitle>
          <Card>
            <Text className="text-muted text-sm">{t('home.noBackend')}</Text>
          </Card>
        </>
      ) : !signedIn ? (
        /* Senza accesso la home finisce qui. Leghe, classifiche e partite
           condivise esistono solo con un account: mostrarle vuote, o mostrarle
           e poi negarle, insegna solo che l'app non funziona. */
        <>
          <SectionTitle>{t('home.account')}</SectionTitle>
          <Card>
            <Text className="text-ink text-sm">{t('home.leaguesPitch')}</Text>
            <View className="mt-4">
              <Button
                label={t('home.signInToStart')}
                testID="vai-accesso"
                onPress={() => router.push('/sign-in')}
              />
            </View>
          </Card>
        </>
      ) : (
        <>
          {inviti.length > 0 ? (
            <>
              <SectionTitle>{t('league.invites')}</SectionTitle>
              {erroreInvito ? (
                <View className="rounded-xl bg-danger/10 px-3 py-2">
                  <Text className="text-danger text-sm">{erroreInvito}</Text>
                </View>
              ) : null}
              <View className="gap-2">
                {inviti.map((invito) => (
                  <Card
                    key={invito.leagueId}
                    title={invito.leagueName}
                    subtitle={t('league.invitedBy', { nome: invito.invitedByName })}
                  >
                    <View className="mt-3 flex-row gap-2">
                      <View className="flex-1">
                        <Button
                          label={t('league.acceptInvite')}
                          testID={`accetta-invito-${invito.leagueId}`}
                          disabled={rispondendo}
                          onPress={() =>
                            void rispondi(() => acceptLeagueInvite(invito.leagueId))
                          }
                        />
                      </View>
                      <View className="flex-1">
                        <Button
                          label={t('league.declineInvite')}
                          variant="ghost"
                          testID={`rifiuta-invito-${invito.leagueId}`}
                          disabled={rispondendo}
                          onPress={() =>
                            void rispondi(() => declineLeagueInvite(invito.leagueId))
                          }
                        />
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            </>
          ) : null}

          <SectionTitle>{t('home.leagues')}</SectionTitle>
          {leaguesStatus === 'loading' ? (
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
                    league.memberCount === 1
                      ? 'home.leagueOnePlayer'
                      : 'home.leagueManyPlayers',
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

          {daConcludere.length > 0 ? (
            <>
              <SectionTitle>{t('home.toFinish')}</SectionTitle>
              <View className="gap-2">{righe(daConcludere)}</View>
            </>
          ) : null}

          <SectionTitle>{t('home.recent')}</SectionTitle>
          {loadingRemote ? (
            <Card>
              <ActivityIndicator />
            </Card>
          ) : concluse.length > 0 ? (
            <View className="gap-2">{righe(concluse)}</View>
          ) : (
            <Card>
              <Text className="text-muted text-sm">{t('home.noMatchesSignedIn')}</Text>
            </Card>
          )}
        </>
      )}
    </Screen>
  )
}
