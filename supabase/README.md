# Backend

Supabase: Postgres gestito con autenticazione, tempo reale e Row Level
Security. Le regole di accesso stanno nel database, non nell'app.

## Perché le regole stanno qui e non nel codice

"Solo chi avvia una partita può modificarla" è una policy su `matches`, non un
controllo in una schermata. Vale anche per chiunque chiami l'API direttamente
con la chiave pubblica, che è nell'app e quindi va considerata nota a tutti.

Corollario: l'app non deve mai fidarsi di sé stessa per l'autorizzazione. Se
una schermata nasconde un pulsante è per pulizia, non per sicurezza.

## Primo avvio

1. Crea un progetto su https://supabase.com (piano gratuito)
2. Nel **SQL Editor** incolla ed esegui `migrations/0001_leghe_e_partite.sql`
3. In **Authentication → Providers** lascia attiva solo l'email e disattiva
   *Confirm email* se vuoi il codice a sei cifre invece del link
4. Copia **Project URL** e **anon public key** da *Project Settings → API*
   nel file `.env` dell'app

## Cosa contiene

| Tabella | Contenuto |
| --- | --- |
| `profiles` | Nome mostrato. L'email resta in `auth.users` e gli altri non la vedono |
| `leagues` | Nome e codice di invito a sei caratteri |
| `league_members` | Chi sta in quale lega, con il ruolo |
| `matches` | Regole, nomi squadra e mani nel formato del dominio |
| `match_players` | Chi ha giocato e in che squadra, per le classifiche |

Le mani sono `jsonb` nel formato del dominio: **il punteggio lo calcola
sempre l'app**, il database non lo ricalcola e non lo interpreta. Così resta
una sola implementazione delle regole, quella testata.

## Funzioni

Due operazioni non possono passare dalle policy normali e girano con
privilegi elevati:

- `create_league(name)` — genera il codice, crea la lega e iscrive chi la
  crea come proprietario, in un'unica transazione
- `join_league_by_code(code)` — con RLS attivo non puoi leggere una lega di
  cui non fai parte, quindi non potresti nemmeno cercarla per codice

## Il codice di invito

Sei caratteri da un alfabeto che esclude `0`, `O`, `1`, `I` e `L`: va dettato
a voce al tavolo, e quelle coppie si confondono.
