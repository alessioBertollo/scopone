import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { DEFAULT_RULES, type PrimieraMode, type WinRule } from '../src/domain/rules'
import { createRemoteMatch } from '../src/lib/matches'
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

const TARGETS = [
  { value: '11', label: '11 punti' },
  { value: '21', label: '21 punti' },
] as const

type TargetValue = (typeof TARGETS)[number]['value']

const PRIMIERA_MODES: { value: PrimieraMode; label: string }[] = [
  { value: 'manual', label: 'La sappiamo noi' },
  { value: 'cards', label: "La calcola l'app" },
]

const YES_NO = [
  { value: 'no', label: 'No' },
  { value: 'si', label: 'Sì' },
] as const

type YesNo = (typeof YES_NO)[number]['value']

const WIN_RULES: { value: WinRule; label: string }[] = [
  { value: 'reach', label: 'Raggiungerlo' },
  { value: 'exceed', label: 'Superarlo' },
]

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

  const [nameA, setNameA] = useState('')
  const [nameB, setNameB] = useState('')
  const [target, setTarget] = useState<TargetValue>('21')
  const [winRule, setWinRule] = useState<WinRule>('reach')
  const [primiera, setPrimiera] = useState<YesNo>('si')
  const [primieraMode, setPrimieraMode] = useState<PrimieraMode>('manual')
  const [napola, setNapola] = useState<YesNo>('no')
  const [donna, setDonna] = useState<YesNo>('no')

  const teams = { A: nameA.trim() || suggested.A, B: nameB.trim() || suggested.B }
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
          lineup: me ? [{ profileId: me.id, team: 'A' as const }] : undefined,
        })
        router.replace(`/match?remote=${created.id}`)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Qualcosa è andato storto.')
      } finally {
        setBusy(false)
      }
    })()
  }

  return (
    <Screen
      scroll
      footer={
        <Button
          label={busy ? 'Creazione in corso…' : 'Inizia partita'}
          onPress={start}
          disabled={busy}
          testID="inizia-partita"
        />
      }
    >
      <View className="flex-row items-center justify-between pt-2">
        <Text className="font-bold text-2xl text-ink">Nuova partita</Text>
        <Pressable
          testID="annulla-nuova-partita"
          accessibilityRole="button"
          onPress={() => router.back()}
          className="px-2 py-1 active:opacity-60"
        >
          <Text className="text-base text-muted">Annulla</Text>
        </Pressable>
      </View>

      {league ? (
        <View className="rounded-xl bg-felt/10 px-3 py-2">
          <Text className="text-felt text-sm">
            Nella lega {league.name}: gli altri membri potranno seguirla mentre giocate.
          </Text>
        </View>
      ) : null}

      {error ? (
        <View className="rounded-xl bg-danger/10 px-3 py-2">
          <Text className="text-danger text-sm">{error}</Text>
        </View>
      ) : null}

      <Card title="Squadre" subtitle="Lascia il nome suggerito o scrivi il tuo.">
        <View className="flex-row gap-3">
          <NameField
            label="Squadra 1"
            placeholder={suggested.A}
            value={nameA}
            onChange={setNameA}
            tone="a"
            testID="nome-squadra-a"
          />
          <NameField
            label="Squadra 2"
            placeholder={suggested.B}
            value={nameB}
            onChange={setNameB}
            tone="b"
            testID="nome-squadra-b"
          />
        </View>
      </Card>

      <Card title="Traguardo" subtitle="A pari punti si gioca la mano di spareggio.">
        <View className="gap-4">
          <Segmented
            options={[...TARGETS]}
            value={target}
            onChange={setTarget}
            testID="traguardo"
          />
          <View>
            <Text className="mb-2 text-ink text-sm">Per vincere serve</Text>
            <Segmented
              options={WIN_RULES}
              value={winRule}
              onChange={setWinRule}
              testID="regola-vittoria"
            />
            <Text className="mt-1.5 text-muted text-xs">
              {winRule === 'reach'
                ? `Si vince arrivando a ${target} punti.`
                : `A ${target} punti si continua: per vincere servono almeno ${Number(target) + 1} punti.`}
            </Text>
          </View>
        </View>
      </Card>

      <Card
        title="Varianti"
        subtitle="Le impostazioni di partenza sono quelle dello scopone scientifico."
      >
        <View className="gap-4">
          <View>
            <Text className="mb-2 text-ink text-sm">Primiera</Text>
            <Segmented
              options={[...YES_NO]}
              value={primiera}
              onChange={setPrimiera}
              testID="primiera-attiva"
            />
            {primiera === 'no' ? (
              <Text className="mt-1.5 text-muted text-xs">
                Ogni mano assegnerà tre punti base invece di quattro.
              </Text>
            ) : (
              <View className="mt-3">
                <Text className="mb-2 text-ink text-sm">Come la inserite</Text>
                <Segmented
                  options={PRIMIERA_MODES}
                  value={primieraMode}
                  onChange={setPrimieraMode}
                  testID="primiera-modo"
                />
                <Text className="mt-1.5 text-muted text-xs">
                  {primieraMode === 'manual'
                    ? 'A fine mano scegli solo chi l’ha vinta.'
                    : 'A fine mano indichi la carta migliore di ogni seme e l’app fa il conto.'}
                </Text>
              </View>
            )}
          </View>
          <View>
            <Text className="mb-2 text-ink text-sm">Napola</Text>
            <Segmented
              options={[...YES_NO]}
              value={napola}
              onChange={setNapola}
              testID="napola"
            />
            <Text className="mt-1.5 text-muted text-xs">
              Asso, due e tre di denari valgono tre punti, più uno per ogni denaro consecutivo
              in più.
            </Text>
          </View>
          <View>
            <Text className="mb-2 text-ink text-sm">Donna di denari</Text>
            <Segmented options={[...YES_NO]} value={donna} onChange={setDonna} testID="donna" />
          </View>
        </View>
      </Card>
    </Screen>
  )
}
