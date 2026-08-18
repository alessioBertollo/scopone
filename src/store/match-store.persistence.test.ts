import { beforeEach, describe, expect, it } from 'vitest'
import { scoreMatch } from '../domain/match'
import { clearMockStorage, readMockStorage, seedMockStorage } from '../test/async-storage-mock'
import { makeHand, makeRules } from '../test/factories'
import { MATCH_STORAGE_KEY, useMatchStore } from './match-store'

const store = useMatchStore

/** La scrittura su AsyncStorage è asincrona: le diamo un giro di event loop. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

function savedPayload() {
  const raw = readMockStorage(MATCH_STORAGE_KEY)
  if (raw === undefined) throw new Error('nessuna partita salvata')
  return JSON.parse(raw)
}

function seedSaved(state: unknown, version = 2) {
  seedMockStorage(MATCH_STORAGE_KEY, JSON.stringify({ version, state }))
}

beforeEach(async () => {
  clearMockStorage()
  store.getState().reset()
  await flush()
  clearMockStorage()
})

describe('salvataggio', () => {
  it('scrive la partita a ogni modifica', async () => {
    store.getState().startMatch({ A: 'Rossi', B: 'Bianchi' })
    store.getState().addHand(makeHand())
    await flush()

    const saved = savedPayload()
    expect(saved.version).toBe(2)
    expect(saved.state.hasStarted).toBe(true)
    expect(saved.state.match.teamNames).toEqual({ A: 'Rossi', B: 'Bianchi' })
    expect(saved.state.match.hands).toHaveLength(1)
  })

  it('salva i dati e non le azioni', async () => {
    store.getState().startMatch({ A: 'Noi', B: 'Loro' })
    await flush()

    expect(Object.keys(savedPayload().state).sort()).toEqual(['hasStarted', 'match'])
  })

  it('azzera anche il salvataggio al reset', async () => {
    store.getState().startMatch({ A: 'Noi', B: 'Loro' })
    store.getState().addHand(makeHand())
    await flush()

    store.getState().reset()
    await flush()

    const saved = savedPayload()
    expect(saved.state.hasStarted).toBe(false)
    expect(saved.state.match.hands).toHaveLength(0)
  })
})

describe('rilettura', () => {
  it('riprende la partita salvata', async () => {
    seedSaved({
      hasStarted: true,
      match: {
        rules: makeRules(),
        teamNames: { A: 'Rossi', B: 'Bianchi' },
        hands: [makeHand({ scope: { A: 2, B: 0 } })],
      },
    })

    await store.persist.rehydrate()

    const state = store.getState()
    expect(state.hasStarted).toBe(true)
    expect(state.match.teamNames).toEqual({ A: 'Rossi', B: 'Bianchi' })
    // Settebello a Rossi più due scope.
    expect(scoreMatch(state.match).totals).toEqual({ A: 3, B: 0 })
  })

  it('resta su una partita vuota se non c è nulla di salvato', async () => {
    await store.persist.rehydrate()

    expect(store.getState().hasStarted).toBe(false)
    expect(store.getState().match.hands).toHaveLength(0)
  })

  it('scarta una partita salvata che non è più calcolabile', async () => {
    seedSaved({
      hasStarted: true,
      match: {
        rules: makeRules(),
        teamNames: { A: 'X', B: 'Y' },
        // Mano priva dei campi obbligatori: il punteggio non è calcolabile.
        hands: [{ cards: { A: 99, B: 99 } }],
      },
    })

    await store.persist.rehydrate()

    expect(store.getState().hasStarted).toBe(false)
    expect(store.getState().match.hands).toHaveLength(0)
  })

  it('ignora un salvataggio senza partita', async () => {
    seedSaved({ hasStarted: true })

    await store.persist.rehydrate()

    expect(store.getState().hasStarted).toBe(false)
  })

  it('deduce che la partita è iniziata se il flag manca ma ci sono mani', async () => {
    seedSaved({
      match: {
        rules: makeRules(),
        teamNames: { A: 'Noi', B: 'Loro' },
        hands: [makeHand()],
      },
    })

    await store.persist.rehydrate()

    expect(store.getState().hasStarted).toBe(true)
  })
})
