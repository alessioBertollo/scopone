import type { ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import { type Edge, SafeAreaView } from 'react-native-safe-area-context'
import { cn } from './cn'

type ScreenProps = {
  children: ReactNode
  /** Aggiunge uno ScrollView interno, per le schermate più lunghe dello schermo. */
  scroll?: boolean
  /** Contenuto ancorato in fondo, fuori dallo scroll. */
  footer?: ReactNode
  /**
   * Contenuto sovrapposto a tutta la schermata e inerte al tocco. Sta fuori
   * dallo scroll di proposito: dentro scorrerebbe col contenuto, e dei
   * coriandoli che scorrono con la lista non cadono, traslocano.
   */
  overlay?: ReactNode
  /**
   * Per le schede di primo livello: il margine di sicurezza in basso lo
   * gestisce già `TabBar`, che sta sotto. Applicarlo anche qui raddoppierebbe
   * lo spazio fra il contenuto e la barra.
   */
  tabs?: boolean
}

export function Screen({
  children,
  scroll = false,
  footer,
  overlay,
  tabs = false,
}: ScreenProps) {
  const padding = 'px-5'
  const edges: Edge[] = tabs ? ['top'] : ['top', 'bottom']

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={edges}>
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

      {overlay ? (
        <View pointerEvents="none" className="absolute inset-0">
          {overlay}
        </View>
      ) : null}
    </SafeAreaView>
  )
}
