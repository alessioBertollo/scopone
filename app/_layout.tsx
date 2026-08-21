import '../global.css'

import { Stack, usePathname } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { colorScheme } from 'nativewind'
import { useEffect } from 'react'
import { View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useAuthStore } from '../src/store/auth-store'
import { useMatchHydrated } from '../src/store/hooks'
import { useSettingsStore } from '../src/store/settings-store'
import { TabBar } from '../src/ui/TabBar'

/** Le uniche due rotte con la barra sotto: il resto è dettaglio o modulo. */
function tabAt(pathname: string): '/' | '/friends' | null {
  if (pathname === '/' || pathname === '/friends') return pathname
  return null
}

export default function RootLayout() {
  const hydrated = useMatchHydrated()
  const restore = useAuthStore((state) => state.restore)
  const theme = useSettingsStore((state) => state.theme)
  const tab = tabAt(usePathname())

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
        <View className="flex-1">
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="friends" />
            <Stack.Screen name="new-match" />
            <Stack.Screen name="match" />
            <Stack.Screen name="hand" options={{ presentation: 'modal' }} />
            <Stack.Screen name="sign-in" options={{ presentation: 'modal' }} />
            <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
            <Stack.Screen name="league/new" options={{ presentation: 'modal' }} />
            <Stack.Screen name="league/[id]" />
          </Stack>
          {tab ? <TabBar active={tab} /> : null}
        </View>
      ) : (
        // Schermo pieno del colore di sfondo: evita il lampo bianco mentre
        // la partita salvata viene riletta dal disco.
        <View className="flex-1 bg-bg" />
      )}
    </SafeAreaProvider>
  )
}
