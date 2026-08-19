import { resolveLanguage, useSettingsStore } from '../store/settings-store'
import { type TranslationKey, translate } from './index'

/**
 * Traduce fuori da React, dove non si possono usare gli hook: serve agli
 * strati dati, che producono messaggi d'errore letti dall'utente.
 *
 * Vive in un file suo e non in `index.ts` perché lo store delle impostazioni
 * importa `deviceLanguage` da lì: metterlo insieme creerebbe un ciclo.
 */
export function tr(key: TranslationKey, values?: Record<string, string | number>): string {
  return translate(resolveLanguage(useSettingsStore.getState().language), key, values)
}
