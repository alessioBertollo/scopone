# Data safety — risposte per il Play Console

Sezione **Norme sulle app → Contenuti dell'app → Sicurezza dei dati**.

> ⚠️ Queste risposte sono cambiate radicalmente con l'introduzione di account e
> leghe. La versione precedente dichiarava "nessun dato raccolto": era vera
> quando l'app non aveva un server, non lo è più. Una data safety non veritiera
> è tra i motivi più rapidi di rimozione dallo store.

## Il punto di partenza

L'app ha due modi d'uso e la dichiarazione deve coprire il più invasivo:

- **senza account** non esce nulla dal telefono
- **con account** trattiamo email, nome mostrato, leghe e partite

Google chiede cosa l'app *può* raccogliere, non cosa raccoglie sempre. Quindi
la risposta alla domanda d'ingresso è **Sì**.

## Raccolta e condivisione

| Domanda | Risposta |
| --- | --- |
| La tua app raccoglie o condivide dati utente? | **Sì** |
| I dati sono criptati in transito? | **Sì** — il collegamento è HTTPS |
| Gli utenti possono richiedere la cancellazione dei dati? | **Sì** |

## Tipi di dati da dichiarare

| Tipo | Raccolto | Condiviso | Obbligatorio | Finalità |
| --- | --- | --- | --- | --- |
| Informazioni personali → **Indirizzo email** | Sì | No | Facoltativo | Gestione dell'account |
| Informazioni personali → **Nome** | Sì | No | Facoltativo | Gestione dell'account, funzionalità dell'app |
| Contenuti dell'app → **Altri contenuti generati dagli utenti** | Sì | No | Facoltativo | Funzionalità dell'app |

"Facoltativo" è la risposta corretta perché l'app resta pienamente utilizzabile
senza account: chi conta i punti al tavolo non fornisce nulla.

Il **nome mostrato** va dichiarato anche se di partenza lo deriviamo dall'email:
è comunque un dato personale, ed è visibile agli altri membri della lega.

I **contenuti generati dagli utenti** sono le partite: regole, nomi delle
squadre, punti di ogni mano e giocatori che vi hanno partecipato.

### Perché "Condiviso: No"

Google definisce condivisione il trasferimento a una *terza parte distinta*.
Supabase è nostro responsabile del trattamento, non un destinatario autonomo:
ospita i dati per conto nostro. La visibilità fra membri della stessa lega è
funzionamento dell'app, non condivisione con terzi.

## Cancellazione dell'account

Google richiede che un'app con registrazione offra **due strade**: una dentro
l'app e una da un URL pubblico raggiungibile senza installarla.

| Cosa | Stato |
| --- | --- |
| Percorso dentro l'app | **DA IMPLEMENTARE** |
| URL pubblico di richiesta | https://alessiobertollo.github.io/scopone/privacy.html (sezione "Cancellare l'account") |

> ⚠️ **Bloccante.** Senza il percorso dentro l'app la scheda viene rifiutata.
> Al momento la privacy policy indica la richiesta via email, che copre l'URL
> pubblico ma non il requisito in-app.

## Pubblico di destinazione ed età

| Campo | Valore |
| --- | --- |
| Fasce d'età | **13+** |
| L'app è rivolta ai bambini? | No |

Resta 13+ come prima, e ora c'è una ragione in più: con la registrazione
entrano in gioco gli obblighi sul consenso dei minori.

## Altre dichiarazioni

| Campo | Valore |
| --- | --- |
| Contiene annunci | No |
| Acquisti in-app | No |
| Contenuti generati dagli utenti | **Sì** — nomi squadra e nomi delle leghe |

### Conseguenza dei contenuti generati dagli utenti

Dichiarando **Sì**, Google si aspetta un modo per segnalare contenuti
inappropriati e per bloccare un utente. Nel nostro caso la superficie è
minima — nomi di squadre e di leghe visibili solo dentro leghe private a cui
si entra su invito — ma è bene saperlo prima che lo chieda la revisione.

## Status di trader (DSA)

Invariato rispetto a prima, in **Impostazioni → Profilo sviluppatore**. La
qualificazione giuridica non cambia per il fatto che l'app ora abbia un
account: verifica le linee guida al momento della compilazione.
