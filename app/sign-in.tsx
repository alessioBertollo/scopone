import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'
import { isBackendConfigured } from '../src/lib/supabase'
import { useAuthStore } from '../src/store/auth-store'
import { Button } from '../src/ui/Button'
import { Card } from '../src/ui/Card'
import { Screen } from '../src/ui/Screen'

const PLACEHOLDER_COLOR = '#8A8580'

function ErrorNote({ message }: { message: string }) {
  return (
    <View className="rounded-xl bg-danger/10 px-3 py-2">
      <Text className="text-danger text-sm">{message}</Text>
    </View>
  )
}

/**
 * Accesso con un codice inviato via email: nessuna password da scegliere,
 * ricordare o recuperare. Serve solo alle leghe — contare una partita al
 * tavolo resta possibile senza account.
 */
export default function SignInScreen() {
  const router = useRouter()
  const sendCode = useAuthStore((state) => state.sendCode)
  const verifyCode = useAuthStore((state) => state.verifyCode)

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Gli errori arrivano già tradotti dallo strato di autenticazione: qui si
  // mostrano e basta, senza reinterpretarli.
  const run = async (action: () => Promise<void>, onDone: () => void) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      onDone()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Qualcosa è andato storto.')
    } finally {
      setBusy(false)
    }
  }

  const invia = () =>
    run(
      () => sendCode(email),
      () => setStep('code'),
    )
  const entra = () =>
    run(
      () => verifyCode(email, code),
      () => router.back(),
    )

  if (!isBackendConfigured) {
    return (
      <Screen scroll footer={<Button label="Torna indietro" onPress={() => router.back()} />}>
        <Text className="pt-2 font-bold text-2xl text-ink">Accedi</Text>
        <Card>
          <Text className="text-ink text-sm">
            Questa copia dell'app non è collegata a nessun server, quindi l'accesso non è
            disponibile. Le partite in solitaria funzionano lo stesso.
          </Text>
        </Card>
      </Screen>
    )
  }

  return (
    <Screen
      scroll
      footer={
        step === 'email' ? (
          <Button
            label={busy ? 'Invio in corso…' : 'Mandami il codice'}
            testID="invia-codice"
            disabled={busy || !email.includes('@')}
            onPress={invia}
          />
        ) : (
          <View className="gap-2">
            <Button
              label={busy ? 'Verifica in corso…' : 'Entra'}
              testID="verifica-codice"
              disabled={busy || code.length < 6}
              onPress={entra}
            />
            <Button
              label="Cambia indirizzo"
              variant="ghost"
              disabled={busy}
              onPress={() => {
                setStep('email')
                setCode('')
                setError(null)
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

      {error ? <ErrorNote message={error} /> : null}

      {step === 'email' ? (
        <Card title="La tua email">
          <TextInput
            testID="campo-email"
            value={email}
            onChangeText={setEmail}
            editable={!busy}
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
            editable={!busy}
            autoFocus
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            placeholder="123456"
            placeholderTextColor={PLACEHOLDER_COLOR}
            className="rounded-xl bg-sunken px-4 py-3 text-center text-2xl text-ink tracking-[8px]"
          />
          {busy ? <ActivityIndicator className="mt-3" /> : null}
        </Card>
      )}
    </Screen>
  )
}
