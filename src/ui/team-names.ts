import type { ByTeam } from '../domain/teams'

/**
 * Coppie di stati d'animo contrapposti, suggerite come nomi delle squadre.
 * Sono coppie e non nomi indipendenti: il senso sta nell'opposizione fra i
 * due, e "Sereni" contro "Fiduciosi" non farebbe ridere nessuno.
 */
const PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['Sereni', 'Nervosi'],
  ['Ottimisti', 'Pessimisti'],
  ['Euforici', 'Rassegnati'],
  ['Tranquilli', 'Agitati'],
  ['Fiduciosi', 'Diffidenti'],
  ['Allegri', 'Musoni'],
  ['Spavaldi', 'Timorosi'],
  ['Rilassati', 'Tesi'],
  ['Impavidi', 'Preoccupati'],
  ['Convinti', 'Dubbiosi'],
]

/**
 * Nomi da mostrare come segnaposto. Se l'utente non scrive nulla restano
 * questi, così non si è costretti a battere due nomi per iniziare a giocare.
 */
export function suggestTeamNames(random: () => number = Math.random): ByTeam<string> {
  const index = Math.floor(random() * PAIRS.length) % PAIRS.length
  const pair = PAIRS[index] ?? PAIRS[0]
  // La coppia esiste sempre: PAIRS non è vuoto e l'indice è normalizzato.
  const [a, b] = pair as readonly [string, string]
  return { A: a, B: b }
}
