import '../global.css'

import { Stack, usePathname } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { colorScheme } from 'nativewind'
import { useEffect } from 'react'
import { View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useAuthStore } from '../src/store/auth-store'
import { useMatchHydrated, usePendingWatch } from '../src/store/hooks'
import { useSettingsStore } from '../src/store/settings-store'
import { TabBar, type TabRoute } from '../src/ui/TabBar'

/**
 * Lo splash resta visibile finché la partita salvata non è stata riletta.
 * Senza questo, l'icona spariva appena il primo componente montava e si
 * vedeva uno schermo del colore di sfondo per qualche istante: due schermate
 * al posto di una. Se la chiamata arriva tardi rifiuta, e non è un problema.
 */
void SplashScreen.preventAutoHideAsync().catch(() => {})

/** Le uniche tre rotte con la barra sotto: il resto è dettaglio o modulo. */
function tabAt(pathname: string): TabRoute | null {
  if (pathname === '/' || pathname === '/friends' || pathname === '/standings') return pathname
  return null
}

export default function RootLayout() {
  const hydrated = useMatchHydrated()
  const restore = useAuthStore((state) => state.restore)
  const theme = useSettingsStore((state) => state.theme)
  const signedIn = useAuthStore((state) => state.status) === 'signedIn'
  const tab = tabAt(usePathname())

  usePendingWatch()

  // Il tema scelto va riapplicato a ogni avvio: NativeWind riparte sempre da
  // quello di sistema, e chi ha scelto "scuro" non vuole rivedere il chiaro.
  useEffect(() => {
    colorScheme.set(theme)
  }, [theme])

  useEffect(() => {
    if (hydrated) void SplashScreen.hideAsync().catch(() => {})
  }, [hydrated])

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
            <Stack.Screen name="standings" />
            <Stack.Screen name="join/index" />
            <Stack.Screen name="join/[code]" />
            <Stack.Screen name="new-match" />
            <Stack.Screen name="match" />
            <Stack.Screen name="hand" options={{ presentation: 'modal' }} />
            <Stack.Screen name="sign-in" options={{ presentation: 'modal' }} />
            <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
            <Stack.Screen name="league/new" options={{ presentation: 'modal' }} />
            <Stack.Screen name="league/[id]" />
          </Stack>
          {tab && signedIn ? <TabBar active={tab} /> : null}
        </View>
      ) : (
        // Schermo pieno del colore di sfondo: evita il lampo bianco mentre
        // la partita salvata viene riletta dal disco.
        <View className="flex-1 bg-bg" />
      )}
    </SafeAreaProvider>
  )
}
