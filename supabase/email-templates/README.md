# Email di accesso

## Cosa incollare, e dove

**Authentication → Email Templates → Magic Link**

| Campo | Valore |
| --- | --- |
| Subject | `Il tuo codice per Scopone: {{ .Token }}` |
| Body | il contenuto di [`magic-link.html`](magic-link.html) |

Il codice nell'oggetto non è un vezzo: si legge dalla notifica senza aprire
l'email, che è la differenza fra un accesso in cinque secondi e uno in
quaranta.

## Perché quello predefinito non funziona

Il template di serie manda `{{ .ConfirmationURL }}`, cioè un collegamento.
L'app però chiede **sei cifre**, e in quell'email le cifre non compaiono: si
resta bloccati sul campo del codice con un'email in mano che non lo contiene.

Il collegamento inoltre punta a `http://localhost:3000`, che è il Site URL
predefinito di ogni progetto Supabase. Su un telefono non porta da nessuna
parte, e messo accanto a un mittente sconosciuto fa somigliare l'email a una
truffa — con ragione.

## Le altre due impostazioni

**Site URL**, in *Authentication → URL Configuration*: metti
`https://alessiobertollo.github.io/scopone/` al posto di `localhost:3000`.
Non lo usiamo, ma smette di comparire in giro un indirizzo che non esiste.

**SMTP**, in *Authentication → SMTP Settings*: finché resta quello integrato,
le email partono da un dominio condiviso con migliaia di altri progetti, con
un mittente anonimo, e finiscono in posta indesiderata. È anche limitato a
poche email all'ora.

> ⚠️ **Prima del closed test è obbligatorio configurarlo.** Dodici tester che
> si registrano esauriscono la quota in pochi minuti, e ti ritroveresti dodici
> persone che non riescono a entrare: il modo peggiore di bruciare le persone
> che servono a far partire i 14 giorni.

Opzioni gratuite adatte: **Resend** (3.000 email al mese) o **Brevo** (300 al
giorno). Entrambe richiedono di verificare un dominio, ed è quello che fa
davvero uscire le email dallo spam.
