import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Text, TextInput, View } from 'react-native'
import { DEFAULT_RULES, type NapolaRule } from '../src/domain/rules'
import { useMatchState } from '../src/store/hooks'
import { useMatchStore } from '../src/store/match-store'
import { Button } from '../src/ui/Button'
import { Card } from '../src/ui/Card'
import { cn } from '../src/ui/cn'
import { Screen } from '../src/ui/Screen'
import { Segmented } from '../src/ui/Segmented'

const PLACEHOLDER_COLOR = '#8A8580'

const TARGETS = [
  { value: '11', label: '11 punti' },
  { value: '16', label: '16 punti' },
  { value: '21', label: '21 punti' },
] as const

type TargetValue = (typeof TARGETS)[number]['value']

const NAPOLA_OPTIONS: { value: NapolaRule; label: string }[] = [
  { value: 'off', label: 'No' },
  { value: 'fixed', label: '3 punti' },
  { value: 'progressive', label: 'Progressiva' },
]

const YES_NO = [
  { value: 'no', label: 'No' },
  { value: 'si', label: 'Sì' },
] as const

type YesNo = (typeof YES_NO)[number]['value']

function NameField({
  label,
  value,
  onChange,
  tone,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  tone: 'a' | 'b'
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
        value={value}
        onChangeText={onChange}
        maxLength={16}
        autoCorrect={false}
        placeholder={label}
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

  const [nameA, setNameA] = useState('Noi')
  const [nameB, setNameB] = useState('Loro')
  const [target, setTarget] = useState<TargetValue>('21')
  const [napola, setNapola] = useState<NapolaRule>('off')
  const [rebello, setRebello] = useState<YesNo>('no')

  const start = () => {
    startMatch(
      { A: nameA.trim() || 'Noi', B: nameB.trim() || 'Loro' },
      {
        ...DEFAULT_RULES,
        targetScore: Number(target),
        napola,
        rebello: rebello === 'si',
      },
    )
    router.push('/match')
  }

  return (
    <Screen
      scroll
      footer={
        <View className="gap-2">
          <Button label="Inizia partita" onPress={start} />
          {hasStarted ? (
            <Button
              label={
                saved.status === 'finished'
                  ? `Rivedi l'ultima partita · ${savedLabel}`
                  : `Riprendi · ${savedLabel}`
              }
              variant="ghost"
              onPress={() => router.push('/match')}
            />
          ) : null}
        </View>
      }
    >
      <View className="pt-6 pb-2">
        <Text className="font-bold text-4xl text-felt tracking-tight">Scopone</Text>
        <Text className="mt-1 text-base text-muted">
          Il conto dei punti, primiera compresa.
        </Text>
      </View>

      <Card title="Squadre">
        <View className="flex-row gap-3">
          <NameField label="Squadra 1" value={nameA} onChange={setNameA} tone="a" />
          <NameField label="Squadra 2" value={nameB} onChange={setNameB} tone="b" />
        </View>
      </Card>

      <Card title="Si vince a" subtitle="La partita si chiude solo senza parità.">
        <Segmented options={[...TARGETS]} value={target} onChange={setTarget} />
      </Card>

      <Card title="Varianti" subtitle="Lascia tutto su No per lo scopone scientifico classico.">
        <View className="gap-4">
          <View>
            <Text className="mb-2 text-ink text-sm">Napola</Text>
            <Segmented options={NAPOLA_OPTIONS} value={napola} onChange={setNapola} />
          </View>
          <View>
            <Text className="mb-2 text-ink text-sm">Rebello (re di denari)</Text>
            <Segmented options={[...YES_NO]} value={rebello} onChange={setRebello} />
          </View>
        </View>
      </Card>
    </Screen>
  )
}
