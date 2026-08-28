import cane from '../../assets/avatars/cane.png'
import coniglio from '../../assets/avatars/coniglio.png'
import farfalla from '../../assets/avatars/farfalla.png'
import gatto from '../../assets/avatars/gatto.png'
import granchio from '../../assets/avatars/granchio.png'
import gufo from '../../assets/avatars/gufo.png'
import orso from '../../assets/avatars/orso.png'
import pesce from '../../assets/avatars/pesce.png'
import pinguino from '../../assets/avatars/pinguino.png'
import rana from '../../assets/avatars/rana.png'
import riccio from '../../assets/avatars/riccio.png'
import volpe from '../../assets/avatars/volpe.png'
import type { AvatarName } from './avatar-names'

/**
 * La mappa fra nome e immagine, tenuta separata da `avatar-names.ts` perché
 * importa dodici PNG: quel file deve restare verificabile senza asset.
 *
 * `satisfies` non è un vezzo: se si aggiunge un animale all'elenco e si
 * dimentica l'immagine, l'errore arriva qui invece che a schermo.
 */
const IMMAGINI = {
  gatto,
  cane,
  volpe,
  orso,
  coniglio,
  riccio,
  gufo,
  rana,
  pesce,
  pinguino,
  granchio,
  farfalla,
} satisfies Record<AvatarName, number>

export function avatarImage(name: AvatarName) {
  return IMMAGINI[name]
}
