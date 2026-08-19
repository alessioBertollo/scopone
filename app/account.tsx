import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, Text, TextInput, View } from 'react-native'
import { useAuthStore } from '../src/store/auth-store'
import { Button } from '../src/ui/Button'
import { Card } from '../src/ui/Card'
import { Screen } from '../src/ui/Screen'

const PLACEHOLDER_COLOR = '#8A8580'

export default function AccountScreen() {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const setDisplayName = useAuthStore((state) => state.setDisplayName)
  const signOut = useAuthStore((state) => state.signOut)
  const deleteAccount = useAuthStore((state) => state.deleteAccount)

  const [name, setName] = useState(user?.displayName ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const run = async (action: () => Promise<void>, onDone?: () => void) => {
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      await action()
      onDone?.()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Qualcosa è andato storto.')
    } finally {
      setBusy(false)
    }
  }

  /**
   * Doppia conferma prima di cancellare: è irreversibile e porta con sé le
   * leghe create, che spariscono anche per gli altri membri.
   */
  const chiediCancellazione = () => {
    Alert.alert(
      'Cancellare il tuo account?',
      'Spariscono account, nome, partite che hai avviato e le leghe che hai creato, anche per gli altri membri. Non è reversibile e non conserviamo copie.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Cancella tutto',
          style: 'destructive',
          onPress: () => run(deleteAccount, () => router.replace('/')),
        },
      ],
    )
  }

  if (!user) {
    return (
      <Screen
        scroll
        footer={
          <Button
            label="Accedi"
            testID="vai-accesso"
            onPress={() => router.replace('/sign-in')}
          />
        }
      >
        <Text className="pt-2 font-bold text-2xl text-ink">Account</Text>
        <Card>
          <Text className="text-ink text-sm">
            Non hai effettuato l'accesso. Serve solo per le leghe: contare una partita al tavolo
            funziona senza.
          </Text>
        </Card>
      </Screen>
    )
  }

  return (
    <Screen scroll>
      <View className="flex-row items-center justify-between pt-2">
        <Text className="font-bold text-2xl text-ink">Account</Text>
        <Pressable
          testID="chiudi-account"
          accessibilityRole="button"
          onPress={() => router.back()}
          className="px-2 py-1 active:opacity-60"
        >
          <Text className="text-base text-muted">Chiudi</Text>
        </Pressable>
      </View>

      {error ? (
        <View className="rounded-xl bg-danger/10 px-3 py-2">
          <Text className="text-danger text-sm">{error}</Text>
        </View>
      ) : null}

      <Card title="Nome mostrato" subtitle="Lo vedono gli altri membri delle tue leghe.">
        <TextInput
          testID="campo-nome"
          value={name}
          onChangeText={setName}
          editable={!busy}
          maxLength={40}
          autoCorrect={false}
          placeholder="Come ti chiamano al tavolo"
          placeholderTextColor={PLACEHOLDER_COLOR}
          className="rounded-xl bg-sunken px-4 py-3 text-base text-ink"
        />
        <View className="mt-3">
          <Button
            label={saved ? 'Salvato' : 'Salva'}
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

      <Card title="Email" subtitle="Serve solo ad accedere: gli altri giocatori non la vedono.">
        <Text className="text-base text-ink">{user.email}</Text>
      </Card>

      <View className="mt-2">
        <Button
          label="Esci"
          variant="secondary"
          testID="esci"
          disabled={busy}
          onPress={() => run(signOut, () => router.replace('/'))}
        />
      </View>

      <Card title="Cancellare l'account">
        <Text className="text-muted text-sm">
          Cancelli account, nome, partite che hai avviato e le leghe che hai creato. Le leghe
          spariscono anche per gli altri membri, perché una lega senza proprietario non sarebbe
          più amministrabile.
        </Text>
        <Text className="mt-2 text-muted text-sm">
          Non è reversibile e non conserviamo copie.
        </Text>
        <View className="mt-4">
          <Button
            label="Cancella il mio account"
            variant="danger"
            testID="cancella-account"
            disabled={busy}
            onPress={chiediCancellazione}
          />
        </View>
      </Card>
    </Screen>
  )
}
