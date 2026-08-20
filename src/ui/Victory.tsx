import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { AccessibilityInfo, Text, useWindowDimensions, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import type { TeamId } from '../domain/teams'
import {
  CONFETTI_COUNT,
  type Confetto,
  type ConfettoTone,
  celebrationSeed,
  confetti,
} from './celebration'

export { celebrationSeed }

/**
 * Chi ha chiesto al sistema meno animazioni non deve riceverle comunque. La
 * vittoria resta leggibile senza coriandoli: si perde la festa, non
 * l'informazione.
 */
function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false)

  useEffect(() => {
    let annullato = false

    void AccessibilityInfo.isReduceMotionEnabled().then((attivo) => {
      if (!annullato) setReduce(attivo)
    })
    const iscrizione = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce)

    return () => {
      annullato = true
      iscrizione.remove()
    }
  }, [])

  return reduce
}

function toneClass(tone: ConfettoTone, team: TeamId): string {
  if (tone === 'brass') return 'text-brass'
  if (tone === 'felt') return 'text-felt'
  return team === 'A' ? 'text-team-a' : 'text-team-b'
}

function Piece({
  piece,
  width,
  height,
  team,
}: {
  piece: Confetto
  width: number
  height: number
  team: TeamId
}) {
  const progress = useSharedValue(0)

  useEffect(() => {
    // `Easing.in` accelera la caduta: a velocità costante sembra una
    // discesa in ascensore, non un pezzo di carta che cade.
    progress.value = withDelay(
      piece.delay,
      withTiming(1, { duration: piece.duration, easing: Easing.in(Easing.quad) }),
    )
  }, [piece, progress])

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: progress.value * (height + piece.size * 3) },
      { translateX: progress.value * piece.drift * width },
      { rotate: `${progress.value * piece.spin * 360}deg` },
    ],
    // Svanisce solo negli ultimi istanti: sparire a metà schermo si nota.
    opacity: 1 - progress.value ** 4,
  }))

  return (
    <Animated.View
      style={[{ position: 'absolute', left: piece.left * width, top: -piece.size * 3 }, style]}
    >
      <Text className={toneClass(piece.tone, team)} style={{ fontSize: piece.size }}>
        {piece.glyph}
      </Text>
    </Animated.View>
  )
}

/**
 * I coriandoli cadono una volta e si fermano. Un ciclo infinito costerebbe
 * batteria per sempre su una schermata che si lascia aperta, e la festa che
 * non finisce smette di essere una festa.
 */
export function Confetti({ team, seed }: { team: TeamId; seed: number }) {
  const { width, height } = useWindowDimensions()
  const reduceMotion = useReduceMotion()
  const pieces = useMemo(() => confetti(CONFETTI_COUNT, seed), [seed])

  if (reduceMotion) return null

  return (
    <View className="flex-1 overflow-hidden">
      {pieces.map((piece, index) => (
        <Piece
          // biome-ignore lint/suspicious/noArrayIndexKey: i pezzi sono una sequenza fissa, non vengono riordinati e non hanno stato da preservare
          key={`confetto-${index}`}
          piece={piece}
          width={width}
          height={height}
          team={team}
        />
      ))}
    </View>
  )
}

/**
 * Un ingrandimento singolo per il numero della squadra che ha vinto. Parte
 * poco dopo la fascia invece che insieme: tre cose che si muovono allo stesso
 * istante si leggono come un sobbalzo, in fila si leggono come un gesto.
 */
export function WinningNumber({ children }: { children: ReactNode }) {
  const reduceMotion = useReduceMotion()
  const scale = useSharedValue(1)

  useEffect(() => {
    if (reduceMotion) return

    scale.value = withDelay(
      160,
      withSequence(
        withSpring(1.18, { damping: 6, stiffness: 180 }),
        withSpring(1, { damping: 12, stiffness: 140 }),
      ),
    )
  }, [reduceMotion, scale])

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return <Animated.View style={style}>{children}</Animated.View>
}

/**
 * La fascia del vincitore entra con un rimbalzo. È l'unico momento dell'app
 * in cui vale la pena farsi notare: tutto il resto è un contapunti, e un
 * contapunti che si muove troppo dà fastidio.
 */
export function VictoryBanner({ children }: { children: ReactNode }) {
  const reduceMotion = useReduceMotion()
  const opacity = useSharedValue(0)
  const scale = useSharedValue(0.85)

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1
      scale.value = 1
      return
    }

    opacity.value = withTiming(1, { duration: 240 })
    scale.value = withSequence(
      withSpring(1.05, { damping: 7, stiffness: 160 }),
      withSpring(1, { damping: 14, stiffness: 140 }),
    )
  }, [reduceMotion, opacity, scale])

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }))

  return (
    <Animated.View style={style}>
      <View className="rounded-card bg-felt p-4">{children}</View>
    </Animated.View>
  )
}
