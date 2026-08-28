/**
 * Gli animali scelti come icona accanto al nome, e la logica per decidere
 * quale mostrare. Nessuna immagine qui: così si verifica senza renderer e
 * senza asset, come `celebration.ts` accanto a `Victory.tsx`.
 *
 * Sono sagome monocrome — il colore lo mette il componente con `tintColor`,
 * e una sola immagine serve tema chiaro e scuro. Per la stessa ragione i
 * disegni non hanno tratti sottili: a ventiquattro punti una linea fine
 * sparisce, ed è il motivo per cui in questo elenco non c'è un cervo.
 *
 * L'ordine è quello della griglia da cui si sceglie.
 */
export const AVATARS = [
  'gatto',
  'cane',
  'volpe',
  'orso',
  'coniglio',
  'riccio',
  'gufo',
  'rana',
  'pesce',
  'pinguino',
  'granchio',
  'farfalla',
] as const

export type AvatarName = (typeof AVATARS)[number]

export function isAvatarName(value: unknown): value is AvatarName {
  return typeof value === 'string' && (AVATARS as readonly string[]).includes(value)
}

/**
 * L'animale da mostrare: quello scelto, oppure uno stabile derivato dal seme
 * per chi non ha ancora scelto.
 *
 * Derivarlo invece di mostrare un segnaposto uguale per tutti dà a ognuno la
 * sua icona dal primo accesso, e soprattutto **non cambia** fra un
 * caricamento e l'altro: un'icona che balla non è un'icona, è rumore.
 *
 * Un nome che non riconosciamo ricade sul seme invece di far fallire: il
 * database accetta qualunque parola minuscola di proposito, perché un'app più
 * nuova possa salvare un animale che questa non conosce ancora.
 */
export function avatarFor(scelto: string | null | undefined, seed: string): AvatarName {
  if (isAvatarName(scelto)) return scelto

  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }

  return AVATARS[hash % AVATARS.length] ?? AVATARS[0]
}
