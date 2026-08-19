import { getLocales } from 'expo-localization'
import { en } from './en'
import { it } from './it'

/**
 * Traduzioni con dizionari piatti e chiavi esplicite. Niente libreria: le
 * lingue sono due e le chiavi poche centinaia, e una dipendenza in più
 * peserebbe sull'APK più di tutto questo file.
 */
export type Language = 'it' | 'en'

export type Dictionary = typeof it
export type TranslationKey = keyof Dictionary

const DICTIONARIES: Record<Language, Dictionary> = { it, en }

export const LANGUAGES: Language[] = ['it', 'en']

export const LANGUAGE_LABEL: Record<Language, string> = {
  it: 'Italiano',
  en: 'English',
}

/**
 * Lingua del dispositivo, se la conosciamo. L'italiano è il ripiego perché
 * lo scopone si gioca soprattutto qui: per chi ha il telefono in tedesco è
 * comunque meglio dell'inglese approssimativo di una traduzione automatica.
 */
export function deviceLanguage(): Language {
  const preferred = getLocales()[0]?.languageCode
  return preferred === 'en' ? 'en' : 'it'
}

/**
 * I segnaposto si scrivono `{nome}` e si sostituiscono con i valori passati.
 * Una chiave mancante nella lingua scelta ricade sull'italiano invece di
 * mostrare la chiave grezza a chi legge.
 */
export function translate(
  language: Language,
  key: TranslationKey,
  values?: Record<string, string | number>,
): string {
  const testo = DICTIONARIES[language][key] ?? it[key] ?? key
  if (!values) return testo

  return Object.entries(values).reduce(
    (acc, [nome, valore]) => acc.split(`{${nome}}`).join(String(valore)),
    testo,
  )
}
