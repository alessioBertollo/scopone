-- L'avatar negli elenchi che non passano dalle policy sui profili.
--
-- `list_my_friends` è `security definer` perché il nome di chi ti ha appena
-- invitato non è ancora leggibile: la stessa ragione vale per la sua icona.
-- Senza questa aggiunta, amici e formazione mostrerebbero il nome accanto a
-- un'icona derivata dall'identificativo invece di quella scelta.
--
-- Il tipo restituito cambia, quindi non basta `create or replace`: una
-- funzione non può cambiare le colonne in uscita restando la stessa.

drop function if exists public.list_my_friends();

create function public.list_my_friends()
returns table (
  profile_id uuid,
  display_name text,
  avatar text,
  status text,
  incoming boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    case when f.low_id = auth.uid() then f.high_id else f.low_id end as profile_id,
    p.display_name,
    p.avatar,
    f.status,
    f.requested_by <> auth.uid() as incoming
  from public.friendships f
  join public.profiles p
    on p.id = case when f.low_id = auth.uid() then f.high_id else f.low_id end
  where auth.uid() in (f.low_id, f.high_id)
  order by f.status, p.display_name;
$$;

revoke all on function public.list_my_friends() from public;
grant execute on function public.list_my_friends() to authenticated;
