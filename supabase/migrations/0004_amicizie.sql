-- Amicizie: legami fra profili che non passano da una lega.
--
-- Due scelte portano il resto:
--
-- 1. La coppia è memorizzata in ordine canonico, `low_id < high_id`, con una
--    chiave primaria sui due. Così «una sola amicizia per coppia» è una
--    garanzia del database e non una convenzione: non esistono le due righe
--    A→B e B→A da tenere allineate. Chi ha chiesto lo dice `requested_by`.
--
-- 2. Nessuna policy di scrittura. Si passa dalle funzioni qui sotto, che sono
--    `security definer`: senza di esse nessuno può inserire una riga già
--    `accepted`, cioè dichiararsi amico di qualcuno che non ha accettato.

-- ------------------------------------------------- codice personale

create or replace function public.generate_friend_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Stesso alfabeto dei codici di lega: niente ambiguità fra 0/O e 1/I/L,
  -- perché questi codici si dettano a voce.
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where friend_code = code);
  end loop;
  return code;
end;
$$;

alter table public.profiles add column friend_code text;

-- Una `update` sola assegnerebbe lo stesso codice a più righe: la funzione
-- vedrebbe lo snapshot iniziale e non i codici appena scritti. Un giro per
-- riga costa niente su questi numeri e non ha quel difetto.
do $$
declare
  riga record;
begin
  for riga in select id from public.profiles where friend_code is null loop
    update public.profiles
    set friend_code = public.generate_friend_code()
    where id = riga.id;
  end loop;
end $$;

alter table public.profiles
  alter column friend_code set not null,
  alter column friend_code set default public.generate_friend_code(),
  add constraint profiles_friend_code_key unique (friend_code),
  add constraint profiles_friend_code_check
    check (friend_code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$');

comment on column public.profiles.friend_code is
  'Codice da condividere per ricevere una richiesta di amicizia. Il valore '
  'predefinito lo genera il database, quindi vale anche per i profili creati '
  'dal trigger di registrazione.';

-- ------------------------------------------------------- amicizie

create table public.friendships (
  low_id uuid not null references public.profiles(id) on delete cascade,
  high_id uuid not null references public.profiles(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (low_id, high_id),
  constraint coppia_ordinata check (low_id < high_id),
  constraint richiedente_nella_coppia check (requested_by in (low_id, high_id))
);

-- La chiave primaria copre le ricerche per `low_id`; questo copre l'altro lato.
create index friendships_high_idx on public.friendships (high_id);

alter table public.friendships enable row level security;

create policy "amicizie proprie"
  on public.friendships for select
  using (auth.uid() in (low_id, high_id));

create or replace function public.is_friend_of(other_profile uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.friendships
    where status = 'accepted'
      and low_id = least(auth.uid(), other_profile)
      and high_id = greatest(auth.uid(), other_profile)
  );
$$;

-- -------------------------------------------- cosa vedono gli amici

drop policy "profilo proprio o di chi condivide una lega" on public.profiles;

create policy "profilo proprio, di chi condivide una lega o di un amico"
  on public.profiles for select
  using (
    id = auth.uid()
    or public.shares_a_league_with(id)
    or public.is_friend_of(id)
  );

drop policy "partite visibili ai membri della lega" on public.matches;

-- Una partita di lega appartiene alla lega: un amico che non ne fa parte non
-- la vede, altrimenti l'amicizia diventerebbe una porta di servizio dentro
-- leghe altrui. Una partita libera appartiene a chi l'ha giocata, e la
-- condivide con i suoi amici.
create policy "partite proprie, della propria lega o libere di un amico"
  on public.matches for select
  using (
    created_by = auth.uid()
    or (league_id is not null and public.is_league_member(league_id))
    or (league_id is null and public.is_friend_of(created_by))
  );

drop policy "formazioni visibili a chi vede la partita" on public.match_players;

create policy "formazioni visibili a chi vede la partita"
  on public.match_players for select
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id
        and (
          m.created_by = auth.uid()
          or (m.league_id is not null and public.is_league_member(m.league_id))
          or (m.league_id is null and public.is_friend_of(m.created_by))
        )
    )
  );

-- ------------------------------------------------------- operazioni

create or replace function public.send_friend_request(code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  target uuid;
begin
  if me is null then
    raise exception 'Serve un accesso per aggiungere un amico';
  end if;

  select id into target from public.profiles where friend_code = upper(trim(code));

  if target is null then
    raise exception 'Codice non valido';
  end if;
  if target = me then
    raise exception 'Questo è il tuo codice';
  end if;

  -- Se l'altra persona ti aveva già invitato, mandare il suo codice completa
  -- l'amicizia invece di lasciare due richieste in attesa a specchio.
  insert into public.friendships (low_id, high_id, requested_by)
  values (least(me, target), greatest(me, target), me)
  on conflict (low_id, high_id) do update
    set status = 'accepted', responded_at = now()
    where friendships.status = 'pending' and friendships.requested_by <> me;
end;
$$;

create or replace function public.accept_friend_request(other_profile uuid)
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

  update public.friendships
  set status = 'accepted', responded_at = now()
  where low_id = least(me, other_profile)
    and high_id = greatest(me, other_profile)
    and status = 'pending'
    -- Nessuno accetta la propria richiesta.
    and requested_by <> me;

  if not found then
    raise exception 'Nessuna richiesta da accettare';
  end if;
end;
$$;

-- Serve per tre gesti diversi che vogliono la stessa cosa: rifiutare una
-- richiesta ricevuta, ritirare una mandata, togliere un'amicizia.
create or replace function public.remove_friend(other_profile uuid)
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

  delete from public.friendships
  where low_id = least(me, other_profile)
    and high_id = greatest(me, other_profile);
end;
$$;

-- `security definer` di proposito: il nome di chi ti ha appena invitato non è
-- ancora leggibile dalle policy sui profili, perché l'amicizia non è
-- accettata. Senza questo, una richiesta in arrivo sarebbe anonima.
create or replace function public.list_my_friends()
returns table (profile_id uuid, display_name text, status text, incoming boolean)
language sql
security definer
set search_path = public
stable
as $$
  select
    case when f.low_id = auth.uid() then f.high_id else f.low_id end as profile_id,
    p.display_name,
    f.status,
    f.requested_by <> auth.uid() as incoming
  from public.friendships f
  join public.profiles p
    on p.id = case when f.low_id = auth.uid() then f.high_id else f.low_id end
  where auth.uid() in (f.low_id, f.high_id)
  order by f.status, p.display_name;
$$;

-- `is_friend_of` e `generate_friend_code` restano eseguibili da tutti, come
-- gli altri helper della prima migrazione: la prima viene valutata dentro le
-- policy e la seconda dentro un valore predefinito, quindi le esegue l'utente
-- che scrive o interroga. Revocarle bloccherebbe ogni lettura dei profili e
-- la creazione di un profilo nuovo.
revoke all on function public.send_friend_request(text) from public;
revoke all on function public.accept_friend_request(uuid) from public;
revoke all on function public.remove_friend(uuid) from public;
revoke all on function public.list_my_friends() from public;

grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.accept_friend_request(uuid) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.list_my_friends() to authenticated;
