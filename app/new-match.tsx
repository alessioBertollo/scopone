import * as Linking from 'expo-linking'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, Share, Text, TextInput, View } from 'react-native'
import { DEFAULT_RULES, type PrimieraMode, type WinRule } from '../src/domain/rules'
import { useTranslation } from '../src/i18n/useTranslation'
import { getLeague, type LeagueMember } from '../src/lib/leagues'
import { generateLobbyCode, hostLobby } from '../src/lib/lobby'
import { createRemoteMatch, type MatchLineup } from '../src/lib/matches'
import { useAuthStore } from '../src/store/auth-store'
import { useFriendsStore } from '../src/store/friends-store'
import { useLeaguesStore } from '../src/store/leagues-store'
import { useMatchStore } from '../src/store/match-store'
import { Button } from '../src/ui/Button'
import { Card } from '../src/ui/Card'
import { cn } from '../src/ui/cn'
import { Screen } from '../src/ui/Screen'
import { Segmented } from '../src/ui/Segmented'
import { suggestTeamNames } from '../src/ui/team-names'

const PLACEHOLDER_COLOR = '#8A8580'

// Solo i valori: le etichette si costruiscono dentro il componente, dove
// c'è la traduzione. Una costante di modulo si valuterebbe all'import, e
// cambiare lingua non la aggiornerebbe più.
type TargetValue = '11' | '21'
type TeamSlot = 'A' | 'B' | 'none'
type YesNo = 'no' | 'si'

function NameField({
  label,
  placeholder,
  value,
  onChange,
  tone,
  testID,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  tone: 'a' | 'b'
  testID: string
}) {
  return (
    <View className="flex-1">
      <Text
        className={cn(
          'font-semibold text-xs uppercase tracking-widest',
          tone === 'a' ? 'text-team-a' : 'text-team-b',
        )}
      >
        {label}
      </Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChange}
        maxLength={16}
        autoCorrect={false}
        placeholder={placeholder}
        placeholderTextColor={PLACEHOLDER_COLOR}
        className="mt-1.5 rounded-xl bg-sunken px-4 py-3 text-base text-ink"
      />
    </View>
  )
}

