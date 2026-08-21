import { useFocusEffect, useRouter } from 'expo-router'
import { type ReactNode, useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Share, Text, TextInput, View } from 'react-native'
import { useTranslation } from '../src/i18n/useTranslation'
import type { Friend } from '../src/lib/friends'
import { isBackendConfigured } from '../src/lib/supabase'
import { useAuthStore } from '../src/store/auth-store'
import { useFriendsStore } from '../src/store/friends-store'
import { Button } from '../src/ui/Button'
import { Card } from '../src/ui/Card'
import { Screen } from '../src/ui/Screen'

const PLACEHOLDER_COLOR = '#8A8580'

function SectionTitle({ children }: { children: string }) {
  return <Text className="mt-2 text-muted text-xs uppercase tracking-widest">{children}</Text>
}

function ErrorNote({ message }: { message: string }) {
  return (
    <View className="rounded-xl bg-danger/10 px-3 py-2">
      <Text className="text-danger text-sm">{message}</Text>
    </View>
  )
}

/** Una riga con nome e uno o due pulsanti, per le tre liste della schermata. */
function FriendRow({
  friend,
  busy,
  children,
}: {
  friend: Friend
  busy: boolean
  children: ReactNode
}) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text numberOfLines={1} className="flex-1 text-base text-ink">
        {friend.displayName}
      </Text>
      {busy ? <ActivityIndicator /> : <View className="flex-row gap-2">{children}</View>}
    </View>
  )
}

