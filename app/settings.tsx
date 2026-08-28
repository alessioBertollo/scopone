import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import { colorScheme } from 'nativewind'
import { useEffect, useState } from 'react'
import { Alert, Linking, Pressable, Text, TextInput, View } from 'react-native'
import { LANGUAGE_LABEL, LANGUAGES } from '../src/i18n'
import { useTranslation } from '../src/i18n/useTranslation'
import type { DeckKind } from '../src/lib/deck'
import { nineOfCoinsLabel } from '../src/lib/deck'
import { isBackendConfigured } from '../src/lib/supabase'
import { useAuthStore } from '../src/store/auth-store'
import {
  type LanguageChoice,
  type ThemeChoice,
  useSettingsStore,
} from '../src/store/settings-store'
import { Avatar } from '../src/ui/Avatar'
import { AVATARS, avatarFor } from '../src/ui/avatar-names'
import { Button } from '../src/ui/Button'
import { Card } from '../src/ui/Card'
import { cn } from '../src/ui/cn'
import { Screen } from '../src/ui/Screen'
import { Segmented } from '../src/ui/Segmented'

const PLACEHOLDER_COLOR = '#8A8580'
const REPO = 'https://github.com/alessioBertollo/scopone'

export default function SettingsScreen() {
  const router = useRouter()
  const { t } = useTranslation()

  const theme = useSettingsStore((state) => state.theme)
  const setTheme = useSettingsStore((state) => state.setTheme)
  const deck = useSettingsStore((state) => state.deck)
  const setDeck = useSettingsStore((state) => state.setDeck)
  const language = useSettingsStore((state) => state.language)
  const setLanguage = useSettingsStore((state) => state.setLanguage)

  const user = useAuthStore((state) => state.user)
  const setDisplayName = useAuthStore((state) => state.setDisplayName)
  const setAvatar = useAuthStore((state) => state.setAvatar)
  const signOut = useAuthStore((state) => state.signOut)
  const deleteAccount = useAuthStore((state) => state.deleteAccount)

  const [name, setName] = useState(user?.displayName ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // NativeWind tiene il tema in un suo stato: la nostra preferenza è la fonte
  // di verità e va riapplicata quando cambia o quando la schermata si apre.
  useEffect(() => {
    colorScheme.set(theme)
  }, [theme])

  const run = async (action: () => Promise<void>, onDone?: () => void) => {
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      await action()
      onDone?.()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  const chiediCancellazione = () => {
    Alert.alert(t('settings.delete.confirmTitle'), t('settings.delete.confirmBody'), [
      { text: t('settings.delete.confirmCancel'), style: 'cancel' },
      {
        text: t('settings.delete.confirmOk'),
        style: 'destructive',
        onPress: () => run(deleteAccount, () => router.replace('/')),
      },
    ])
  }

  const versione = Constants.expoConfig?.version ?? '—'

  const temi: { value: ThemeChoice; label: string }[] = [
    { value: 'system', label: t('settings.theme.system') },
    { value: 'light', label: t('settings.theme.light') },
    { value: 'dark', label: t('settings.theme.dark') },
  ]

  const mazzi: { value: DeckKind; label: string }[] = [
    { value: 'italiane', label: t('settings.deck.italiane') },
    { value: 'francesi', label: t('settings.deck.francesi') },
  ]

  const lingue: { value: LanguageChoice; label: string }[] = [
    { value: 'system', label: t('settings.language.system') },
    ...LANGUAGES.map((codice) => ({ value: codice, label: LANGUAGE_LABEL[codice] })),
  ]

  return (
    <Screen scroll>
      <View className="flex-row items-center justify-between pt-2">
        <Text className="font-bold text-2xl text-ink">{t('settings.title')}</Text>
        <Pressable
          testID="chiudi-impostazioni"
          accessibilityRole="button"
          onPress={() => router.back()}
          className="px-2 py-1 active:opacity-60"
        >
          <Text className="text-base text-muted">{t('settings.close')}</Text>
        </Pressable>
      </View>

      {error ? (
        <View className="rounded-xl bg-danger/10 px-3 py-2">
          <Text className="text-danger text-sm">{error}</Text>
        </View>
      ) : null}

      <Card title={t('settings.appearance')}>
        <View className="gap-4">
          <View>
            <Text className="mb-2 text-ink text-sm">{t('settings.theme')}</Text>
            <Segmented options={temi} value={theme} onChange={setTheme} testID="tema" />
            <Text className="mt-1.5 text-muted text-xs">{t('settings.theme.hint')}</Text>
          </View>

          <View>
            <Text className="mb-2 text-ink text-sm">{t('settings.deck')}</Text>
            <Segmented options={mazzi} value={deck} onChange={setDeck} testID="mazzo" />
            <Text className="mt-1.5 text-muted text-xs">
              {t('settings.deck.hint', { esempio: nineOfCoinsLabel(deck) })}
            </Text>
          </View>

          <View>
            <Text className="mb-2 text-ink text-sm">{t('settings.language')}</Text>
            <Segmented
              options={lingue}
              value={language}
              onChange={setLanguage}
              testID="lingua"
            />
            <Text className="mt-1.5 text-muted text-xs">{t('settings.language.hint')}</Text>
          </View>
        </View>
      </Card>

      {isBackendConfigured ? (
        user ? (
          <>
            <Card title={t('settings.account.name')} subtitle={t('settings.account.nameHint')}>
              <TextInput
                testID="campo-nome"
                value={name}
                onChangeText={setName}
                editable={!busy}
                maxLength={40}
                autoCorrect={false}
                placeholder={t('settings.account.namePlaceholder')}
                placeholderTextColor={PLACEHOLDER_COLOR}
                className="rounded-xl bg-sunken px-4 py-3 text-base text-ink"
              />
              <View className="mt-3">
                <Button
                  label={saved ? t('settings.account.saved') : t('settings.account.save')}
                  variant="secondary"
                  testID="salva-nome"
                  disabled={busy || name.trim().length < 1 || name.trim() === user.displayName}
                  onPress={() =>
                    run(
                      () => setDisplayName(name),
                      () => setSaved(true),
                    )
                  }
                />
              </View>
            </Card>

            <Card
              title={t('settings.account.avatar')}
              subtitle={t('settings.account.avatarHint')}
            >
              <View className="flex-row flex-wrap gap-3">
                {AVATARS.map((animale) => {
                  const scelto = avatarFor(user.avatar, user.id) === animale

                  return (
                    <Pressable
                      key={animale}
                      testID={`avatar-${animale}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: scelto }}
                      accessibilityLabel={t(`avatar.${animale}`)}
                      disabled={busy}
                      onPress={() =>
                        run(
                          () => setAvatar(animale),
                          () => setSaved(false),
                        )
                      }
                      className={cn(
                        'h-14 w-14 items-center justify-center rounded-full bg-sunken active:opacity-60',
                        // Un bordo e non un fondo pieno: su un fondo scuro la
                        // sagoma color inchiostro sparirebbe.
                        scelto && 'border-2 border-felt',
                      )}
                    >
                      <Avatar name={animale} seed={user.id} size={30} />
                    </Pressable>
                  )
                })}
              </View>
            </Card>

            <Card
              title={t('settings.account.email')}
              subtitle={t('settings.account.emailHint')}
            >
              <Text className="text-base text-ink">{user.email}</Text>
            </Card>

            <Button
              label={t('settings.account.signOut')}
              variant="secondary"
              testID="esci"
              disabled={busy}
              onPress={() => run(signOut, () => router.replace('/'))}
            />

            <Card title={t('settings.delete.title')}>
              <Text className="text-muted text-sm">{t('settings.delete.body')}</Text>
              <Text className="mt-2 text-muted text-sm">
                {t('settings.delete.irreversible')}
              </Text>
              <View className="mt-4">
                <Button
                  label={t('settings.delete.action')}
                  variant="danger"
                  testID="cancella-account"
                  disabled={busy}
                  onPress={chiediCancellazione}
                />
              </View>
            </Card>
          </>
        ) : (
          <Card title={t('settings.account')}>
            <Text className="text-ink text-sm">{t('settings.account.signedOut')}</Text>
            <View className="mt-4">
              <Button
                label={t('settings.account.signIn')}
                variant="secondary"
                testID="vai-accesso"
                onPress={() => router.push('/sign-in')}
              />
            </View>
          </Card>
        )
      ) : null}

      <View className="items-center gap-1 pt-4 pb-2">
        <Text testID="versione-app" className="text-muted text-xs">
          {t('settings.version', { versione })}
        </Text>
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL(REPO)}
          className="active:opacity-60"
        >
          <Text className="text-felt text-xs">{t('settings.sourceCode')}</Text>
        </Pressable>
      </View>
    </Screen>
  )
}
