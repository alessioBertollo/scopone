import type { ByTeam } from '../domain/teams'

/**
 * Coppie di nomi suggeriti per le due squadre. Sono coppie e non nomi
 * indipendenti perché "Nord" contro "Coppe" non vuol dire niente: il senso
 * sta nell'opposizione fra i due.
 */
const PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['Bastoni', 'Spade'],
  ['Denari', 'Coppe'],
  ['Nord', 'Sud'],
  ['Est', 'Ovest'],
  ['Rossi', 'Bianchi'],
  ['Assi', 'Figure'],
  ['Verdi', 'Gialli'],
  ['Monti', 'Valli'],
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
