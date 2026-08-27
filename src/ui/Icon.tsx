import { View } from 'react-native'
import { cn } from './cn'

/**
 * Icone disegnate con `View` e nient'altro.
 *
 * Le emoji che stavano qui prima non potevano seguire il tema: sono glifi a
 * colori fissi, sempre uguali su fondo chiaro e scuro, e stonavano accanto a
 * un'app disegnata a tinte piatte. Un pacchetto di icone vettoriali le
 * risolverebbe, ma costa peso — e `AGENTS.md` dice che il margine è finito.
 *
 * Forme geometriche prendono il colore dalle classi, quindi seguono il tema
 * da sole, non aggiungono un byte e restano nitide a qualunque densità.
 */

type IconProps = { active: boolean }

/** Verde feltro quando è la scheda corrente, grigio quando è a riposo. */
function tint(active: boolean): string {
  return active ? 'bg-felt' : 'bg-muted'
}

/** Un tetto — quadrato ruotato e ritagliato — sopra un corpo. */
export function HomeIcon({ active }: IconProps) {
  return (
    <View className="h-5 w-5 items-center justify-end overflow-hidden">
      <View className={cn('absolute top-0.5 h-3.5 w-3.5 rotate-45 rounded-sm', tint(active))} />
      <View className={cn('h-2 w-3.5 rounded-sm', tint(active))} />
    </View>
  )
}

/** Due dischi sovrapposti: un gruppo, non una persona sola. */
export function FriendsIcon({ active }: IconProps) {
  return (
    <View className="h-5 w-5 flex-row items-center justify-center">
      <View className={cn('h-3.5 w-3.5 rounded-full', tint(active))} />
      <View className={cn('-ml-1.5 h-3.5 w-3.5 rounded-full opacity-50', tint(active))} />
    </View>
  )
}

/** Tre gradini di altezza diversa: un podio si legge come una classifica. */
export function StandingsIcon({ active }: IconProps) {
  return (
    <View className="h-5 w-5 flex-row items-end justify-center gap-0.5">
      <View className={cn('h-2.5 w-1 rounded-sm', tint(active))} />
      <View className={cn('h-4 w-1 rounded-sm', tint(active))} />
      <View className={cn('h-3 w-1 rounded-sm', tint(active))} />
    </View>
  )
}
