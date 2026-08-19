-- Cancellazione dell'account da parte dell'utente.
--
-- Google richiede che un'app con registrazione offra un percorso di
-- cancellazione dentro l'app, non solo un indirizzo a cui scrivere. E il GDPR
-- dà comunque diritto alla cancellazione.
--
-- Non basta un `delete from auth.users`: sia `leagues.created_by` sia
-- `matches.created_by` puntano a `profiles` con `on delete restrict`, quindi
-- l'eliminazione fallirebbe finché restano leghe o partite create da quella
-- persona. Vanno rimosse prima, nell'ordine giusto, e dentro un'unica
-- transazione: un account mezzo cancellato sarebbe peggio di uno intatto.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Serve essere autenticati per cancellare il proprio account';
  end if;

  -- Le leghe che ho creato spariscono con tutto il loro contenuto: iscrizioni
  -- e partite se ne vanno in cascata. Chi ne faceva parte le perde, ed è
  -- inevitabile, perché una lega senza proprietario non è amministrabile.
  delete from public.leagues where created_by = me;

  -- Partite avviate in leghe altrui: la lega resta, la partita no.
  delete from public.matches where created_by = me;

  -- Le iscrizioni residue e il profilo se ne vanno in cascata da auth.users.
  delete from auth.users where id = me;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

comment on function public.delete_my_account() is
  'Cancella account, profilo, leghe possedute e partite create di chi la chiama. '
  'Irreversibile: non conserviamo copie.';
