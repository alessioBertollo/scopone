import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { Button } from '../src/ui/Button'
import { Card } from '../src/ui/Card'
import { Screen } from '../src/ui/Screen'

const PLACEHOLDER_COLOR = '#8A8580'

/**
 * Accesso con un codice inviato via email: nessuna password da scegliere,
 * ricordare o recuperare.
 */
export default function SignInScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')

  return (
    <Screen
      scroll
      footer={
        step === 'email' ? (
          <Button
            label="Mandami il codice"
            testID="invia-codice"
            disabled={!email.includes('@')}
            onPress={() => setStep('code')}
          />
        ) : (
          <View className="gap-2">
            <Button
              label="Entra"
              testID="verifica-codice"
              disabled={code.length < 6}
              onPress={() => {}}
            />
            <Button
              label="Cambia indirizzo"
              variant="ghost"
              onPress={() => {
                setStep('email')
                setCode('')
              }}
            />
          </View>
        )
      }
    >
      <View className="flex-row items-center justify-between pt-2">
        <Text className="font-bold text-2xl text-ink">Accedi</Text>
        <Pressable
          testID="annulla-accesso"
          accessibilityRole="button"
          onPress={() => router.back()}
          className="px-2 py-1 active:opacity-60"
        >
          <Text className="text-base text-muted">Annulla</Text>
        </Pressable>
      </View>

      <Text className="text-muted text-sm">
        Serve solo per le leghe. Per contare una partita al tavolo non ti serve nessun account,
        e continuerà a essere così.
      </Text>

      {step === 'email' ? (
        <Card title="La tua email">
          <TextInput
            testID="campo-email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="nome@esempio.it"
            placeholderTextColor={PLACEHOLDER_COLOR}
            className="rounded-xl bg-sunken px-4 py-3 text-base text-ink"
          />
          <Text className="mt-2 text-muted text-xs">
            Ti arriva un codice di sei cifre. Non impostiamo password.
          </Text>
        </Card>
      ) : (
        <Card title="Il codice ricevuto" subtitle={`Inviato a ${email}`}>
          <TextInput
            testID="campo-codice"
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            placeholder="123456"
            placeholderTextColor={PLACEHOLDER_COLOR}
            className="rounded-xl bg-sunken px-4 py-3 text-center text-2xl text-ink tracking-[8px]"
          />
        </Card>
      )}
    </Screen>
  )
}
