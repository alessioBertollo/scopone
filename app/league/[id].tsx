import { useLocalSearchParams, useRouter } from 'expo-router'
import { Text, View } from 'react-native'
import { Button } from '../../src/ui/Button'
import { Card } from '../../src/ui/Card'
import { Screen } from '../../src/ui/Screen'

export default function LeagueScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  return (
    <Screen
      scroll
      footer={
        <Button
          label="Nuova partita in questa lega"
          testID="nuova-partita-lega"
          onPress={() => router.push('/new-match')}
        />
      }
    >
      <View className="pt-2">
        <Text className="font-bold text-2xl text-ink">Lega</Text>
        <Text className="mt-1 text-muted text-sm">Codice {id}</Text>
      </View>

      <Card title="Partecipanti">
        <Text className="text-muted text-sm">In arrivo con lo strato dati.</Text>
      </Card>

      <Card title="Partite">
        <Text className="text-muted text-sm">
          Qui compaiono le partite della lega, incluse quelle in corso: chi non le ha avviate le
          vede aggiornarsi senza poterle modificare.
        </Text>
      </Card>
    </Screen>
  )
}
