import { useRouter } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { TranslationKey } from '../i18n'
import { useTranslation } from '../i18n/useTranslation'
import { cn } from './cn'

export type TabRoute = '/' | '/friends' | '/standings'

type Tab = {
  href: TabRoute
  icon: string
  labelKey: TranslationKey
  testID: string
}

const TABS: Tab[] = [
  { href: '/', icon: '🏠', labelKey: 'tabs.home', testID: 'tab-home' },
  { href: '/friends', icon: '👥', labelKey: 'tabs.friends', testID: 'tab-friends' },
  { href: '/standings', icon: '🏆', labelKey: 'tabs.standings', testID: 'tab-standings' },
]

/**
 * Barra fissa sotto le tre schede di primo livello. Sta fuori da `Screen`,
 * come sorella dello `Stack`, così resta ferma mentre lo stack sopra
 * cambia schermata: comparire e sparire ad ogni tocco sarebbe uno sfarfallio.
 */
export function TabBar({ active }: { active: TabRoute }) {
  const router = useRouter()
  const { t } = useTranslation()

  return (
    <SafeAreaView edges={['bottom']} className="border-line border-t bg-surface">
      <View className="flex-row">
        {TABS.map((tab) => {
          const selected = tab.href === active

          return (
            <Pressable
              key={tab.href}
              testID={tab.testID}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => router.navigate(tab.href)}
              className="flex-1 items-center gap-0.5 py-2.5 active:opacity-70"
            >
              <Text className="text-xl">{tab.icon}</Text>
              <Text
                className={cn('text-xs', selected ? 'font-semibold text-felt' : 'text-muted')}
              >
                {t(tab.labelKey)}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </SafeAreaView>
  )
}
