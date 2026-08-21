import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'
import { useTranslation } from '../../src/i18n/useTranslation'
import { joinLobby } from '../../src/lib/lobby'
import { useAuthStore } from '../../src/store/auth-store'
import { Button } from '../../src/ui/Button'
import { Card } from '../../src/ui/Card'
import { Screen } from '../../src/ui/Screen'

const PLACEHOLDER_COLOR = '#8A8580'

type Step = 'name' | 'waiting' | 'placed' | 'removed'

/**
 * Schermata di chi entra da un link o da un codice dettato: manda il nome e
 * resta in attesa che chi ha creato la partita lo metta in squadra. Non
 * tocca mai il database: tutto passa dal canale effimero del tavolo.
 */
export default function JoinLobbyScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const params = useLocalSearchParams<{ code: string }>()
  const code = (params.code ?? '').toUpperCase()
  const me = useAuthStore((state) => state.user)

  const [name, setName] = useState(me?.displayName ?? '')
  const [step, setStep] = useState<Step>('name')
  const leave = useRef<(() => void) | null>(null)

  useEffect(() => {
    return () => leave.current?.()
  }, [])

  const invia = () => {
    setStep('waiting')
    leave.current = joinLobby(code, name.trim(), me?.id ?? null, (team) => {
      setStep(team ? 'placed' : 'removed')
    })
  }

  return (
    <Screen
      scroll
      footer={
        step === 'name' ? (
          <Button
            label={t('join.send')}
            testID="invia-richiesta-ingresso"
            disabled={name.trim().length === 0}
            onPress={invia}
          />
        ) : (
          <Button
            label={t('common.back')}
            testID="chiudi-ingresso"
            onPress={() => router.back()}
          />
        )
      }
    >
      <Text className="pt-2 font-bold text-2xl text-ink">{t('join.title')}</Text>

      {step === 'name' ? (
        <>
          <Card title={t('join.nameTitle')}>
            <TextInput
              testID="campo-nome-ingresso"
              value={name}
              onChangeText={setName}
              maxLength={40}
              autoCorrect={false}
              placeholder={t('join.namePlaceholder')}
              placeholderTextColor={PLACEHOLDER_COLOR}
              className="rounded-xl bg-sunken px-4 py-3 text-base text-ink"
            />
          </Card>
          {me ? (
            <Text className="text-muted text-xs">
              {t('join.signedInAs', { nome: me.displayName })}
            </Text>
          ) : (
            <Pressable
              testID="accedi-da-ingresso"
              accessibilityRole="button"
              onPress={() => router.push('/sign-in')}
            >
              <Text className="text-felt text-sm">{t('join.signInPrompt')}</Text>
            </Pressable>
          )}
        </>
      ) : (
        <Card>
          {step === 'waiting' ? (
            <View className="items-center gap-3 py-4">
              <ActivityIndicator />
              <Text className="text-center text-ink text-sm">{t('join.waiting')}</Text>
            </View>
          ) : (
            <Text testID="esito-ingresso" className="text-center text-ink text-sm">
              {step === 'placed' ? t('join.placed') : t('join.removed')}
            </Text>
          )}
        </Card>
      )}
    </Screen>
  )
}
