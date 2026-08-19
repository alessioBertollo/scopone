import '../global.css'

import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { colorScheme } from 'nativewind'
import { useEffect } from 'react'
import { View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useAuthStore } from '../src/store/auth-store'
import { useMatchHydrated } from '../src/store/hooks'
import { useSettingsStore } from '../src/store/settings-store'

export default function RootLayout() {
  const hydrated = useMatchHydrated()
  const restore = useAuthStore((state) => state.restore)
  const theme = useSettingsStore((state) => state.theme)

  // Il tema scelto va riapplicato a ogni avvio: NativeWind riparte sempre da
  // quello di sistema, e chi ha scelto "scuro" non vuole rivedere il chiaro.
  useEffect(() => {
    colorScheme.set(theme)
  }, [theme])

  // La sessione si rilegge in parallelo alla partita: non blocca l'avvio,
  // perché senza account l'app funziona comunque.
  useEffect(() => {
    void restore()
  }, [restore])

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
          <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
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
