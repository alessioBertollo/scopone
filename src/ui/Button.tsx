import { Pressable, Text } from 'react-native'
import { cn } from './cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

type ButtonProps = {
  label: string
  onPress: () => void
  variant?: Variant
  disabled?: boolean
  className?: string
  /** Identificatore stabile per i test end-to-end. */
  testID?: string
}

const CONTAINER: Record<Variant, string> = {
  primary: 'bg-felt',
  secondary: 'bg-surface border border-line',
  ghost: 'bg-transparent',
  danger: 'bg-transparent border border-danger',
}

const LABEL: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-ink',
  ghost: 'text-muted',
  danger: 'text-danger',
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  className,
  testID,
}: ButtonProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={cn(
        'items-center justify-center rounded-2xl px-5 py-4 active:opacity-70',
        CONTAINER[variant],
        disabled && 'opacity-40',
        className,
      )}
    >
      <Text numberOfLines={1} className={cn('font-semibold text-base', LABEL[variant])}>
        {label}
      </Text>
    </Pressable>
  )
}