export default function NewMatchScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const params = useLocalSearchParams<{ league?: string }>()
  const leagueId = params.league ?? null
  const league = useLeaguesStore((state) =>
    state.leagues.find((candidate) => candidate.id === leagueId),
  )
  const me = useAuthStore((state) => state.user)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const startMatch = useMatchStore((state) => state.startMatch)

  // Suggeriti una volta per apertura della schermata: se cambiassero a ogni
  // battitura, il segnaposto ballerebbe sotto le dita dell'utente.
  const [suggested] = useState(suggestTeamNames)

  // Formazione: chi gioca e in che squadra. Solo dentro una lega, perché
  // fuori non ci sono giocatori registrati da schierare.
  const [members, setMembers] = useState<LeagueMember[] | null>(null)
  const [lineup, setLineup] = useState<Record<string, TeamSlot>>({})

  // Gli amici accettati si schierano insieme ai soci di lega: spesso si
  // gioca con le stesse persone senza che siano (ancora) nella stessa lega.
  const friends = useFriendsStore((state) => state.friends)
  const refreshFriends = useFriendsStore((state) => state.refresh)

  useEffect(() => {
    if (!leagueId) return

    let annullato = false
    void getLeague(leagueId)
      .then(({ members: elenco }) => {
        if (annullato) return
        setMembers(elenco)
        // Chi avvia la partita gioca quasi sempre: parte già schierato, e
        // se non è vero basta toglierlo.
        setLineup(me ? { [me.id]: 'A' } : {})
      })
      .catch(() => {
        // Senza elenco si gioca lo stesso, con i nomi liberi: meglio una
        // partita senza classifica che nessuna partita.
        if (!annullato) setMembers([])
      })
    void refreshFriends()

    return () => {
      annullato = true
    }
  }, [leagueId, me, refreshFriends])

  /**
   * Soci di lega e amici accettati, in un solo elenco: chi è già socio non
   * compare due volte come amico, la formazione lo tratta comunque come
   * un'unica persona.
   */
  const roster = useMemo(() => {
    const elenco: { profileId: string; displayName: string; friend: boolean }[] = (
      members ?? []
    ).map((member) => ({ ...member, friend: false }))
    const noti = new Set(elenco.map((persona) => persona.profileId))

    for (const amico of friends) {
      if (amico.status !== 'accepted' || noti.has(amico.profileId)) continue
      elenco.push({ profileId: amico.profileId, displayName: amico.displayName, friend: true })
      noti.add(amico.profileId)
    }

    return elenco
  }, [members, friends])

  // Tavolo per chi entra da link o codice, senza dover essere socio della
  // lega né amico: un ospite senza account. Effimero, vive solo mentre
  // questa schermata è aperta.
  const [lobbyCode, setLobbyCode] = useState<string | null>(null)
  const [guests, setGuests] = useState<
    Record<string, { name: string; profileId: string | null; team: TeamSlot }>
  >({})
  const host = useRef<ReturnType<typeof hostLobby> | null>(null)

  useEffect(() => {
    return () => host.current?.close()
  }, [])

  const condividiTavolo = () => {
    if (lobbyCode) return
    const code = generateLobbyCode()
    setLobbyCode(code)
    host.current = hostLobby(code, (request) => {
      setGuests((corrente) => ({
        ...corrente,
        [request.id]: { name: request.name, profileId: request.profileId, team: 'none' },
      }))
    })
  }

  const piazzaOspite = (requestId: string, scelta: TeamSlot) => {
    setGuests((corrente) => {
      const attuale = corrente[requestId]
      if (!attuale) return corrente
      return { ...corrente, [requestId]: { ...attuale, team: scelta } }
    })
    host.current?.place(requestId, scelta === 'none' ? null : scelta)
  }

  const condividiCodice = () => {
    if (!lobbyCode) return
    const link = Linking.createURL(`/join/${lobbyCode}`)
    void Share.share({
      message: t('lobby.shareMessage', { lega: league?.name ?? '', codice: lobbyCode, link }),
    })
  }

  const [nameA, setNameA] = useState('')
  const [nameB, setNameB] = useState('')
  const [target, setTarget] = useState<TargetValue>('21')
  const [winRule, setWinRule] = useState<WinRule>('reach')
  const [primiera, setPrimiera] = useState<YesNo>('si')
  const [primieraMode, setPrimieraMode] = useState<PrimieraMode>('manual')
  const [napola, setNapola] = useState<YesNo>('no')
  const [donna, setDonna] = useState<YesNo>('no')

  /** Nomi di chi è schierato in una squadra: soci, amici e ospiti insieme. */
  const schierati = (team: TeamSlot) => [
    ...roster.filter((persona) => lineup[persona.profileId] === team).map((p) => p.displayName),
    ...Object.values(guests)
      .filter((guest) => guest.team === team)
      .map((guest) => guest.name),
  ]

  /** Con i giocatori scelti il nome di squadra diventa superfluo: si deduce. */
  const nomeDaGiocatori = (team: TeamSlot) => {
    const nomi = schierati(team)
    return nomi.length > 0 ? nomi.join(' e ') : ''
  }

  const teams = {
    A: nameA.trim() || nomeDaGiocatori('A') || suggested.A,
    B: nameB.trim() || nomeDaGiocatori('B') || suggested.B,
  }

  const formazioneCompleta =
    leagueId === null || (schierati('A').length > 0 && schierati('B').length > 0)
  const rules = {
    ...DEFAULT_RULES,
    targetScore: Number(target),
    winRule,
    primieraEnabled: primiera === 'si',
    primieraMode,
    napolaEnabled: napola === 'si',
    donnaEnabled: donna === 'si',
  }

  /**
   * Fuori da una lega la partita resta sul telefono e non serve nemmeno la
   * rete. Dentro una lega nasce sul server, altrimenti gli altri non
   * potrebbero seguirla: è l'unico caso in cui la creazione può fallire.
   */
  const start = () => {
    if (!leagueId) {
      startMatch(teams, rules)
      router.push('/match')
      return
    }

    setBusy(true)
    setError(null)
    void (async () => {
      try {
        const soci = Object.entries(lineup)
          .filter((voce): voce is [string, 'A' | 'B'] => voce[1] !== 'none')
          .map(([profileId, team]): MatchLineup => ({ kind: 'member', profileId, team }))

        // Un ospite che ha effettuato l'accesso mentre entrava dal tavolo
        // conta come socio a tutti gli effetti; chi ha già una riga fra i
        // soci non va duplicato, capita se accede con lo stesso account già
        // schierato sopra.
        const ospiti = Object.values(guests).flatMap((guest): MatchLineup[] => {
          if (guest.team === 'none') return []
          if (guest.profileId && lineup[guest.profileId] !== undefined) return []
          return guest.profileId
            ? [{ kind: 'member', profileId: guest.profileId, team: guest.team }]
            : [{ kind: 'guest', guestName: guest.name, team: guest.team }]
        })

        const created = await createRemoteMatch({
          leagueId,
          rules,
          teamNames: teams,
          lineup: [...soci, ...ospiti],
        })
        router.replace(`/match?remote=${created.id}`)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : t('common.error'))
      } finally {
        setBusy(false)
      }
    })()
  }

  const targets: { value: TargetValue; label: string }[] = [
    { value: '11', label: t('newMatch.target11') },
    { value: '21', label: t('newMatch.target21') },
  ]

  const yesNo: { value: YesNo; label: string }[] = [
    { value: 'no', label: t('common.no') },
    { value: 'si', label: t('common.yes') },
  ]

  const winRules: { value: WinRule; label: string }[] = [
    { value: 'reach', label: t('newMatch.reach') },
    { value: 'exceed', label: t('newMatch.exceed') },
  ]

  const primieraModes: { value: PrimieraMode; label: string }[] = [
    { value: 'manual', label: t('newMatch.primieraManual') },
    { value: 'cards', label: t('newMatch.primieraCards') },
  ]

  return (
    <Screen
      scroll
      footer={
        <Button
          label={busy ? t('newMatch.creating') : t('newMatch.start')}
          onPress={start}
          disabled={busy || !formazioneCompleta}
          testID="inizia-partita"
        />
      }
    >
      <View className="flex-row items-center justify-between pt-2">
        <Text className="font-bold text-2xl text-ink">{t('newMatch.title')}</Text>
        <Pressable
          testID="annulla-nuova-partita"
          accessibilityRole="button"
          onPress={() => router.back()}
          className="px-2 py-1 active:opacity-60"
        >
          <Text className="text-base text-muted">{t('common.cancel')}</Text>
        </Pressable>
      </View>

      {league ? (
        <View className="rounded-xl bg-felt/10 px-3 py-2">
          <Text className="text-felt text-sm">
            {t('newMatch.inLeague', { lega: league.name })}
          </Text>
        </View>
      ) : null}

      {error ? (
        <View className="rounded-xl bg-danger/10 px-3 py-2">
          <Text className="text-danger text-sm">{error}</Text>
        </View>
      ) : null}

      {leagueId ? (
        <Card title={t('lineup.title')} subtitle={t('lineup.hint')}>
          {members === null ? (
            <ActivityIndicator />
          ) : (
            <View className="gap-3">
              {roster.map((persona) => (
                <View key={persona.profileId}>
                  <Text className="mb-1.5 text-ink text-sm" numberOfLines={1}>
                    {persona.profileId === me?.id
                      ? t('lineup.you', { nome: persona.displayName })
                      : persona.friend
                        ? t('lineup.friend', { nome: persona.displayName })
                        : persona.displayName}
                  </Text>
                  <Segmented
                    testID={`formazione-${persona.profileId}`}
                    options={[
                      { value: 'A' as const, label: teams.A, tone: 'a' as const },
                      {
                        value: 'none' as const,
                        label: t('lineup.out'),
                        tone: 'neutral' as const,
                      },
                      { value: 'B' as const, label: teams.B, tone: 'b' as const },
                    ]}
                    value={lineup[persona.profileId] ?? 'none'}
                    onChange={(scelta) =>
                      setLineup((corrente) => ({ ...corrente, [persona.profileId]: scelta }))
                    }
                  />
                </View>
              ))}
              {Object.entries(guests).map(([requestId, guest]) => (
                <View key={requestId}>
                  <Text className="mb-1.5 text-ink text-sm" numberOfLines={1}>
                    {t('lobby.guestLabel', { nome: guest.name })}
                  </Text>
                  <Segmented
                    testID={`formazione-ospite-${requestId}`}
                    options={[
                      { value: 'A' as const, label: teams.A, tone: 'a' as const },
                      {
                        value: 'none' as const,
                        label: t('lineup.out'),
                        tone: 'neutral' as const,
                      },
                      { value: 'B' as const, label: teams.B, tone: 'b' as const },
                    ]}
                    value={guest.team}
                    onChange={(scelta) => piazzaOspite(requestId, scelta)}
                  />
                </View>
              ))}
              {!formazioneCompleta ? (
                <Text className="text-danger text-xs">{t('lineup.needBothTeams')}</Text>
              ) : (
                <Text className="text-muted text-xs">{t('lineup.teamNamesFromPlayers')}</Text>
              )}
            </View>
          )}
        </Card>
      ) : null}

      {leagueId ? (
        <Card title={t('lobby.title')} subtitle={t('lobby.hint')}>
          {lobbyCode ? (
            <View className="gap-3">
              <Text
                testID="codice-tavolo"
                className="text-center font-bold text-2xl text-ink tracking-[6px]"
              >
                {t('lobby.code', { codice: lobbyCode })}
              </Text>
              <Button
                label={t('lobby.share')}
                variant="secondary"
                testID="condividi-tavolo"
                onPress={condividiCodice}
              />
              {Object.keys(guests).length === 0 ? (
                <Text className="text-muted text-xs">{t('lobby.empty')}</Text>
              ) : null}
            </View>
          ) : (
            <Button
              label={t('lobby.start')}
              variant="secondary"
              testID="genera-codice-tavolo"
              onPress={condividiTavolo}
            />
          )}
        </Card>
      ) : null}

      <Card title={t('newMatch.teams')} subtitle={t('newMatch.teamsHint')}>
        <View className="flex-row gap-3">
          <NameField
            label={t('newMatch.teamA')}
            placeholder={nomeDaGiocatori('A') || suggested.A}
            value={nameA}
            onChange={setNameA}
            tone="a"
            testID="nome-squadra-a"
          />
          <NameField
            label={t('newMatch.teamB')}
            placeholder={nomeDaGiocatori('B') || suggested.B}
            value={nameB}
            onChange={setNameB}
            tone="b"
            testID="nome-squadra-b"
          />
        </View>
      </Card>

      <Card title={t('newMatch.target')} subtitle={t('newMatch.targetHint')}>
        <View className="gap-4">
          <Segmented options={targets} value={target} onChange={setTarget} testID="traguardo" />
          <View>
            <Text className="mb-2 text-ink text-sm">{t('newMatch.winRule')}</Text>
            <Segmented
              options={winRules}
              value={winRule}
              onChange={setWinRule}
              testID="regola-vittoria"
            />
            <Text className="mt-1.5 text-muted text-xs">
              {winRule === 'reach'
                ? t('newMatch.reachHint', { punti: target })
                : t('newMatch.exceedHint', {
                    punti: target,
                    minimo: Number(target) + 1,
                  })}
            </Text>
          </View>
        </View>
      </Card>

      <Card title={t('newMatch.variants')} subtitle={t('newMatch.variantsHint')}>
        <View className="gap-4">
          <View>
            <Text className="mb-2 text-ink text-sm">{t('newMatch.primiera')}</Text>
            <Segmented
              options={yesNo}
              value={primiera}
              onChange={setPrimiera}
              testID="primiera-attiva"
            />
            {primiera === 'no' ? (
              <Text className="mt-1.5 text-muted text-xs">{t('newMatch.primieraOffHint')}</Text>
            ) : (
              <View className="mt-3">
                <Text className="mb-2 text-ink text-sm">{t('newMatch.primieraMode')}</Text>
                <Segmented
                  options={primieraModes}
                  value={primieraMode}
                  onChange={setPrimieraMode}
                  testID="primiera-modo"
                />
                <Text className="mt-1.5 text-muted text-xs">
                  {primieraMode === 'manual'
                    ? t('newMatch.primieraManualHint')
                    : t('newMatch.primieraCardsHint')}
                </Text>
              </View>
            )}
          </View>
          <View>
            <Text className="mb-2 text-ink text-sm">{t('newMatch.napola')}</Text>
            <Segmented options={yesNo} value={napola} onChange={setNapola} testID="napola" />
            <Text className="mt-1.5 text-muted text-xs">{t('newMatch.napolaHint')}</Text>
          </View>
          <View>
            <Text className="mb-2 text-ink text-sm">{t('newMatch.donna')}</Text>
            <Segmented options={yesNo} value={donna} onChange={setDonna} testID="donna" />
          </View>
        </View>
      </Card>
    </Screen>
  )
}
