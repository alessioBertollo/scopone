import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { DEFAULT_RULES, type PrimieraMode, type WinRule } from '../src/domain/rules'
import { useMatchState } from '../src/store/hooks'
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
  const startMatch = useMatchStore((state) => state.startMatch)
  const hasStarted = useMatchStore((state) => state.hasStarted)
  const savedTeams = useMatchStore((state) => state.match.teamNames)
  const saved = useMatchState()

  const savedLabel = `${savedTeams.A} ${saved.totals.A} – ${savedTeams.B} ${saved.totals.B}`

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

  const start = () => {
    startMatch(
      { A: nameA.trim() || suggested.A, B: nameB.trim() || suggested.B },
      {
        ...DEFAULT_RULES,
        targetScore: Number(target),
        winRule,
        primieraEnabled: primiera === 'si',
        primieraMode,
        napolaEnabled: napola === 'si',
        donnaEnabled: donna === 'si',
      },
    )
    router.push('/match')
  }

  return (
    <Screen
      scroll
      footer={
        <View className="gap-2">
          <Button label="Inizia partita" onPress={start} testID="inizia-partita" />
          {hasStarted ? (
            <Button
              label={
                saved.status === 'finished'
                  ? `Rivedi · ${savedLabel}`
                  : `Riprendi · ${savedLabel}`
              }
              variant="ghost"
              testID="riprendi-partita"
              onPress={() => router.push('/match')}
            />
          ) : null}
        </View>
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
