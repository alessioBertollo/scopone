import { useRouter } from 'expo-router'
import type { ReactElement } from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { TranslationKey } from '../i18n'
import { useTranslation } from '../i18n/useTranslation'
import { cn } from './cn'
import { FriendsIcon, HomeIcon, StandingsIcon } from './Icon'

export type TabRoute = '/' | '/friends' | '/standings'

type Tab = {
  href: TabRoute
  Icon: (props: { active: boolean }) => ReactElement
  labelKey: TranslationKey
  testID: string
}

const TABS: Tab[] = [
  { href: '/', Icon: HomeIcon, labelKey: 'tabs.home', testID: 'tab-home' },
  { href: '/friends', Icon: FriendsIcon, labelKey: 'tabs.friends', testID: 'tab-friends' },
  {
    href: '/standings',
    Icon: StandingsIcon,
    labelKey: 'tabs.standings',
    testID: 'tab-standings',
  },
]

/**
 * Barra fissa sotto le tre schede di primo livello. Sta fuori da `Screen`,
 * come sorella dello `Stack`, così resta ferma mentre lo stack sopra
 * cambia schermata: comparire e sparire ad ogni tocco sarebbe uno sfarfallio.
 */
export function TabBar({ active }: { active: TabRoute }) {
  const router = useRouter()
  const { t } = useTranslation()

  /**
   * Queste tre non sono pagine in fila ma schede: passare dall'una all'altra
   * non deve lasciare traccia, altrimenti il tasto indietro ripercorre tutti
   * i tocchi fatti e uscire dall'app diventa un pellegrinaggio.
   *
   * Un navigatore a schede farebbe questo da sé, ma in questa versione di
   * expo-router non è esportato dall'ingresso pubblico: si potrebbe prendere
   * da un percorso interno o installando un pacchetto, e nessuna delle due
   * cose vale il prezzo per tre schermate. Le stesse regole, qui, sono tre
   * righe e non dipendono da niente.
   */
  const vaiA = (href: TabRoute) => {
    if (href === active) return

    // La home sta in fondo alla pila perché l'app parte da lì: tornarci vuol
    // dire scartare quello che c'è sopra, non aggiungerne un'altra copia.
    if (href === '/') {
      router.dismissTo('/')
      return
    }

    // Dalla home si sale di uno, così il tasto indietro riporta alla home.
    if (active === '/') {
      router.push(href)
      return
    }

    // Fra due schede che non sono la home si sostituisce: la pila resta
    // profonda due, home compresa, qualunque sia il giro fatto.
    router.replace(href)
  }

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
              onPress={() => vaiA(tab.href)}
              className="flex-1 items-center gap-0.5 py-2.5 active:opacity-70"
            >
              <tab.Icon active={selected} />
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
