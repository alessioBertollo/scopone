import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { PrimieraCardsInput } from '../src/components/PrimieraCardsInput'
import { CARDS_PER_SUIT, DECK_SIZE } from '../src/domain/cards'
import { type HandInput, MAX_SCOPE_PER_HAND, scoreHand, validateHand } from '../src/domain/hand'
import type { BestBySuit, PrimieraInput } from '../src/domain/primiera'
import type { ByTeam, TeamId } from '../src/domain/teams'
import { useTranslation } from '../src/i18n/useTranslation'
import { useMatchStore } from '../src/store/match-store'
import { Button } from '../src/ui/Button'
import { Card } from '../src/ui/Card'
import { Screen } from '../src/ui/Screen'
import { Segmented } from '../src/ui/Segmented'
import { Stepper } from '../src/ui/Stepper'

type PrimieraChoice = TeamId | 'pari'
type OptionalTeam = TeamId | 'none'

const EMPTY_BEST: ByTeam<BestBySuit> = { A: {}, B: {} }

export default function HandScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const params = useLocalSearchParams<{ index?: string }>()

  const match = useMatchStore((state) => state.match)
  const addHand = useMatchStore((state) => state.addHand)
  const replaceHand = useMatchStore((state) => state.replaceHand)
  const removeHand = useMatchStore((state) => state.removeHand)

  const rules = match.rules
  const teamNames = match.teamNames

  const editIndex = params.index !== undefined ? Number(params.index) : null
  const existing = editIndex !== null ? match.hands[editIndex] : undefined

  const [cardsA, setCardsA] = useState(() => existing?.cards.A ?? 20)
  const [denariA, setDenariA] = useState(() => existing?.denari.A ?? 5)
  const [settebello, setSettebello] = useState<TeamId>(() => existing?.settebello ?? 'A')

  const primieraMode = rules.primieraMode
  const [primieraChoice, setPrimieraChoice] = useState<PrimieraChoice>(() =>
    existing?.primiera.mode === 'manual' ? (existing.primiera.winner ?? 'pari') : 'pari',
  )
  const [primieraBest, setPrimieraBest] = useState<ByTeam<BestBySuit>>(() =>
    existing?.primiera.mode === 'cards' ? existing.primiera.best : EMPTY_BEST,
  )

  const [scopeA, setScopeA] = useState(() => existing?.scope.A ?? 0)
  const [scopeB, setScopeB] = useState(() => existing?.scope.B ?? 0)

  const [napolaTeam, setNapolaTeam] = useState<OptionalTeam>(
    () => existing?.napola?.team ?? 'none',
  )
  const [napolaLength, setNapolaLength] = useState(() => existing?.napola?.length ?? 3)
  const [donnaTeam, setDonnaTeam] = useState<TeamId>(() => existing?.donna ?? 'A')

  const hand = useMemo<HandInput>(() => {
    const primiera: PrimieraInput =
      primieraMode === 'cards'
        ? { mode: 'cards', best: primieraBest }
        : { mode: 'manual', winner: primieraChoice === 'pari' ? null : primieraChoice }

    const next: HandInput = {
      cards: { A: cardsA, B: DECK_SIZE - cardsA },
      denari: { A: denariA, B: CARDS_PER_SUIT - denariA },
      settebello,
      primiera,
      scope: { A: scopeA, B: scopeB },
    }

    if (rules.napolaEnabled && napolaTeam !== 'none') {
      next.napola = { team: napolaTeam, length: napolaLength }
    }
    if (rules.donnaEnabled) {
      next.donna = donnaTeam
    }

    return next
  }, [
    cardsA,
    denariA,
    settebello,
    primieraMode,
    primieraChoice,
    primieraBest,
    scopeA,
    scopeB,
    napolaTeam,
    napolaLength,
    donnaTeam,
    rules,
  ])

  const issues = validateHand(hand, rules)
  const preview = issues.length === 0 ? scoreHand(hand, rules) : null

  const teamOptions = [
    { value: 'A' as const, label: teamNames.A, tone: 'a' as const },
    { value: 'B' as const, label: teamNames.B, tone: 'b' as const },
  ]

  const optionalTeamOptions = [
    { value: 'none' as const, label: t('hand.nobody'), tone: 'neutral' as const },
    ...teamOptions,
  ]

  const save = () => {
    if (issues.length > 0) return
    if (editIndex !== null) replaceHand(editIndex, hand)
    else addHand(hand)
    router.back()
  }

  const destroy = () => {
    if (editIndex === null) return
    removeHand(editIndex)
    router.back()
  }

  return (
    <Screen
      scroll
      footer={
        <View className="gap-2">
          {issues.length > 0 ? (
            <View className="rounded-xl bg-danger/10 px-3 py-2">
              <Text className="text-danger text-xs">{issues[0]?.message}</Text>
              {issues.length > 1 ? (
                <Text className="mt-0.5 text-danger/70 text-xs">
                  {issues.length === 2
                    ? t('hand.oneMoreIssue')
                    : t('hand.manyMoreIssues', { numero: issues.length - 1 })}
                </Text>
              ) : null}
            </View>
          ) : preview ? (
            <View className="flex-row items-center justify-between rounded-xl bg-sunken px-3 py-2">
              <Text className="text-muted text-xs">{t('hand.points')}</Text>
              <Text>
                <Text className="font-semibold text-team-a">{preview.totals.A}</Text>
                <Text className="text-muted"> — </Text>
                <Text className="font-semibold text-team-b">{preview.totals.B}</Text>
              </Text>
            </View>
          ) : null}

          <Button
            label={editIndex !== null ? t('hand.save') : t('hand.add')}
            testID="salva-mano"
            onPress={save}
            disabled={issues.length > 0}
          />
          {editIndex !== null ? (
            <Button
              label={t('hand.delete')}
              variant="danger"
              testID="elimina-mano"
              onPress={destroy}
            />
          ) : null}
        </View>
      }
    >
      <View className="flex-row items-center justify-between pt-2">
        <Text className="font-bold text-2xl text-ink">
          {editIndex !== null ? t('hand.title', { numero: editIndex + 1 }) : t('hand.newTitle')}
        </Text>
        <Pressable
          testID="annulla-mano"
          accessibilityRole="button"
          onPress={() => router.back()}
          className="px-2 py-1 active:opacity-60"
        >
          <Text className="text-base text-muted">{t('common.cancel')}</Text>
        </Pressable>
      </View>

      <Card title={t('hand.cards')} subtitle={t('hand.cardsHint')}>
        <Stepper
          label={teamNames.A}
          tone="a"
          testID="carte"
          value={cardsA}
          onChange={setCardsA}
          max={DECK_SIZE}
          hint={`${teamNames.B}: ${DECK_SIZE - cardsA}`}
        />
      </Card>

      <Card title={t('hand.denari')} subtitle={t('hand.denariHint')}>
        <Stepper
          label={teamNames.A}
          tone="a"
          testID="denari"
          value={denariA}
          onChange={setDenariA}
          max={CARDS_PER_SUIT}
          hint={`${teamNames.B}: ${CARDS_PER_SUIT - denariA}`}
        />
      </Card>

      <Card title={t('hand.settebello')} subtitle={t('hand.settebelloHint')}>
        <Segmented
          options={teamOptions}
          value={settebello}
          onChange={setSettebello}
          testID="settebello"
        />
      </Card>

      {rules.primieraEnabled ? (
        <Card title={t('hand.primiera')}>
          {primieraMode === 'manual' ? (
            <Segmented
              options={[
                { value: 'A' as const, label: teamNames.A, tone: 'a' as const },
                { value: 'pari' as const, label: t('hand.tie'), tone: 'neutral' as const },
                { value: 'B' as const, label: teamNames.B, tone: 'b' as const },
              ]}
              value={primieraChoice}
              onChange={setPrimieraChoice}
              testID="primiera"
            />
          ) : (
            <PrimieraCardsInput
              best={primieraBest}
              teamNames={teamNames}
              onChange={setPrimieraBest}
            />
          )}
        </Card>
      ) : null}

      <Card
        title={t('hand.scope')}
        subtitle={t('hand.scopeHint', { massimo: MAX_SCOPE_PER_HAND })}
      >
        <Stepper
          label={teamNames.A}
          tone="a"
          testID="scope-a"
          value={scopeA}
          onChange={setScopeA}
          max={MAX_SCOPE_PER_HAND - scopeB}
        />
        <Stepper
          label={teamNames.B}
          tone="b"
          testID="scope-b"
          value={scopeB}
          onChange={setScopeB}
          max={MAX_SCOPE_PER_HAND - scopeA}
        />
      </Card>

      {rules.napolaEnabled ? (
        <Card title={t('hand.napola')} subtitle={t('hand.napolaHint')}>
          <View className="gap-3">
            <Segmented
              options={optionalTeamOptions}
              value={napolaTeam}
              onChange={setNapolaTeam}
            />
            {napolaTeam !== 'none' ? (
              <Stepper
                label={t('hand.napolaLength')}
                value={napolaLength}
                onChange={setNapolaLength}
                min={3}
                max={CARDS_PER_SUIT}
              />
            ) : null}
          </View>
        </Card>
      ) : null}

      {rules.donnaEnabled ? (
        <Card title={t('hand.donna')} subtitle={t('hand.donnaHint')}>
          <Segmented
            options={teamOptions}
            value={donnaTeam}
            onChange={setDonnaTeam}
            testID="donna"
          />
        </Card>
      ) : null}
    </Screen>
  )
}
