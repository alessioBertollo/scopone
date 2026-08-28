-- Amicizie e iscrizioni nel tempo reale, per gli indicatori in attesa.
--
-- Senza questo, un pallino su una scheda comparirebbe solo tornando su
-- quella schermata: chi sta guardando l'elenco amici mentre gli arriva una
-- richiesta non la vedrebbe finché non naviga altrove e rientra.
--
-- Le policy valgono anche qui: `postgres_changes` consegna soltanto le righe
-- che chi ascolta potrebbe leggere con una select. Su `friendships` sono le
-- coppie che lo riguardano, su `league_members` le iscrizioni delle sue leghe
-- più le proprie — e la sottoscrizione dell'app filtra su `profile_id`, così
-- l'attività degli altri membri non la sveglia per niente.

alter publication supabase_realtime add table public.friendships;
alter publication supabase_realtime add table public.league_members;
