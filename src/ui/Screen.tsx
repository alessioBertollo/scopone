import type { ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { cn } from './cn'

type ScreenProps = {
  children: ReactNode
  /** Aggiunge uno ScrollView interno, per le schermate più lunghe dello schermo. */
  scroll?: boolean
  /** Contenuto ancorato in fondo, fuori dallo scroll. */
  footer?: ReactNode
}

export function Screen({ children, scroll = false, footer }: ScreenProps) {
  const padding = 'px-5'

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      {scroll ? (
        <ScrollView
          className={cn('flex-1', padding)}
          contentContainerClassName="py-4 gap-4"
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View className={cn('flex-1 gap-4 py-4', padding)}>{children}</View>
      )}

      {footer ? (
        <View className={cn('border-line border-t bg-surface pt-3 pb-2', padding)}>
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  )
}
