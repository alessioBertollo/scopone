import '../global.css'

import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useMatchHydrated } from '../src/store/hooks'

export default function RootLayout() {
  const hydrated = useMatchHydrated()

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      {hydrated ? (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="new-match" />
          <Stack.Screen name="match" />
          <Stack.Screen name="hand" options={{ presentation: 'modal' }} />
          <Stack.Screen name="sign-in" options={{ presentation: 'modal' }} />
          <Stack.Screen name="league/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="league/[id]" />
        </Stack>
      ) : (
        // Schermo pieno del colore di sfondo: evita il lampo bianco mentre
        // la partita salvata viene riletta dal disco.
        <View className="flex-1 bg-bg" />
      )}
    </SafeAreaProvider>
  )
}
