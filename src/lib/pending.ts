import { getSupabase, isBackendConfigured } from './supabase'

/**
 * Avvisa quando cambia qualcosa che riguarda le cose in attesa: amicizie e
 * iscrizioni alle leghe.
 *
 * Non porta dati, fa solo da sveglia — chi ascolta rilegge dagli store. È una
 * scelta: consegnare la riga cambiata costringerebbe a fondere lo stato a
 * mano, e una fusione sbagliata è più difficile da accorgersi di una lettura
 * in più che arriva ogni tanto.
 *
 * Le policy valgono anche qui: `postgres_changes` consegna soltanto le righe
 * che chi ascolta potrebbe leggere. Su `friendships` non c'è un filtro
 * esprimibile — la coppia sta su due colonne e servirebbe un `or` — quindi ci
 * si affida alle policy, che restringono già alle proprie. Su
 * `league_members` il filtro c'è, ed evita di essere svegliati dall'attività
 * degli altri membri delle proprie leghe.
 */
export function watchPending(profileId: string, onChange: () => void): () => void {
  if (!isBackendConfigured) return () => {}

  const supabase = getSupabase()

  const canale = supabase
    .channel(`pending:${profileId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, onChange)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'league_members',
        filter: `profile_id=eq.${profileId}`,
      },
      onChange,
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(canale)
  }
}
