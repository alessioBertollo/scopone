import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'
import { DEFAULT_RULES, type PrimieraMode, type WinRule } from '../src/domain/rules'
import { useTranslation } from '../src/i18n/useTranslation'
import { getLeague, type LeagueMember } from '../src/lib/leagues'
import { createRemoteMatch, type MatchLineup } from '../src/lib/matches'
import { useAuthStore } from '../src/store/auth-store'
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

    return () => {
      annullato = true
    }
  }, [leagueId, me])

  const [nameA, setNameA] = useState('')
  const [nameB, setNameB] = useState('')
  const [target, setTarget] = useState<TargetValue>('21')
  const [winRule, setWinRule] = useState<WinRule>('reach')
  const [primiera, setPrimiera] = useState<YesNo>('si')
  const [primieraMode, setPrimieraMode] = useState<PrimieraMode>('manual')
  const [napola, setNapola] = useState<YesNo>('no')
  const [donna, setDonna] = useState<YesNo>('no')

  const schierati = (team: TeamSlot) =>
    (members ?? []).filter((member) => lineup[member.profileId] === team)

  /** Con i giocatori scelti il nome di squadra diventa superfluo: si deduce. */
  const nomeDaGiocatori = (team: TeamSlot) => {
    const nomi = schierati(team).map((member) => member.displayName)
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
        const created = await createRemoteMatch({
          leagueId,
          rules,
          teamNames: teams,
          // Chi avvia gioca: è il minimo che serve alle classifiche per
          // giocatore. Schierare gli altri arriverà con la formazione vera.
          lineup: Object.entries(lineup)
            .filter((voce): voce is [string, 'A' | 'B'] => voce[1] !== 'none')
            .map(([profileId, team]): MatchLineup => ({ profileId, team })),
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
              {members.map((member) => (
                <View key={member.profileId}>
                  <Text className="mb-1.5 text-ink text-sm" numberOfLines={1}>
                    {member.profileId === me?.id
                      ? t('lineup.you', { nome: member.displayName })
                      : member.displayName}
                  </Text>
                  <Segmented
                    testID={`formazione-${member.profileId}`}
                    options={[
                      { value: 'A' as const, label: teams.A, tone: 'a' as const },
                      {
                        value: 'none' as const,
                        label: t('lineup.out'),
                        tone: 'neutral' as const,
                      },
                      { value: 'B' as const, label: teams.B, tone: 'b' as const },
                    ]}
                    value={lineup[member.profileId] ?? 'none'}
                    onChange={(scelta) =>
                      setLineup((corrente) => ({ ...corrente, [member.profileId]: scelta }))
                    }
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
