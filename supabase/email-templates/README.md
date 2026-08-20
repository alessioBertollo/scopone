# Email di accesso

## Cosa incollare, e dove

**Authentication → Emails → Magic Link**

| Campo | Valore |
| --- | --- |
| Subject | `Scopone: {{ .Token }} — codice di accesso / sign-in code` |
| Body | il contenuto di [`magic-link.html`](magic-link.html) |

Il codice nell'oggetto non è un vezzo: si legge dalla notifica senza aprire
l'email, che è la differenza fra un accesso in cinque secondi e uno in
quaranta.

Attenzione allo slot: se lo incolli in *Confirm signup* invece che in *Magic
Link*, l'email che arriva è ancora quella di serie e sembra che il template
non abbia avuto effetto.

## Perché quello predefinito non funziona

Il template di serie manda `{{ .ConfirmationURL }}`, cioè un collegamento.
L'app però chiede **sei cifre**, e in quell'email le cifre non compaiono: si
resta bloccati sul campo del codice con un'email in mano che non lo contiene.

Il collegamento inoltre punta a `http://localhost:3000`, che è il Site URL
predefinito di ogni progetto Supabase. Su un telefono non porta da nessuna
parte, e messo accanto a un mittente sconosciuto fa somigliare l'email a una
truffa — con ragione.

## Perché è bilingue

GoTrue renderizza **un solo template per progetto**, sul server, senza sapere
in che lingua è impostata l'app: la scelta fatta sul telefono non arriva fin
qui. Non esiste una variante per lingua da attivare.

Quindi le due lingue stanno nello stesso messaggio. Il codice compare una
volta sola, in mezzo: le cifre non hanno lingua.

L'alternativa sarebbe un **Send Email Hook**, cioè un endpoint proprio che
genera l'email e sceglie la lingua. Localizzazione vera, ma è una funzione da
scrivere, distribuire e mantenere per un'email di tre righe. Ha senso quando
ci saranno lingue che non sappiamo già scrivere a mano.

## Le impostazioni che devono stare così

**Email OTP Length**, in *Authentication → Sign In / Providers → Email*: deve
restare `6`. Il campo nell'app scarta tutto ciò che non è una cifra e si
ferma a sei caratteri, e il pulsante resta spento finché non ci sono sei
cifre. Con un OTP più lungo l'accesso non dà errore: diventa semplicemente
impossibile da completare.

**Confirm email**, nello stesso pannello: disattivato. Con la conferma attiva,
il primo accesso di ogni nuovo utente usa il template *Confirm signup* invece
di *Magic Link* — cioè quello di serie, senza il codice. Non si perde
sicurezza: il codice via email **è già** la verifica dell'indirizzo.

**Site URL**, in *Authentication → URL Configuration*:
`https://alessiobertollo.github.io/scopone/` al posto di `localhost:3000`.
Non lo usiamo, ma smette di comparire in giro un indirizzo che non esiste.

## SMTP

Configurato su Gmail con una password per le app, mittente
`contapunti.scopa@gmail.com`, host `smtp.gmail.com` porta `587`. La 587 non è
opzionale: GoTrue parla STARTTLS, e sulla 465 — TLS implicito — fallisce con
un errore che non dice perché.

Due cose da sapere.

**Le email finiscono spesso in posta indesiderata.** Un indirizzo `gmail.com`
che manda posta trasazionale è esattamente il profilo che i filtri puniscono,
e non c'è una configurazione che lo eviti: servirebbe un dominio proprio con
SPF e DKIM. Per questo la schermata di accesso avvisa di controllare lo spam
— l'avviso non è un cerotto provvisorio, è la soluzione realistica finché non
c'è un dominio.

**Il limite di Gmail è circa 500 destinatari al giorno**, abbondante per
dodici tester ma non per una pubblicazione aperta.

> Prima di uscire dal closed test conviene passare a un provider vero.
> **Brevo** verifica un singolo indirizzo email senza chiedere un dominio
> (300 email al giorno), quindi è il passaggio meno costoso. **Resend** senza
> dominio verificato consegna soltanto all'intestatario dell'account, quindi
> non serve a niente in questa fase.
