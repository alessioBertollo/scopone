import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'
import { useTranslation } from '../../src/i18n/useTranslation'
import type { League } from '../../src/lib/leagues'
import { isBackendConfigured } from '../../src/lib/supabase'
import { useAuthStore } from '../../src/store/auth-store'
import { useLeaguesStore } from '../../src/store/leagues-store'
import { Button } from '../../src/ui/Button'
import { Card } from '../../src/ui/Card'
import { Screen } from '../../src/ui/Screen'
import { Segmented } from '../../src/ui/Segmented'

const PLACEHOLDER_COLOR = '#8A8580'

// Solo i valori: le etichette si costruiscono dentro il componente, dove c'è
// la traduzione. Una costante di modulo si valuterebbe una volta all'import.
type Mode = 'create' | 'join'

function ErrorNote({ message }: { message: string }) {
  return (
    <View className="rounded-xl bg-danger/10 px-3 py-2">
      <Text className="text-danger text-sm">{message}</Text>
    </View>
  )
}

/** Titolo e uscita, identici nei tre stati della schermata. */
function Intestazione({ onAnnulla }: { onAnnulla: () => void }) {
  const { t } = useTranslation()

  return (
    <View className="flex-row items-center justify-between pt-2">
      <Text className="font-bold text-2xl text-ink">{t('league.title')}</Text>
      <Pressable
        testID="annulla-nuova-lega"
        accessibilityRole="button"
        onPress={onAnnulla}
        className="px-2 py-1 active:opacity-60"
      >
        <Text className="text-base text-muted">{t('common.cancel')}</Text>
      </Pressable>
    </View>
  )
}

export default function NewLeagueScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const authStatus = useAuthStore((state) => state.status)
  const create = useLeaguesStore((state) => state.create)
  const join = useLeaguesStore((state) => state.join)

  const [mode, setMode] = useState<Mode>('create')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const annulla = () => router.back()

  /**
   * Gli errori arrivano già tradotti in italiano dallo strato leghe: qui si
   * mostrano e basta, senza reinterpretarli. Creare ed entrare finiscono
   * nello stesso posto, quindi condividono anche la navigazione.
   */
  const run = async (action: () => Promise<League>) => {
    setBusy(true)
    setError(null)
    try {
      const league = await action()
      // `replace` e non `push`: questa è una schermata di passaggio, e
      // tornarci sopra dal dettaglio riproporrebbe un modulo già compilato.
      router.replace(`/league/${league.id}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  if (!isBackendConfigured) {
    return (
      <Screen
        scroll
        footer={
          <Button label={t('common.back')} testID="chiudi-nuova-lega" onPress={annulla} />
        }
      >
        <Intestazione onAnnulla={annulla} />
        <Card>
          <Text className="text-ink text-sm">{t('league.noBackend')}</Text>
        </Card>
      </Screen>
    )
  }

  // `unknown` è la sessione non ancora riletta all'avvio: proporre l'accesso
  // a chi è già dentro, anche solo per un istante, si vede.
  if (authStatus !== 'signedIn') {
    const attesa = authStatus === 'unknown'

    return (
      <Screen
        scroll
        footer={
          <Button
            label={attesa ? t('league.wait') : t('league.signIn')}
            testID="vai-accesso-lega"
            disabled={attesa}
            onPress={() => router.push('/sign-in')}
          />
        }
      >
        <Intestazione onAnnulla={annulla} />
        <Card title={t('league.needAccount')}>
          <Text className="text-ink text-sm">{t('league.needAccountBody')}</Text>
          {attesa ? <ActivityIndicator className="mt-3" /> : null}
        </Card>
      </Screen>
    )
  }

  const crea = () => run(() => create(name))
  const entra = () => run(() => join(code))

  const modi: { value: Mode; label: string }[] = [
    { value: 'create', label: t('league.modeCreate') },
    { value: 'join', label: t('league.modeJoin') },
  ]

  return (
    <Screen
      scroll
      footer={
        mode === 'create' ? (
          <Button
            label={busy ? t('league.creating') : t('league.create')}
            testID="conferma-crea-lega"
            disabled={busy || name.trim().length < 2}
            onPress={crea}
          />
        ) : (
          <Button
            label={busy ? t('league.joining') : t('league.join')}
            testID="conferma-entra-lega"
            disabled={busy || code.trim().length !== 6}
            onPress={entra}
          />
        )
      }
    >
      <Intestazione onAnnulla={annulla} />

      <Segmented
        options={modi}
        value={mode}
        onChange={(value) => {
          setMode(value)
          // L'errore riguardava l'altro modo: tenerlo qui accuserebbe un
          // campo che non è nemmeno più sullo schermo.
          setError(null)
        }}
        testID="modo-lega"
      />

      {error ? <ErrorNote message={error} /> : null}

      {mode === 'create' ? (
        <Card title={t('league.name')} subtitle={t('league.nameHint')}>
          <TextInput
            testID="campo-nome-lega"
            value={name}
            onChangeText={setName}
            editable={!busy}
            maxLength={60}
            placeholder={t('league.namePlaceholder')}
            placeholderTextColor={PLACEHOLDER_COLOR}
            className="rounded-xl bg-sunken px-4 py-3 text-base text-ink"
          />
          <Text className="mt-2 text-muted text-xs">{t('league.codeAfterCreate')}</Text>
        </Card>
      ) : (
        <Card title={t('league.inviteCode')} subtitle={t('league.inviteCodeHint')}>
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
            editable={!busy}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="AB3KP9"
            placeholderTextColor={PLACEHOLDER_COLOR}
            className="rounded-xl bg-sunken px-4 py-3 text-center text-2xl text-ink tracking-[6px]"
          />
        </Card>
      )}

      {busy ? <ActivityIndicator /> : null}
    </Screen>
  )
}
