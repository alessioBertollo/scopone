-- Ospiti senza account nella formazione di una partita di lega.
--
-- Chi non è socio della lega né amico di chi gioca può comunque partecipare:
-- entra con un nome libero, esattamente come già succede fuori da ogni lega.
-- La riga resta dentro match_players così la formazione rimane un solo
-- elenco, non due letture da fondere in ogni schermata che la mostra.

alter table public.match_players
  add column id uuid not null default gen_random_uuid(),
  add column guest_name text,
  alter column profile_id drop not null;

alter table public.match_players drop constraint match_players_pkey;
alter table public.match_players add primary key (id);

alter table public.match_players
  add constraint match_players_profile_or_guest
  check (
    (profile_id is not null and guest_name is null)
    or (profile_id is null and char_length(trim(guest_name)) between 1 and 40)
  );

-- Un socio non può comparire due volte nella stessa formazione; due ospiti
-- con lo stesso nome invece sono leciti, sono solo due persone diverse.
create unique index match_players_match_profile_uidx
  on public.match_players (match_id, profile_id)
  where profile_id is not null;
