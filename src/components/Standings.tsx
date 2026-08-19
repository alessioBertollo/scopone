import { useState } from 'react'
import { Text, View } from 'react-native'
import type { StandingsMatch } from '../domain/standings'
import { differential, pairStandings, playerStandings } from '../domain/standings'
import { useTranslation } from '../i18n/useTranslation'
import { cn } from '../ui/cn'
import { Segmented } from '../ui/Segmented'

type Props = {
  matches: StandingsMatch[]
  /** Nome da mostrare per ciascun id: senza, resterebbe un identificativo. */
  nameOf: (profileId: string) => string
}

type View_ = 'players' | 'pairs'

function Row({
  position,
  name,
  played,
  won,
  diff,
}: {
  position: number
  name: string
  played: number
  won: number
  diff: number
}) {
  return (
    <View className="flex-row items-center border-line border-b py-2 last:border-b-0">
      <Text className="w-6 text-muted text-xs tabular-nums">{position}</Text>
      <Text className="flex-1 pr-2 text-ink text-sm" numberOfLines={1}>
        {name}
      </Text>
      <Text className="w-8 text-center text-muted text-sm tabular-nums">{played}</Text>
      <Text className="w-8 text-center font-semibold text-ink text-sm tabular-nums">{won}</Text>
      <Text
        className={cn(
          'w-12 text-right text-sm tabular-nums',
          diff > 0 ? 'text-felt' : diff < 0 ? 'text-danger' : 'text-muted',
        )}
      >
        {diff > 0 ? `+${diff}` : diff}
      </Text>
    </View>
  )
}

export function Standings({ matches, nameOf }: Props) {
  const { t } = useTranslation()
  const [view, setView] = useState<View_>('players')

  if (matches.length === 0) {
    return <Text className="text-muted text-sm">{t('standings.empty')}</Text>
  }

  const righe =
    view === 'players'
      ? playerStandings(matches).map((riga) => ({
          key: riga.profileId,
          name: nameOf(riga.profileId),
          ...riga,
        }))
      : pairStandings(matches).map((riga) => ({
          key: riga.profileIds.join('|'),
          name: riga.profileIds.map(nameOf).join(' e '),
          ...riga,
        }))

  return (
    <View className="gap-3">
      <Segmented
        testID="classifica-vista"
        options={[
          { value: 'players' as const, label: t('standings.byPlayer') },
          { value: 'pairs' as const, label: t('standings.byPair') },
        ]}
        value={view}
        onChange={setView}
      />

      <View>
        <View className="flex-row items-center border-line border-b pb-1.5">
          <Text className="w-6" />
          <Text className="flex-1" />
          <Text className="w-8 text-center text-muted text-xs">{t('standings.played')}</Text>
          <Text className="w-8 text-center text-muted text-xs">{t('standings.won')}</Text>
          <Text className="w-12 text-right text-muted text-xs">{t('standings.diff')}</Text>
        </View>

        {righe.map((riga, indice) => (
          <Row
            key={riga.key}
            position={indice + 1}
            name={riga.name}
            played={riga.played}
            won={riga.won}
            diff={differential(riga)}
          />
        ))}
      </View>

      <Text className="text-muted text-xs">{t('standings.legend')}</Text>
    </View>
  )
}
