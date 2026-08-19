import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'
import { useTranslation } from '../src/i18n/useTranslation'
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
  const { t } = useTranslation()
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
      setError(cause instanceof Error ? cause.message : t('common.error'))
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
      <Screen scroll footer={<Button label={t('common.back')} onPress={() => router.back()} />}>
        <Text className="pt-2 font-bold text-2xl text-ink">{t('signIn.title')}</Text>
        <Card>
          <Text className="text-ink text-sm">{t('signIn.noBackend')}</Text>
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
            label={busy ? t('signIn.sending') : t('signIn.sendCode')}
            testID="invia-codice"
            disabled={busy || !email.includes('@')}
            onPress={invia}
          />
        ) : (
          <View className="gap-2">
            <Button
              label={busy ? t('signIn.verifying') : t('signIn.enter')}
              testID="verifica-codice"
              disabled={busy || code.length < 6}
              onPress={entra}
            />
            <Button
              label={t('signIn.changeEmail')}
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
        <Text className="font-bold text-2xl text-ink">{t('signIn.title')}</Text>
        <Pressable
          testID="annulla-accesso"
          accessibilityRole="button"
          onPress={() => router.back()}
          className="px-2 py-1 active:opacity-60"
        >
          <Text className="text-base text-muted">{t('common.cancel')}</Text>
        </Pressable>
      </View>

      <Text className="text-muted text-sm">{t('signIn.why')}</Text>

      {error ? <ErrorNote message={error} /> : null}

      {step === 'email' ? (
        <Card title={t('signIn.emailTitle')}>
          <TextInput
            testID="campo-email"
            value={email}
            onChangeText={setEmail}
            editable={!busy}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder={t('signIn.emailPlaceholder')}
            placeholderTextColor={PLACEHOLDER_COLOR}
            className="rounded-xl bg-sunken px-4 py-3 text-base text-ink"
          />
          <Text className="mt-2 text-muted text-xs">{t('signIn.emailHint')}</Text>
        </Card>
      ) : (
        <Card title={t('signIn.codeTitle')} subtitle={t('signIn.sentTo', { email })}>
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
