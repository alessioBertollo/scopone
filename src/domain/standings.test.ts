import { describe, expect, it } from 'vitest'
import { differential, pairStandings, playerStandings, type StandingsMatch } from './standings'

/** Ada e Bruno battono Carla e Dario 21 a 14. */
const PARTITA_1: StandingsMatch = {
  totals: { A: 21, B: 14 },
  winner: 'A',
  lineup: [
    { profileId: 'ada', team: 'A' },
    { profileId: 'bruno', team: 'A' },
    { profileId: 'carla', team: 'B' },
    { profileId: 'dario', team: 'B' },
  ],
}

/** Rivincita: Carla e Dario vincono 21 a 20, di misura. */
const PARTITA_2: StandingsMatch = {
  totals: { A: 20, B: 21 },
  winner: 'B',
  lineup: [
    { profileId: 'ada', team: 'A' },
    { profileId: 'bruno', team: 'A' },
    { profileId: 'carla', team: 'B' },
    { profileId: 'dario', team: 'B' },
  ],
}

describe('playerStandings', () => {
  it('conta partite, vittorie e punti di ciascuno', () => {
    const classifica = playerStandings([PARTITA_1, PARTITA_2])
    const ada = classifica.find((riga) => riga.profileId === 'ada')

    expect(ada).toEqual({
      profileId: 'ada',
      played: 2,
      won: 1,
      lost: 1,
      pointsFor: 41,
      pointsAgainst: 35,
    })
  })

  it('assegna a ciascuno i punti della propria squadra', () => {
    const classifica = playerStandings([PARTITA_1])
    const carla = classifica.find((riga) => riga.profileId === 'carla')

    expect(carla?.pointsFor).toBe(14)
    expect(carla?.pointsAgainst).toBe(21)
  })

  it('ordina per vittorie, poi per differenza punti', () => {
    // Una terza partita che Ada vince largamente, senza Bruno.
    const terza: StandingsMatch = {
      totals: { A: 21, B: 3 },
      winner: 'A',
      lineup: [
        { profileId: 'ada', team: 'A' },
        { profileId: 'carla', team: 'B' },
      ],
    }

    const classifica = playerStandings([PARTITA_1, PARTITA_2, terza])
    expect(classifica[0]?.profileId).toBe('ada')
    // Ada ha due vittorie, gli altri una sola.
    expect(classifica[0]?.won).toBe(2)
  })

  it('a pari vittorie mette avanti chi ha la differenza migliore', () => {
    const larga: StandingsMatch = {
      totals: { A: 21, B: 2 },
      winner: 'A',
      lineup: [
        { profileId: 'dominatore', team: 'A' },
        { profileId: 'vittima', team: 'B' },
      ],
    }
    const stretta: StandingsMatch = {
      totals: { A: 21, B: 20 },
      winner: 'A',
      lineup: [
        { profileId: 'misurato', team: 'A' },
        { profileId: 'sfortunato', team: 'B' },
      ],
    }

    const classifica = playerStandings([larga, stretta])
    expect(classifica[0]?.profileId).toBe('dominatore')
    expect(
      differential(
        classifica[0] ?? { played: 0, won: 0, lost: 0, pointsFor: 0, pointsAgainst: 0 },
      ),
    ).toBe(19)
  })

  it('restituisce una classifica vuota senza partite', () => {
    expect(playerStandings([])).toEqual([])
  })

  it('ignora chi non è stato schierato', () => {
    const senzaFormazione: StandingsMatch = {
      totals: { A: 21, B: 10 },
      winner: 'A',
      lineup: [],
    }
    expect(playerStandings([senzaFormazione])).toEqual([])
  })
})

describe('pairStandings', () => {
  it('tiene insieme la coppia a prescindere dall ordine dei giocatori', () => {
    const invertita: StandingsMatch = {
      ...PARTITA_1,
      lineup: [
        // Stessa coppia, elencata al contrario.
        { profileId: 'bruno', team: 'A' },
        { profileId: 'ada', team: 'A' },
        { profileId: 'carla', team: 'B' },
        { profileId: 'dario', team: 'B' },
      ],
    }

    const classifica = pairStandings([PARTITA_1, invertita])
    const adaBruno = classifica.find((riga) => riga.profileIds.join() === 'ada,bruno')

    expect(adaBruno?.played).toBe(2)
    expect(classifica).toHaveLength(2)
  })

  it('conta vittorie e punti della coppia', () => {
    const classifica = pairStandings([PARTITA_1, PARTITA_2])
    const adaBruno = classifica.find((riga) => riga.profileIds.join() === 'ada,bruno')

    expect(adaBruno).toEqual({
      profileIds: ['ada', 'bruno'],
      played: 2,
      won: 1,
      lost: 1,
      pointsFor: 41,
      pointsAgainst: 35,
    })
  })

  it('tratta il giocatore singolo come una squadra di uno', () => {
    const unoControUno: StandingsMatch = {
      totals: { A: 21, B: 8 },
      winner: 'A',
      lineup: [
        { profileId: 'ada', team: 'A' },
        { profileId: 'bruno', team: 'B' },
      ],
    }

    const classifica = pairStandings([unoControUno])
    expect(classifica.map((riga) => riga.profileIds)).toEqual([['ada'], ['bruno']])
  })

  it('distingue coppie diverse dello stesso giocatore', () => {
    const conCarla: StandingsMatch = {
      totals: { A: 21, B: 5 },
      winner: 'A',
      lineup: [
        { profileId: 'ada', team: 'A' },
        { profileId: 'carla', team: 'A' },
        { profileId: 'dario', team: 'B' },
      ],
    }

    const classifica = pairStandings([PARTITA_1, conCarla])
    const coppie = classifica.map((riga) => riga.profileIds.join())

    expect(coppie).toContain('ada,bruno')
    expect(coppie).toContain('ada,carla')
  })

  it('salta le squadre senza giocatori schierati', () => {
    const soloUnLato: StandingsMatch = {
      totals: { A: 21, B: 10 },
      winner: 'A',
      lineup: [{ profileId: 'ada', team: 'A' }],
    }
    expect(pairStandings([soloUnLato])).toHaveLength(1)
  })
})
