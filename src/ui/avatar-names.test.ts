import { describe, expect, it } from 'vitest'
import { AVATARS, avatarFor, isAvatarName } from './avatar-names'

describe('isAvatarName', () => {
  it('riconosce i nomi dell elenco', () => {
    for (const nome of AVATARS) expect(isAvatarName(nome)).toBe(true)
  })

  it('rifiuta tutto il resto', () => {
    for (const valore of ['cervo', 'Gatto', '', null, undefined, 7, {}]) {
      expect(isAvatarName(valore)).toBe(false)
    }
  })
})

describe('avatarFor', () => {
  it('rispetta la scelta quando c è', () => {
    expect(avatarFor('volpe', 'chiunque')).toBe('volpe')
  })

  it('non cambia fra un caricamento e l altro', () => {
    expect(avatarFor(null, 'utente-ada')).toBe(avatarFor(null, 'utente-ada'))
  })

  it('dà animali diversi a semi diversi, invece dello stesso a tutti', () => {
    const semi = Array.from({ length: 40 }, (_, i) => `utente-${i}`)
    const distinti = new Set(semi.map((seme) => avatarFor(null, seme)))
    // Non pretende dodici su dodici: pretende che non sia uno solo.
    expect(distinti.size).toBeGreaterThan(4)
  })

  it('ricade sul seme se il nome salvato non è fra quelli noti', () => {
    // Un'app più nuova può aver salvato un animale che questa non conosce.
    expect(AVATARS).toContain(avatarFor('cervo', 'utente-ada'))
    expect(avatarFor('cervo', 'utente-ada')).toBe(avatarFor(null, 'utente-ada'))
  })

  it('regge un seme vuoto', () => {
    expect(AVATARS).toContain(avatarFor(null, ''))
  })
})