export default function FriendsScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const authStatus = useAuthStore((state) => state.status)

  const friends = useFriendsStore((state) => state.friends)
  const code = useFriendsStore((state) => state.code)
  const status = useFriendsStore((state) => state.status)
  const error = useFriendsStore((state) => state.error)
  const refresh = useFriendsStore((state) => state.refresh)
  const send = useFriendsStore((state) => state.send)
  const accept = useFriendsStore((state) => state.accept)
  const remove = useFriendsStore((state) => state.remove)

  const [addCode, setAddCode] = useState('')
  const [addBusy, setAddBusy] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [actingOn, setActingOn] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      void refresh()
    }, [refresh]),
  )

  const { accepted, incoming, outgoing } = useMemo(() => {
    const accepted: Friend[] = []
    const incoming: Friend[] = []
    const outgoing: Friend[] = []

    for (const friend of friends) {
      if (friend.status === 'accepted') accepted.push(friend)
      else if (friend.incoming) incoming.push(friend)
      else outgoing.push(friend)
    }

    return { accepted, incoming, outgoing }
  }, [friends])

  const condividiCodice = () => {
    if (!code) return
    void Share.share({ message: code })
  }

  const manda = async () => {
    setAddBusy(true)
    setAddError(null)
    try {
      await send(addCode)
      setAddCode('')
    } catch (cause) {
      setAddError(cause instanceof Error ? cause.message : t('common.error'))
    } finally {
      setAddBusy(false)
    }
  }

  const agisci = async (profileId: string, action: () => Promise<void>) => {
    setActingOn(profileId)
    try {
      await action()
    } catch {
      // L'errore resta silenzioso qui: la riga su cui si agiva è ancora
      // sotto gli occhi di chi ha toccato il pulsante, riprovare è immediato.
    } finally {
      setActingOn(null)
    }
  }

  const chiediRimozione = (friend: Friend) => {
    Alert.alert(
      t('friends.removeConfirmTitle', { nome: friend.displayName }),
      t('friends.removeConfirmBody'),
      [
        { text: t('friends.removeConfirmCancel'), style: 'cancel' },
        {
          text: t('friends.removeConfirmOk'),
          style: 'destructive',
          onPress: () => void agisci(friend.profileId, () => remove(friend.profileId)),
        },
      ],
    )
  }

  if (!isBackendConfigured) {
    return (
      <Screen scroll tabs>
        <Text className="pt-2 font-bold text-2xl text-ink">{t('friends.title')}</Text>
        <Card>
          <Text className="text-ink text-sm">{t('friends.noBackend')}</Text>
        </Card>
      </Screen>
    )
  }

  if (authStatus !== 'signedIn') {
    const attesa = authStatus === 'unknown'

    return (
      <Screen
        scroll
        tabs
        footer={
          <Button
            label={attesa ? t('friends.wait') : t('friends.signIn')}
            testID="vai-accesso-amici"
            disabled={attesa}
            onPress={() => router.push('/sign-in')}
          />
        }
      >
        <Text className="pt-2 font-bold text-2xl text-ink">{t('friends.title')}</Text>
        <Card title={t('friends.needAccount')}>
          <Text className="text-ink text-sm">{t('friends.needAccountBody')}</Text>
          {attesa ? <ActivityIndicator className="mt-3" /> : null}
        </Card>
      </Screen>
    )
  }

  return (
    <Screen scroll tabs>
      <Text className="pt-2 font-bold text-2xl text-ink">{t('friends.title')}</Text>

      {error ? <ErrorNote message={error} /> : null}

      <Card title={t('friends.codeTitle')} subtitle={t('friends.codeHint')}>
        {code ? (
          <>
            <Text
              testID="codice-amicizia"
              selectable
              className="text-center font-bold text-4xl text-felt tracking-[8px]"
            >
              {code}
            </Text>
            <View className="mt-3">
              <Button
                label={t('friends.share')}
                variant="secondary"
                testID="condividi-codice-amicizia"
                onPress={condividiCodice}
              />
            </View>
          </>
        ) : (
          <ActivityIndicator />
        )}
      </Card>

      <Card title={t('friends.addTitle')} subtitle={t('friends.addHint')}>
        <View className="flex-row gap-2">
          <TextInput
            testID="campo-codice-amico"
            value={addCode}
            onChangeText={(value) =>
              setAddCode(
                value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, '')
                  .slice(0, 6),
              )
            }
            editable={!addBusy}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder={t('friends.addPlaceholder')}
            placeholderTextColor={PLACEHOLDER_COLOR}
            className="flex-1 rounded-xl bg-sunken px-4 py-3 text-center text-ink text-lg tracking-[4px]"
          />
          <Button
            label={addBusy ? t('friends.addSending') : t('friends.addSend')}
            testID="manda-richiesta-amicizia"
            disabled={addBusy || addCode.length !== 6}
            onPress={() => void manda()}
          />
        </View>
        {addError ? (
          <View className="mt-2">
            <ErrorNote message={addError} />
          </View>
        ) : null}
      </Card>

      {incoming.length > 0 ? (
        <>
          <SectionTitle>{t('friends.incoming')}</SectionTitle>
          <Card>
            <View className="gap-3">
              {incoming.map((friend) => (
                <FriendRow
                  key={friend.profileId}
                  friend={friend}
                  busy={actingOn === friend.profileId}
                >
                  <Button
                    label={t('friends.accept')}
                    testID={`accetta-${friend.profileId}`}
                    onPress={() =>
                      void agisci(friend.profileId, () => accept(friend.profileId))
                    }
                  />
                  <Button
                    label={t('friends.decline')}
                    variant="ghost"
                    testID={`rifiuta-${friend.profileId}`}
                    onPress={() =>
                      void agisci(friend.profileId, () => remove(friend.profileId))
                    }
                  />
                </FriendRow>
              ))}
            </View>
          </Card>
        </>
      ) : null}

      {outgoing.length > 0 ? (
        <>
          <SectionTitle>{t('friends.outgoing')}</SectionTitle>
          <Card>
            <View className="gap-3">
              {outgoing.map((friend) => (
                <FriendRow
                  key={friend.profileId}
                  friend={friend}
                  busy={actingOn === friend.profileId}
                >
                  <Button
                    label={t('friends.cancel')}
                    variant="ghost"
                    testID={`ritira-${friend.profileId}`}
                    onPress={() =>
                      void agisci(friend.profileId, () => remove(friend.profileId))
                    }
                  />
                </FriendRow>
              ))}
            </View>
          </Card>
        </>
      ) : null}

      <SectionTitle>{t('friends.accepted')}</SectionTitle>
      {status === 'loading' && friends.length === 0 ? (
        <Card>
          <ActivityIndicator />
        </Card>
      ) : accepted.length === 0 ? (
        <Card>
          <Text className="text-muted text-sm">{t('friends.empty')}</Text>
        </Card>
      ) : (
        <Card>
          <View className="gap-3">
            {accepted.map((friend) => (
              <FriendRow
                key={friend.profileId}
                friend={friend}
                busy={actingOn === friend.profileId}
              >
                <Button
                  label={t('friends.removeConfirmOk')}
                  variant="ghost"
                  testID={`rimuovi-${friend.profileId}`}
                  onPress={() => chiediRimozione(friend)}
                />
              </FriendRow>
            ))}
          </View>
        </Card>
      )}
    </Screen>
  )
}
