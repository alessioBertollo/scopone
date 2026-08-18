-- Il proprietario non può uscire dalla propria lega.
--
-- La policy precedente guardava solo `profile_id = auth.uid()`: chiunque
-- poteva cancellare la propria iscrizione, proprietario compreso. Ne sarebbe
-- rimasta una lega che nessuno può più eliminare né rinominare, perché
-- entrambe le cose sono riservate a chi l'ha creata e `leagues.created_by`
-- ha un `on delete restrict`.
--
-- Lo strato applicativo lo impediva già, ma un controllo nell'app vale solo
-- per chi passa dall'app: la chiave pubblica è nota a chiunque installi
-- l'APK. Chi possiede una lega la elimina, non la abbandona.

drop policy if exists "si esce solo per conto proprio" on public.league_members;

create policy "si esce per conto proprio, ma non se si è proprietari"
  on public.league_members for delete
  using (profile_id = auth.uid() and role <> 'owner');

-- Nota: l'eliminazione della lega continua a funzionare. Le righe di
-- league_members spariscono per `on delete cascade`, e le cascate non
-- passano dalle policy.
