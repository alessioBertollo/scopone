# Closed test — il collo di bottiglia da 14 giorni

Questo è il documento operativo più importante della cartella. Tutto il resto si
recupera lavorando di più; questo costa giorni di calendario che non si
comprimono.

## Il requisito

Gli account sviluppatore **personali** registrati dopo novembre 2023 devono
completare un test chiuso prima di poter richiedere l'accesso alla produzione:

- almeno **12 tester** iscritti al test
- iscritti in modo **continuativo** per **14 giorni**
- solo dopo si sblocca la richiesta di accesso alla produzione

> Verifica il numero esatto nella tua console prima di reclutare: Google ha già
> cambiato la soglia in passato (era 20, poi scesa a 12) e il testo autorevole è
> quello che vedi nel tuo Play Console, non questo file.

Gli account **organizzazione** sono esenti. Il tuo è personale, quindi si
applica.

## Le due trappole

**I 14 giorni non partono dall'iscrizione tua, ma da quella dei tester.**
Finché non ci sono 12 persone dentro, il contatore non parte. Recluta prima di
avere l'app perfetta: il test chiuso serve esattamente a rifinirla mentre il
tempo passa.

**Installare non basta: devono fare opt-in.** Il tester riceve un link, apre la
pagina e accetta di partecipare. Chi scarica l'APK e basta non conta. Chi esce
dal test azzera la continuità. È l'errore che fa perdere una settimana alla
maggior parte degli sviluppatori indipendenti.

## Come si configura

1. **Play Console → Test → Test chiuso**, crea una traccia (`Closed testing`)
2. Crea l'elenco tester: **Google Group** (consigliato) o lista di email
   - Il Google Group è meglio: aggiungi e togli persone senza ripubblicare
   - Gli indirizzi devono essere account **Google**, non email qualsiasi
3. Carica il primo AAB sulla traccia
   - L'AAB si genera con `npx eas-cli build --profile production --platform android`
   - Il profilo `preview` produce un APK: serve per farlo provare fuori da Play, non per la traccia
4. Compila la scheda dello store, data safety e content rating (vedi gli altri file di questa cartella)
5. Pubblica la release sulla traccia e copia il **link di opt-in**
6. Manda il link ai tester e **verifica che accettino davvero**

## Messaggio per i tester

Da mandare su WhatsApp o Telegram. Chiede poco e spiega perché serve l'opt-in,
che è il passaggio che tutti saltano.

```
Ciao! Ho scritto un'app per contare i punti a scopone: gratis, senza
pubblicità, funziona offline e calcola anche la primiera.

Per poterla pubblicare su Google Play mi servono 12 persone che la provino
per due settimane. Ti va di darmi una mano?

Servono due minuti:
1. Apri questo link dal telefono Android: <LINK DI OPT-IN>
2. Premi "Diventa tester" (questo passaggio è quello che conta: se installi
   soltanto, non vengo conteggiato)
3. Installa l'app da Google Play

Poi basta che resti iscritto per due settimane, anche senza usarla. Se hai
una partita da contare, ancora meglio: dimmi cosa non torna.

Grazie!
```

## Foglio di controllo

Tieni traccia di chi ha fatto **opt-in**, non di chi ha detto di sì. Sono cose
diverse e la differenza è quella che fa slittare la pubblicazione.

| # | Nome | Email Google | Opt-in fatto | Data |
| --- | --- | --- | --- | --- |
| 1 | | | ☐ | |
| 2 | | | ☐ | |
| 3 | | | ☐ | |
| 4 | | | ☐ | |
| 5 | | | ☐ | |
| 6 | | | ☐ | |
| 7 | | | ☐ | |
| 8 | | | ☐ | |
| 9 | | | ☐ | |
| 10 | | | ☐ | |
| 11 | | | ☐ | |
| 12 | | | ☐ | |
| 13 | | | ☐ | ← margine |
| 14 | | | ☐ | ← margine |

Recluta **14 persone per averne 12**: qualcuno cambia telefono, qualcuno esce
dal test, qualcuno non completa mai l'opt-in.

## Dopo i 14 giorni

1. Play Console mostra che il requisito è soddisfatto
2. Richiedi l'**accesso alla produzione**: è una revisione manuale di Google, mettici qualche giorno
3. Ti chiederanno com'è andato il test e cosa hai cambiato in base ai riscontri — rispondi con cose concrete, non con formule di circostanza
4. Approvata la richiesta, promuovi la release dalla traccia chiusa alla produzione

## Cosa fare nelle due settimane di attesa

Il tempo passa comunque, tanto vale usarlo:

- icona e screenshot definitivi
- storico delle partite concluse e statistiche
- far girare il workflow E2E e metterlo sulle pull request
- Sentry, per sapere se crasha sui telefoni veri invece di scoprirlo dalle recensioni
- decidere se aprire l'account Apple e affrontare anche iOS
