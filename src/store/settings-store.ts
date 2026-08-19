import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { deviceLanguage, type Language } from '../i18n'
import type { DeckKind } from '../lib/deck'

export const SETTINGS_STORAGE_KEY = 'scopone.settings'

/** `system` non è un tema: è "non decido io, decide il telefono". */
export type ThemeChoice = 'system' | 'light' | 'dark'

/** Come sopra: `system` significa seguire la lingua del dispositivo. */
export type LanguageChoice = 'system' | Language

export type SettingsStore = {
  theme: ThemeChoice
  deck: DeckKind
  language: LanguageChoice
  setTheme: (theme: ThemeChoice) => void
  setDeck: (deck: DeckKind) => void
  setLanguage: (language: LanguageChoice) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      // Le impostazioni di partenza non sono opinioni: seguono il telefono, e
      // il mazzo italiano è quello con cui si gioca dove si gioca a scopone.
      theme: 'system',
      deck: 'italiane',
      language: 'system',

      setTheme: (theme) => set({ theme }),
      setDeck: (deck) => set({ deck }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      // Un formato vecchio si scarta: le preferenze si rimettono in dieci
      // secondi, e migrare tre campi non vale il codice che costerebbe.
      migrate: (): Pick<SettingsStore, 'theme' | 'deck' | 'language'> => ({
        theme: 'system',
        deck: 'italiane',
        language: 'system',
      }),
    },
  ),
)

/** Lingua effettiva: la scelta dell'utente, o quella del dispositivo. */
export function resolveLanguage(choice: LanguageChoice): Language {
  return choice === 'system' ? deviceLanguage() : choice
}
