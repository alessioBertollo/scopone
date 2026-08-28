import { useRouter } from 'expo-router'
import type { ReactElement } from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { TranslationKey } from '../i18n'
import { useTranslation } from '../i18n/useTranslation'
import { useFriendsStore } from '../store/friends-store'
import { useLeaguesStore } from '../store/leagues-store'
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
/**
 * Il numero di cose in attesa su una scheda. Un pallino e non un puntino:
 * «due richieste» e «una» chiedono la stessa azione ma non la stessa fretta.
 */
function Badge({ count }: { count: number }) {
  if (count <= 0) return null

  return (
    <View className="-right-2.5 -top-1 absolute min-w-[16px] items-center justify-center rounded-full bg-felt px-1 py-px">
      <Text className="font-semibold text-[10px] text-white tabular-nums">
        {count > 9 ? '9+' : count}
      </Text>
    </View>
  )
}

export function TabBar({ active }: { active: TabRoute }) {
  const router = useRouter()
  const { t } = useTranslation()

  /**
   * Le richieste di amicizia ricevute e gli inviti alle leghe: le une si
   * sciolgono nella scheda amici, gli altri sulla home, e ognuno conta dove
   * si risolve. Gli inviti mandati da noi non contano — non c'è niente da
   * fare, si aspetta.
   */
  const richieste = useFriendsStore(
    (state) =>
      state.friends.filter((amico) => amico.status === 'pending' && amico.incoming).length,
  )
  const inviti = useLeaguesStore((state) => state.invites.length)

  const inAttesa: Record<TabRoute, number> = {
    '/': inviti,
    '/friends': richieste,
    '/standings': 0,
  }

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
          const attesa = inAttesa[tab.href]

          return (
            <Pressable
              key={tab.href}
              testID={tab.testID}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={
                attesa > 0
                  ? t('tabs.waiting', { etichetta: t(tab.labelKey), numero: attesa })
                  : t(tab.labelKey)
              }
              onPress={() => vaiA(tab.href)}
              className="flex-1 items-center gap-0.5 py-2.5 active:opacity-70"
            >
              <View>
                <tab.Icon active={selected} />
                <Badge count={attesa} />
              </View>
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
