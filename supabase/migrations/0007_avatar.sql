-- L'animale scelto come icona accanto al nome.
--
-- La colonna è permissiva di proposito: un elenco chiuso dei nomi validi
-- legherebbe il database all'insieme di disegni che l'app contiene oggi, e
-- aggiungerne uno diventerebbe una migrazione. Peggio ancora, un'app nuova che
-- salva un animale che il database non conosce si vedrebbe rifiutare la
-- scrittura. Qui si controlla solo la forma; a un nome che non riconosce
-- l'app risponde mostrando l'icona predefinita, che è un guasto invisibile
-- invece che bloccante.
--
-- Resta `null` per chi non ha ancora scelto: l'app ne deriva uno stabile
-- dall'identificativo del profilo, così ognuno ha già la sua icona senza che
-- serva riempire la colonna a tutti.

alter table public.profiles
  add column avatar text
    check (avatar is null or avatar ~ '^[a-z]{1,20}$');

comment on column public.profiles.avatar is
  'Nome dell''animale scelto come icona. Null = mai scelto, lo deriva l''app.';
