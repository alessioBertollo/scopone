-- Inviti a una lega.
--
-- Finora si entrava solo col codice, dettato a voce. Ora chi già ne fa parte
-- può invitare un proprio amico, e l'invitato decide: l'invito non è
-- un'iscrizione, è una proposta. Togliere qualcuno resta di chi ha creato la
-- lega.
--
-- Tre conseguenze non ovvie, tutte gestite qui sotto:
--
-- 1. `is_league_member` deve ignorare gli inviti in attesa. La usano una
--    dozzina di policy: se contasse anche gli invitati, chi ha ricevuto una
--    proposta vedrebbe già partite, classifiche e compagni, cioè sarebbe
--    dentro senza aver accettato.
-- 2. L'invitato deve poter leggere il nome della lega che lo invita, ma non
--    ne fa ancora parte. Ci pensa una funzione `security definer`, come per
--    le richieste di amicizia.
-- 3. La policy di inserimento va rimossa, non modificata. Vedi sotto.

alter table public.league_members
  add column status text not null default 'member'
    check (status in ('invited', 'member')),
  add column invited_by uuid references public.profiles(id) on delete set null;

comment on column public.league_members.status is
  'invited = proposta in attesa, non conta come appartenenza. member = dentro.';

-- Le righe che esistono già sono iscrizioni vere: il valore predefinito le
-- copre senza bisogno di riscriverle.

-- ------------------------------------------------- appartenenza e proprietà

create or replace function public.is_league_member(target_league uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.league_members
    where league_id = target_league
      and profile_id = auth.uid()
      and status = 'member'
  );
$$;

create or replace function public.shares_a_league_with(other_profile uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.league_members mine
    join public.league_members theirs using (league_id)
    where mine.profile_id = auth.uid()
      and theirs.profile_id = other_profile
      and mine.status = 'member'
      and theirs.status = 'member'
  );
$$;

create or replace function public.is_league_owner(target_league uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.leagues
    where id = target_league and created_by = auth.uid()
  );
$$;

-- ------------------------------------------------------------------ policy

-- L'invitato non è ancora membro, quindi `is_league_member` lo esclude: senza
-- questo non vedrebbe nemmeno la riga che lo riguarda.
drop policy "iscrizioni visibili ai membri della lega" on public.league_members;

create policy "iscrizioni visibili ai membri e a chi è invitato"
  on public.league_members for select
  using (public.is_league_member(league_id) or profile_id = auth.uid());

-- Questa policy diceva soltanto «la riga deve essere tua», e bastava
-- conoscere l'identificativo di una lega per iscriversi da soli saltando il
-- codice. Nessuno inserisce più direttamente: ci pensano `create_league`,
-- `join_league_by_code` e `invite_friend_to_league`, che sono
-- `security definer` e verificano ognuna le proprie condizioni.
drop policy "ci si iscrive solo per conto proprio" on public.league_members;

-- Si esce da soli, si rifiuta un invito da soli, e chi ha creato la lega può
-- togliere gli altri. Il proprietario non può togliere se stesso: la lega
-- resterebbe senza padrone, e `leagues.created_by` ha un `on delete restrict`.
drop policy "si esce per conto proprio, ma non se si è proprietari" on public.league_members;

create policy "si esce da soli, il proprietario può togliere gli altri"
  on public.league_members for delete
  using (
    (profile_id = auth.uid() and role <> 'owner')
    or (public.is_league_owner(league_id) and profile_id <> auth.uid())
  );

-- ------------------------------------------------------------- operazioni

/*
 * Invita un amico. Chiunque faccia parte della lega può invitare, ma solo
 * qualcuno che è già suo amico: senza quel vincolo il codice di invito non
 * servirebbe più a niente, basterebbe conoscere un identificativo.
 */
create or replace function public.invite_friend_to_league(target_league uuid, friend uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Serve un accesso';
  end if;
  if not public.is_league_member(target_league) then
    raise exception 'Non fai parte di questa lega';
  end if;
  if not public.is_friend_of(friend) then
    raise exception 'Puoi invitare solo i tuoi amici';
  end if;

  insert into public.league_members (league_id, profile_id, role, status, invited_by)
  values (target_league, friend, 'member', 'invited', me)
  -- Chi è già dentro, o è già stato invitato da qualcun altro, resta com'è:
  -- un secondo invito non deve retrocedere un membro a invitato.
  on conflict (league_id, profile_id) do nothing;
end;
$$;

create or replace function public.accept_league_invite(target_league uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Serve un accesso';
  end if;

  update public.league_members
  set status = 'member', joined_at = now(), invited_by = invited_by
  where league_id = target_league
    and profile_id = me
    and status = 'invited';

  if not found then
    raise exception 'Nessun invito da accettare';
  end if;
end;
$$;

/*
 * `security definer` di proposito: il nome della lega e quello di chi invita
 * non sono leggibili da chi non ne fa ancora parte. Senza questo, un invito
 * in arrivo sarebbe un identificativo e nulla più.
 */
create or replace function public.list_my_league_invites()
returns table (league_id uuid, league_name text, invited_by_name text)
language sql
security definer
set search_path = public
stable
as $$
  select l.id, l.name, coalesce(p.display_name, '')
  from public.league_members m
  join public.leagues l on l.id = m.league_id
  left join public.profiles p on p.id = m.invited_by
  where m.profile_id = auth.uid() and m.status = 'invited'
  order by l.name;
$$;

revoke all on function public.invite_friend_to_league(uuid, uuid) from public;
revoke all on function public.accept_league_invite(uuid) from public;
revoke all on function public.list_my_league_invites() from public;

grant execute on function public.invite_friend_to_league(uuid, uuid) to authenticated;
grant execute on function public.accept_league_invite(uuid) to authenticated;
grant execute on function public.list_my_league_invites() to authenticated;
