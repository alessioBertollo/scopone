import { useColorScheme } from 'nativewind'
import { Image, View } from 'react-native'
import { type AvatarName, avatarFor } from './avatar-names'
import { avatarImage } from './avatars'
import { cn } from './cn'

/**
 * Gli stessi due valori di `--color-text` in `global.css`. Stanno qui perché
 * `tintColor` vuole un colore vero e non una classe: se cambiano lì, vanno
 * cambiati anche qui.
 */
const INCHIOSTRO = { light: '#1c1917', dark: '#f5f1e8' } as const

type Props = {
  /** L'animale scelto. Se manca o non è riconosciuto, si ricade sul seme. */
  name?: string | null
  /** Di solito l'identificativo del profilo: rende stabile la scelta di ripiego. */
  seed: string
  size?: number
  /** Cerchio di sfondo, per staccare la sagoma da elenchi molto fitti. */
  ring?: boolean
}

export function Avatar({ name, seed, size = 24, ring = false }: Props) {
  const { colorScheme } = useColorScheme()
  const scelto: AvatarName = avatarFor(name, seed)
  const tinta = INCHIOSTRO[colorScheme === 'dark' ? 'dark' : 'light']

  const immagine = (
    <Image
      source={avatarImage(scelto)}
      tintColor={tinta}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
      style={{ width: size, height: size }}
    />
  )

  if (!ring) return immagine

  return (
    <View
      className={cn('items-center justify-center rounded-full bg-sunken')}
      style={{ width: size * 1.6, height: size * 1.6 }}
    >
      {immagine}
    </View>
  )
}
