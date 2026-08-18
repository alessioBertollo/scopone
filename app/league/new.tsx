import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { Button } from '../../src/ui/Button'
import { Card } from '../../src/ui/Card'
import { Screen } from '../../src/ui/Screen'
import { Segmented } from '../../src/ui/Segmented'

const PLACEHOLDER_COLOR = '#8A8580'

const MODES = [
  { value: 'create', label: 'Creane una' },
  { value: 'join', label: 'Entra con un codice' },
] as const

type Mode = (typeof MODES)[number]['value']

export default function NewLeagueScreen() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('create')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')

  return (
    <Screen
      scroll
      footer={
        mode === 'create' ? (
          <Button
            label="Crea la lega"
            testID="conferma-crea-lega"
            disabled={name.trim().length < 2}
            onPress={() => {}}
          />
        ) : (
          <Button
            label="Entra"
            testID="conferma-entra-lega"
            disabled={code.trim().length !== 6}
            onPress={() => {}}
          />
        )
      }
    >
      <View className="flex-row items-center justify-between pt-2">
        <Text className="font-bold text-2xl text-ink">Leghe</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          className="px-2 py-1 active:opacity-60"
        >
          <Text className="text-base text-muted">Annulla</Text>
        </Pressable>
      </View>

      <Segmented options={[...MODES]} value={mode} onChange={setMode} testID="modo-lega" />

      {mode === 'create' ? (
        <Card title="Nome della lega" subtitle="Lo vedranno tutti i partecipanti.">
          <TextInput
            testID="campo-nome-lega"
            value={name}
            onChangeText={setName}
            maxLength={60}
            placeholder="Torneo del giovedì"
            placeholderTextColor={PLACEHOLDER_COLOR}
            className="rounded-xl bg-sunken px-4 py-3 text-base text-ink"
          />
          <Text className="mt-2 text-muted text-xs">
            Riceverai un codice di sei caratteri da dettare agli altri.
          </Text>
        </Card>
      ) : (
        <Card
          title="Codice di invito"
          subtitle="Sei caratteri, te li detta chi ha creato la lega."
        >
          <TextInput
            testID="campo-codice-lega"
            value={code}
            onChangeText={(value) =>
              setCode(
                value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, '')
                  .slice(0, 6),
              )
            }
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="AB3KP9"
            placeholderTextColor={PLACEHOLDER_COLOR}
            className="rounded-xl bg-sunken px-4 py-3 text-center text-2xl text-ink tracking-[6px]"
          />
        </Card>
      )}
    </Screen>
  )
}
