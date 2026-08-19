/**
 * Nei test la lingua del dispositivo è fissa: serve solo a verificare che il
 * ripiego funzioni, non a indovinare le impostazioni della macchina che
 * esegue la suite.
 */
export function getLocales() {
  return [{ languageCode: 'it', languageTag: 'it-IT' }]
}
