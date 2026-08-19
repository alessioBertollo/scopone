import { useCallback } from 'react'
import { resolveLanguage, useSettingsStore } from '../store/settings-store'
import { type TranslationKey, translate } from './index'

/**
 * Traduce secondo la lingua scelta, o quella del dispositivo se l'utente non
 * ha scelto. Cambiare lingua ridisegna l'app senza riavviarla, perché la
 * preferenza vive nello store.
 */
export function useTranslation() {
  const choice = useSettingsStore((state) => state.language)
  const language = resolveLanguage(choice)

  const t = useCallback(
    (key: TranslationKey, values?: Record<string, string | number>) =>
      translate(language, key, values),
    [language],
  )

  return { t, language }
}
