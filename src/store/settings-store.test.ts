import { beforeEach, describe, expect, it } from 'vitest'
import { resolveLanguage, useSettingsStore } from './settings-store'

const store = useSettingsStore

beforeEach(() => {
  store.setState({ theme: 'system', deck: 'italiane', language: 'system' })
})

describe('impostazioni', () => {
  it('parte seguendo il telefono invece di imporre una scelta', () => {
    const state = store.getState()
    expect(state.theme).toBe('system')
    expect(state.language).toBe('system')
  })

  it('parte dal mazzo italiano, quello di chi gioca a scopone', () => {
    expect(store.getState().deck).toBe('italiane')
  })

  it('conserva le scelte', () => {
    store.getState().setTheme('dark')
    store.getState().setDeck('francesi')
    store.getState().setLanguage('en')

    const state = store.getState()
    expect(state.theme).toBe('dark')
    expect(state.deck).toBe('francesi')
    expect(state.language).toBe('en')
  })
})

describe('resolveLanguage', () => {
  it('rispetta una scelta esplicita', () => {
    expect(resolveLanguage('en')).toBe('en')
    expect(resolveLanguage('it')).toBe('it')
  })

  it('con "sistema" ricade sulla lingua del dispositivo', () => {
    // Il finto expo-localization dichiara italiano.
    expect(resolveLanguage('system')).toBe('it')
  })
})
