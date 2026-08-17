import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { cn } from './cn'

type CardProps = {
  children: ReactNode
  title?: string
  subtitle?: string
  className?: string
}

export function Card({ children, title, subtitle, className }: CardProps) {
  return (
    <View className={cn('rounded-card border border-line bg-surface p-4', className)}>
      {title ? (
        <View className="mb-3">
          <Text className="font-semibold text-ink text-xs uppercase tracking-widest">
            {title}
          </Text>
          {subtitle ? <Text className="mt-1 text-muted text-xs">{subtitle}</Text> : null}
        </View>
      ) : null}
      {children}
    </View>
  )
}
