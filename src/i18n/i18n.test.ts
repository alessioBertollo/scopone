import { describe, expect, it as test, vi } from 'vitest'
import { en } from './en'
import { translate } from './index'
import { it } from './it'

describe('dizionari', () => {
  test('le due lingue hanno esattamente le stesse chiavi', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(it).sort())
  })

  test('nessuna traduzione è vuota', () => {
    for (const [chiave, testo] of Object.entries(en)) {
      expect(testo, `en: ${chiave}`).not.toBe('')
    }
    for (const [chiave, testo] of Object.entries(it)) {
      expect(testo, `it: ${chiave}`).not.toBe('')
    }
  })

  test('i segnaposto dichiarati in italiano esistono anche in inglese', () => {
    const segnaposto = (testo: string) => (testo.match(/\{(\w+)\}/g) ?? []).sort()
    for (const chiave of Object.keys(it) as (keyof typeof it)[]) {
      expect(segnaposto(en[chiave]), `chiave ${chiave}`).toEqual(segnaposto(it[chiave]))
    }
  })
})

describe('translate', () => {
  test('sostituisce i segnaposto', () => {
    expect(translate('it', 'settings.version', { versione: '1.2.3' })).toBe('Versione 1.2.3')
    expect(translate('en', 'settings.version', { versione: '1.2.3' })).toBe('Version 1.2.3')
  })

  test('restituisce il testo grezzo quando non ci sono valori', () => {
    expect(translate('it', 'settings.title')).toBe('Impostazioni')
    expect(translate('en', 'settings.title')).toBe('Settings')
  })
})

describe('deviceLanguage', () => {
  test('non lancia se il modulo nativo manca', async () => {
    vi.resetModules()
    vi.doMock('expo-localization', () => ({
      getLocales: () => {
        throw new Error('Native module not found')
      },
    }))

    const { deviceLanguage } = await import('./index')
    // L'italiano è il ripiego: lo scopone si gioca soprattutto qui.
    expect(deviceLanguage()).toBe('it')

    vi.doUnmock('expo-localization')
    vi.resetModules()
  })
})
