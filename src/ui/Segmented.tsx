import { Pressable, Text, View } from 'react-native'
import { cn } from './cn'

export type SegmentTone = 'a' | 'b' | 'neutral'

export type SegmentedOption<T extends string> = {
  value: T
  label: string
  tone?: SegmentTone
}

type SegmentedProps<T extends string> = {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  /**
   * Prefisso per i test end-to-end: ogni opzione espone `<testID>-<valore>`,
   * così i flow non dipendono dalle etichette, che sono nomi di squadra.
   */
  testID?: string
}

// L'opzione scelta ha uno sfondo pieno e testo bianco: su carta avorio il
// vecchio bianco-su-beige si distingueva appena.
const SELECTED_BG: Record<SegmentTone, string> = {
  a: 'bg-team-a',
  b: 'bg-team-b',
  neutral: 'bg-felt',
}

const SELECTED_TEXT: Record<SegmentTone, string> = {
  a: 'text-white',
  b: 'text-white',
  neutral: 'text-white',
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  testID,
}: SegmentedProps<T>) {
  return (
    <View className="flex-row rounded-2xl border border-line bg-sunken p-1">
      {options.map((option) => {
        const selected = option.value === value
        const tone = option.tone ?? 'neutral'

        return (
          <Pressable
            key={option.value}
            testID={testID ? `${testID}-${option.value}` : undefined}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className={cn(
              'flex-1 items-center justify-center rounded-xl px-2 py-2.5 active:opacity-70',
              selected && SELECTED_BG[tone],
            )}
          >
            <Text
              numberOfLines={1}
              className={cn(
                'text-sm',
                selected ? 'font-semibold' : 'font-medium',
                selected ? SELECTED_TEXT[tone] : 'text-ink/70',
              )}
            >
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
