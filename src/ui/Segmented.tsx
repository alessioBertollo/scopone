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
}

const SELECTED_BG: Record<SegmentTone, string> = {
  a: 'bg-team-a',
  b: 'bg-team-b',
  neutral: 'bg-surface',
}

const SELECTED_TEXT: Record<SegmentTone, string> = {
  a: 'text-white',
  b: 'text-white',
  neutral: 'text-ink',
}

export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  return (
    <View className="flex-row rounded-2xl bg-sunken p-1">
      {options.map((option) => {
        const selected = option.value === value
        const tone = option.tone ?? 'neutral'

        return (
          <Pressable
            key={option.value}
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
                'font-medium text-sm',
                selected ? SELECTED_TEXT[tone] : 'text-muted',
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
