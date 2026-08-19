import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'
import type { League } from '../../src/lib/leagues'
import { isBackendConfigured } from '../../src/lib/supabase'
import { useAuthStore } from '../../src/store/auth-store'
import { useLeaguesStore } from '../../src/store/leagues-store'
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

function ErrorNote({ message }: { message: string }) {
  return (
    <View className="rounded-xl bg-danger/10 px-3 py-2">
      <Text className="text-danger text-sm">{message}</Text>
    </View>
  )
}

/** Titolo e uscita, identici nei tre stati della schermata. */
function Intestazione({ onAnnulla }: { onAnnulla: () => void }) {
  return (
    <View className="flex-row items-center justify-between pt-2">
      <Text className="font-bold text-2xl text-ink">Leghe</Text>
      <Pressable
        testID="annulla-nuova-lega"
        accessibilityRole="button"
        onPress={onAnnulla}
        className="px-2 py-1 active:opacity-60"
      >
        <Text className="text-base text-muted">Annulla</Text>
      </Pressable>
    </View>
  )
}

export default function NewLeagueScreen() {
  const router = useRouter()
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
      setError(cause instanceof Error ? cause.message : 'Qualcosa è andato storto.')
    } finally {
      setBusy(false)
    }
  }

  if (!isBackendConfigured) {
    return (
      <Screen
        scroll
        footer={<Button label="Torna indietro" testID="chiudi-nuova-lega" onPress={annulla} />}
      >
        <Intestazione onAnnulla={annulla} />
        <Card>
          <Text className="text-ink text-sm">
            Questa copia dell'app non è collegata a nessun server, quindi le leghe non sono
            disponibili. Le partite al tavolo funzionano lo stesso.
          </Text>
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
            label={attesa ? 'Un attimo…' : 'Accedi'}
            testID="vai-accesso-lega"
            disabled={attesa}
            onPress={() => router.push('/sign-in')}
          />
        }
      >
        <Intestazione onAnnulla={annulla} />
        <Card title="Serve un account">
          <Text className="text-ink text-sm">
            Una lega mette in comune le partite di un gruppo, quindi ha bisogno di sapere chi
            sei. L'accesso è con un codice via email, senza password.
          </Text>
          {attesa ? <ActivityIndicator className="mt-3" /> : null}
        </Card>
      </Screen>
    )
  }

  const crea = () => run(() => create(name))
  const entra = () => run(() => join(code))

  return (
    <Screen
      scroll
      footer={
        mode === 'create' ? (
          <Button
            label={busy ? 'Creazione in corso…' : 'Crea la lega'}
            testID="conferma-crea-lega"
            disabled={busy || name.trim().length < 2}
            onPress={crea}
          />
        ) : (
          <Button
            label={busy ? 'Ingresso in corso…' : 'Entra'}
            testID="conferma-entra-lega"
            disabled={busy || code.trim().length !== 6}
            onPress={entra}
          />
        )
      }
    >
      <Intestazione onAnnulla={annulla} />

      <Segmented
        options={[...MODES]}
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
        <Card title="Nome della lega" subtitle="Lo vedranno tutti i partecipanti.">
          <TextInput
            testID="campo-nome-lega"
            value={name}
            onChangeText={setName}
            editable={!busy}
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
