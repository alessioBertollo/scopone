import { Pressable, Text, View } from 'react-native'
import { cn } from './cn'

type StepperProps = {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  /** Testo secondario, ad esempio il valore derivato per l'altra squadra. */
  hint?: string
  tone?: 'a' | 'b' | 'neutral'
}

const VALUE_TONE = {
  a: 'text-team-a',
  b: 'text-team-b',
  neutral: 'text-ink',
} as const

function StepButton({
  symbol,
  label,
  onPress,
  disabled,
}: {
  symbol: string
  label: string
  onPress: () => void
  disabled: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={cn(
        'h-11 w-11 items-center justify-center rounded-full bg-sunken active:opacity-60',
        disabled && 'opacity-30',
      )}
    >
      <Text className="font-semibold text-ink text-xl leading-none">{symbol}</Text>
    </Pressable>
  )
}

export function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = 99,
  hint,
  tone = 'neutral',
}: StepperProps) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <View className="flex-1 pr-3">
        <Text className="text-base text-ink">{label}</Text>
        {hint ? <Text className="mt-0.5 text-muted text-xs">{hint}</Text> : null}
      </View>

      <View className="flex-row items-center gap-2">
        <StepButton
          symbol="−"
          label={`Diminuisci ${label}`}
          disabled={value <= min}
          onPress={() => onChange(Math.max(min, value - 1))}
        />
        <Text
          className={cn('w-9 text-center font-semibold text-lg', VALUE_TONE[tone])}
          accessibilityLabel={`${label}: ${value}`}
        >
          {value}
        </Text>
        <StepButton
          symbol="+"
          label={`Aumenta ${label}`}
          disabled={value >= max}
          onPress={() => onChange(Math.min(max, value + 1))}
        />
      </View>
    </View>
  )
}
