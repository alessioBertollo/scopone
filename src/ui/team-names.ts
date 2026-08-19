import type { ByTeam } from '../domain/teams'
import type { TranslationKey } from '../i18n'
import { tr } from '../i18n/tr'

/**
 * Coppie di stati d'animo contrapposti, suggerite come nomi delle squadre.
 * Sono coppie e non nomi indipendenti: il senso sta nell'opposizione fra i
 * due, e "Sereni" contro "Fiduciosi" non farebbe ridere nessuno.
 *
 * Qui stanno le chiavi e non il testo: la battuta va rifatta in ogni lingua,
 * non tradotta parola per parola, e i dizionari sono il posto dove farlo.
 */
const PAIRS: ReadonlyArray<readonly [TranslationKey, TranslationKey]> = [
  ['teams.sereni', 'teams.nervosi'],
  ['teams.ottimisti', 'teams.pessimisti'],
  ['teams.euforici', 'teams.rassegnati'],
  ['teams.tranquilli', 'teams.agitati'],
  ['teams.fiduciosi', 'teams.diffidenti'],
  ['teams.allegri', 'teams.musoni'],
  ['teams.spavaldi', 'teams.timorosi'],
  ['teams.rilassati', 'teams.tesi'],
  ['teams.impavidi', 'teams.preoccupati'],
  ['teams.convinti', 'teams.dubbiosi'],
]

/**
 * Nomi da mostrare come segnaposto. Se l'utente non scrive nulla restano
 * questi, così non si è costretti a battere due nomi per iniziare a giocare.
 */
export function suggestTeamNames(random: () => number = Math.random): ByTeam<string> {
  const index = Math.floor(random() * PAIRS.length) % PAIRS.length
  const pair = PAIRS[index] ?? PAIRS[0]
  // La coppia esiste sempre: PAIRS non è vuoto e l'indice è normalizzato.
  const [a, b] = pair as readonly [TranslationKey, TranslationKey]
  return { A: tr(a), B: tr(b) }
}
