-- Leghe, giocatori e partite condivise.
--
-- Regola portante: chi avvia una partita è l'unico che può modificarla, gli
-- altri membri della lega la vedono e basta. Non è una convenzione applicativa
-- ma una policy del database: vale anche se un domani qualcuno chiama l'API
-- direttamente, saltando l'app.

-- ---------------------------------------------------------------- profili

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 40),
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'Un profilo per utente autenticato. Tiene solo il nome mostrato agli altri: '
  'l''email resta in auth.users e non è leggibile dagli altri giocatori.';

-- ------------------------------------------------------------------ leghe

create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 60),
  created_by uuid not null references public.profiles(id) on delete restrict,
  -- Codice corto da dettare a voce: niente ambiguità fra 0/O e 1/I/L.
  invite_code text not null unique
    check (invite_code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$'),
  created_at timestamptz not null default now()
);

create table public.league_members (
  league_id uuid not null references public.leagues(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (league_id, profile_id)
);

create index league_members_profile_idx on public.league_members (profile_id);

-- ---------------------------------------------------------------- partite

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  -- Nulla per una partita libera, fuori da ogni lega.
  league_id uuid references public.leagues(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  -- Regole, nomi squadra e mani nel formato del dominio: il punteggio resta
  -- calcolato dall'app, il database non lo ricalcola e non lo interpreta.
  rules jsonb not null,
  team_names jsonb not null,
  hands jsonb not null default '[]'::jsonb,
  status text not null default 'ongoing'
    check (status in ('ongoing', 'finished', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index matches_league_idx on public.matches (league_id, updated_at desc);
create index matches_creator_idx on public.matches (created_by, updated_at desc);

-- Chi gioca, e in che squadra. Assente nelle partite libere.
create table public.match_players (
  match_id uuid not null references public.matches(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  team text not null check (team in ('A', 'B')),
  primary key (match_id, profile_id)
);

create index match_players_profile_idx on public.match_players (profile_id);

-- --------------------------------------------------- updated_at automatico

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger matches_touch_updated_at
  before update on public.matches
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------ appartenenza senza loop
--
-- Una policy su league_members che interroghi league_members manderebbe
-- Postgres in ricorsione infinita. Questa funzione gira con i privilegi del
-- proprietario e spezza il ciclo.

create or replace function public.is_league_member(target_league uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.league_members
    where league_id = target_league and profile_id = auth.uid()
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
    where mine.profile_id = auth.uid() and theirs.profile_id = other_profile
  );
$$;

-- ------------------------------------------------------------------- RLS

alter table public.profiles enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;

-- Profili: vedi te stesso e chi divide una lega con te. Nessun elenco globale.
create policy "profilo proprio o di chi condivide una lega"
  on public.profiles for select
  using (id = auth.uid() or public.shares_a_league_with(id));

create policy "ognuno crea il proprio profilo"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "ognuno modifica solo il proprio profilo"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Leghe: visibili ai membri. Chiunque può crearne una, solo chi la possiede
-- la rinomina o la elimina.
create policy "leghe visibili ai membri"
  on public.leagues for select
  using (public.is_league_member(id));

create policy "chiunque può creare una lega"
  on public.leagues for insert
  with check (created_by = auth.uid());

create policy "solo il proprietario modifica la lega"
  on public.leagues for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "solo il proprietario elimina la lega"
  on public.leagues for delete
  using (created_by = auth.uid());

-- Iscrizioni: si vedono quelle della propria lega; ci si iscrive da sé, e si
-- esce da sé. L'ingresso col codice di invito passa da una funzione dedicata.
create policy "iscrizioni visibili ai membri della lega"
  on public.league_members for select
  using (public.is_league_member(league_id));

create policy "ci si iscrive solo per conto proprio"
  on public.league_members for insert
  with check (profile_id = auth.uid());

create policy "si esce solo per conto proprio"
  on public.league_members for delete
  using (profile_id = auth.uid());

-- Partite: le vedono i membri della lega, o solo chi l'ha creata se è libera.
create policy "partite visibili ai membri della lega"
  on public.matches for select
  using (
    (league_id is not null and public.is_league_member(league_id))
    or created_by = auth.uid()
  );

create policy "si crea una partita solo nelle proprie leghe"
  on public.matches for insert
  with check (
    created_by = auth.uid()
    and (league_id is null or public.is_league_member(league_id))
  );

-- Il cuore della cosa: modifica riservata a chi ha avviato la partita.
create policy "solo chi ha avviato la partita la modifica"
  on public.matches for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "solo chi ha avviato la partita la elimina"
  on public.matches for delete
  using (created_by = auth.uid());

-- Formazioni: le vede chi vede la partita, le tocca chi l'ha creata.
create policy "formazioni visibili a chi vede la partita"
  on public.match_players for select
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id
        and ((m.league_id is not null and public.is_league_member(m.league_id))
             or m.created_by = auth.uid())
    )
  );

create policy "solo chi ha avviato la partita schiera i giocatori"
  on public.match_players for all
  using (
    exists (select 1 from public.matches m where m.id = match_id and m.created_by = auth.uid())
  )
  with check (
    exists (select 1 from public.matches m where m.id = match_id and m.created_by = auth.uid())
  );

-- ------------------------------------------------------- tempo reale

-- Gli spettatori ricevono l'aggiornamento del tabellone senza interrogare
-- ciclicamente il server. Le policy di select valgono anche qui.
alter publication supabase_realtime add table public.matches;

-- --------------------------------------------- profilo alla registrazione
--
-- Creato da trigger e non dall'app: se l'app si chiudesse fra la
-- registrazione e la creazione del profilo resterebbe un utente orfano,
-- autenticato ma invisibile agli altri. Il nome di partenza si ricava
-- dall'email ed è modificabile subito dopo.

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(split_part(new.email, '@', 1)), ''), 'Giocatore')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

-- ------------------------------------------------ ingresso con il codice
--
-- Con RLS attivo un utente non può leggere una lega di cui non fa ancora
-- parte, quindi non potrebbe nemmeno cercarla per codice. Questa funzione
-- gira con privilegi elevati e fa la sola cosa concessa: iscrivere chi
-- chiama alla lega che corrisponde al codice.

create or replace function public.join_league_by_code(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
begin
  if auth.uid() is null then
    raise exception 'Serve essere autenticati per entrare in una lega';
  end if;

  select id into target
  from public.leagues
  where invite_code = upper(trim(code));

  if target is null then
    raise exception 'Codice di invito non valido';
  end if;

  insert into public.league_members (league_id, profile_id, role)
  values (target, auth.uid(), 'member')
  on conflict (league_id, profile_id) do nothing;

  return target;
end;
$$;

revoke all on function public.join_league_by_code(text) from public;
grant execute on function public.join_league_by_code(text) to authenticated;

-- -------------------------------------------- creazione lega con codice
--
-- Genera il codice, crea la lega e iscrive chi la crea come proprietario:
-- tre operazioni che devono riuscire o fallire insieme.

create or replace function public.create_league(league_name text)
returns public.leagues
language plpgsql
security definer
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
  created public.leagues;
  attempt int := 0;
begin
  if auth.uid() is null then
    raise exception 'Serve essere autenticati per creare una lega';
  end if;

  loop
    attempt := attempt + 1;
    code := '';
    for _ in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;

    begin
      insert into public.leagues (name, created_by, invite_code)
      values (trim(league_name), auth.uid(), code)
      returning * into created;
      exit;
    exception when unique_violation then
      -- Collisione sul codice: si riprova, ma non all'infinito.
      if attempt >= 10 then
        raise exception 'Impossibile generare un codice di invito univoco';
      end if;
    end;
  end loop;

  insert into public.league_members (league_id, profile_id, role)
  values (created.id, auth.uid(), 'owner');

  return created;
end;
$$;

revoke all on function public.create_league(text) from public;
grant execute on function public.create_league(text) to authenticated;
