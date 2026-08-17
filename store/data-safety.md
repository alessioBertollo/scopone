# Data safety — risposte per il Play Console

Sezione **Norme sulle app → Contenuti dell'app → Sicurezza dei dati**.

Nel nostro caso è la parte facile: l'app non ha backend, non fa chiamate di rete
e non integra SDK che raccolgono dati. Quasi tutte le domande si chiudono al
primo passaggio.

## Raccolta e condivisione

| Domanda | Risposta |
| --- | --- |
| La tua app raccoglie o condivide uno dei tipi di dati utente richiesti? | **No** |

Rispondendo No, il questionario salta tutte le sezioni sui tipi di dati
(posizione, informazioni personali, foto, file, attività dell'app…). Non c'è
altro da compilare in questa parte.

### Perché "No" è la risposta corretta e non una scorciatoia

Google definisce "raccolta" la trasmissione di dati **fuori dal dispositivo**.
I nomi delle squadre e i punti delle mani vengono salvati in locale con
AsyncStorage e non lasciano mai il telefono: non sono quindi dati raccolti ai
fini del questionario.

Attenzione a non cambiare questa risposta senza cambiare l'app: se un domani
aggiungi crash reporting, analytics o un backup in cloud, la dichiarazione va
aggiornata **prima** della pubblicazione di quella versione. Una data safety
falsa è uno dei motivi più rapidi di rimozione dallo store.

## Sicurezza

| Domanda | Risposta |
| --- | --- |
| I dati sono criptati in transito? | Non applicabile — nessun dato trasmesso |
| Fornisci un modo per richiedere la cancellazione dei dati? | Non applicabile — nessun dato raccolto |

Se il questionario obbliga a rispondere, la formula corretta è: i dati restano
sul dispositivo e vengono eliminati disinstallando l'app o avviando una nuova
partita.

## Pubblico di destinazione ed età

Sezione **Contenuti dell'app → Pubblico di destinazione**.

| Campo | Valore consigliato |
| --- | --- |
| Fasce d'età | **13+** |
| L'app è rivolta ai bambini? | No |

### Perché 13+ e non "tutte le età"

Lo scopone lo giocano anche i bambini, quindi la tentazione è includere le fasce
sotto i 13 anni. Non farlo: includerle attiva la **Families Policy** di Google,
che porta requisiti aggiuntivi su contenuti, pubblicità, un questionario
dedicato e una revisione più severa. Per un contapunti senza pubblicità e senza
dati sarebbero adempimenti a costo zero di beneficio.

Dichiarare 13+ non impedisce a nessuno di scaricare o usare l'app.

## Altre dichiarazioni

| Campo | Valore |
| --- | --- |
| Contiene annunci | No |
| Acquisti in-app | No |
| App finanziaria | No |
| App per la salute | No |
| Contenuti generati dagli utenti | No |
| Accesso ai dati tramite API o SDK di terze parti | No |

## Status di trader (DSA, obbligatorio per l'UE)

Vive in **Play Console → Impostazioni → Profilo sviluppatore**, non nella data
safety, ma va compilato prima della distribuzione in Europa.

Come persona fisica che pubblica un'app gratuita senza monetizzazione, in linea
di principio non sei un "trader". Attenzione però: la dichiarazione comporta
comunque la pubblicazione di nome e recapiti sulla scheda dell'app.

Questa è una qualificazione giuridica, non tecnica: se hai dubbi sulla tua
posizione, la risposta corretta non te la può dare né questo documento né io.
Nel dubbio, verifica direttamente le linee guida del Play Console al momento
della compilazione.
