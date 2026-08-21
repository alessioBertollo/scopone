import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { useTranslation } from '../../src/i18n/useTranslation'
import { Button } from '../../src/ui/Button'
import { Card } from '../../src/ui/Card'
import { Screen } from '../../src/ui/Screen'

const PLACEHOLDER_COLOR = '#8A8580'

/** Punto d'ingresso per chi ha ricevuto un codice a voce, non da un link. */
export default function JoinByCodeScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const [code, setCode] = useState('')

  const continua = () => router.push(`/join/${code}`)

  return (
    <Screen
      scroll
      footer={
        <Button
          label={t('join.continue')}
          testID="continua-ingresso-codice"
          disabled={code.trim().length !== 6}
          onPress={continua}
        />
      }
    >
      <View className="flex-row items-center justify-between pt-2">
        <Text className="font-bold text-2xl text-ink">{t('join.title')}</Text>
        <Pressable
          testID="annulla-ingresso-codice"
          accessibilityRole="button"
          onPress={() => router.back()}
          className="px-2 py-1 active:opacity-60"
        >
          <Text className="text-base text-muted">{t('common.cancel')}</Text>
        </Pressable>
      </View>

      <Card title={t('join.codeTitle')} subtitle={t('join.codeHint')}>
        <TextInput
          testID="campo-codice-ingresso"
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
          placeholder={t('join.codePlaceholder')}
          placeholderTextColor={PLACEHOLDER_COLOR}
          className="rounded-xl bg-sunken px-4 py-3 text-center text-2xl text-ink tracking-[6px]"
        />
      </Card>
    </Screen>
  )
}
