# Prova manuale

Le cose che i test automatici non possono verificare: il tempo reale, le
policy del database, la persistenza fra riavvii, il comportamento della pila
di navigazione, e cosa succede con due persone davanti a due telefoni.

I test unitari coprono le regole del punteggio e i contratti col server;
`npm run check:rls` verifica che un anonimo non scriva né legga nulla. Qui si
prova tutto il resto.

## Prima di cominciare

- [ ] Un **secondo indirizzo email** qualsiasi, per il secondo account.
- [ ] Se hai due dispositivi, tanto meglio: il tempo reale si vede con due
      schermi accesi insieme. Altrimenti si alterna uscita e accesso.
- [ ] Sai qual è la build che stai usando. Quella di **sviluppo** prende le
      modifiche da Metro ricaricando; l'APK **preview** ha il bundle
      congelato dentro e non le vedrà mai.

> ⚠️ **La cancellazione dell'account va per ultima.** Distrugge l'account e
> le leghe che possiede, e non si torna indietro.

## 1 — Avvio e navigazione

La navigazione è stata rifatta: le tre schede non impilano più schermate.

- [ ] All'avvio compare l'icona della moneta su fondo pieno, non una griglia
      né un lampo bianco
- [ ] Con il sistema in tema scuro lo sfondo dello splash è scuro
- [ ] **Apri amici → classifiche → amici → home, poi premi indietro:** deve
      uscire dall'app, non ripercorrere i quattro passaggi
- [ ] Indietro da *amici*: riporta alla home, non chiude l'app
- [ ] Da una partita o da una lega, toccare una scheda non lascia la
      schermata precedente sotto

## 2 — Senza account

Contare una partita al tavolo non deve richiedere di accedere.

- [ ] Senza account la home mostra il gioco e l'ingresso da codice, e **non**
      mostra leghe, amici o classifiche
- [ ] La barra delle schede in fondo non compare
- [ ] Nuova partita, nomi delle squadre proposti e modificabili
- [ ] Obiettivo 11 e 21, con *raggiungerlo* e *superarlo*: a 21 con
      *superarlo* la partita non finisce a 21 esatti
- [ ] Primiera disattivata: la sezione non compare nella mano
- [ ] Primiera manuale: tre scelte, compresa la parità
- [ ] Primiera a carte: il totale si aggiorna, e un rango preso da una
      squadra non è selezionabile dall'altra
- [ ] Napola attiva: da 3 in su, e i punti crescono con la lunghezza
- [ ] Donna di denari attiva: due scelte, senza *nessuno*
- [ ] Scope: il contatore si ferma a 18 fra le due squadre insieme
- [ ] Carte e denari incoerenti: compare l'errore e il salvataggio è spento
- [ ] Modifica e cancellazione di una mano già inserita
- [ ] **Fine partita:** la fascia del vincitore entra con un rimbalzo, il suo
      punteggio pulsa, e cadono i coriandoli — una volta, poi si fermano

### Persistenza

- [ ] Con una partita a metà, **chiudi l'app dal selettore** e riaprila: la
      partita è ancora lì con le mani inserite
- [ ] Dopo *nuova partita* la vecchia non ricompare al riavvio

### Impostazioni

- [ ] Tema chiaro e scuro: cambia subito e resta dopo il riavvio
- [ ] Mazzo francese: cambiano nomi dei semi e il 9, nella mano e nella
      primiera a carte
- [ ] Lingua italiano e inglese, e il ritorno a quella del dispositivo
- [ ] In inglese non resta testo italiano in nessuna schermata
- [ ] La versione compare in fondo

## 3 — Un account

- [ ] Accesso: il codice arriva, e l'email è bilingue col codice in grande
- [ ] Il codice è di **sei cifre** e il campo lo accetta
- [ ] Codice sbagliato, scaduto o già usato: messaggi comprensibili
- [ ] Nome visualizzato: si imposta e resta
- [ ] Comparsa della barra delle schede e delle sezioni che prima erano
      nascoste

### Avatar

- [ ] Impostazioni: dodici animali, quello attivo con il bordo verde
- [ ] Sceglierne uno lo fa comparire accanto al tuo nome sulla home
- [ ] **Cambia tema:** la sagoma passa da scura a quasi bianca. Se resta nera
      su fondo scuro, `tintColor` non sta funzionando
- [ ] Chi non ha mai scelto ha comunque un'icona, sempre la stessa

## 4 — Amici

- [ ] Il tuo codice personale è visibile e si può condividere
- [ ] Inserendo il codice di **B** parte la richiesta
- [ ] Un codice inesistente dà un errore comprensibile
- [ ] Il **tuo** codice viene rifiutato con un messaggio chiaro
- [ ] **B** vede la richiesta in arrivo, con nome e icona di chi l'ha mandata
- [ ] **A** vede la stessa richiesta come mandata, non ricevuta
- [ ] **B** accetta: compaiono fra gli amici a vicenda
- [ ] Rifiutare una richiesta la fa sparire da entrambe le parti
- [ ] Togliere un'amicizia funziona da entrambe le parti
- [ ] Scambio incrociato: se **A** manda il codice a **B** e poi **B** manda
      quello di **A**, l'amicizia si completa subito senza due attese

## 5 — Leghe e inviti

- [ ] **A** crea una lega: compare il codice di invito
- [ ] **B** entra col codice
- [ ] **A** invita un amico dalla scheda «Invita i tuoi amici»
- [ ] Chi è già dentro o già invitato **non** compare fra gli invitabili
- [ ] L'invito compare in «In attesa di risposta», e il numero dei
      partecipanti **non** aumenta
- [ ] L'invitato vede l'invito sulla home, sopra le leghe, con il nome della
      lega e di chi l'ha mandato
- [ ] Accettando, la lega compare fra le sue e il conteggio sale
- [ ] Rifiutando, l'invito sparisce e la lega non compare
- [ ] Un membro **non** proprietario non può togliere nessuno
- [ ] Chi ha creato la lega può togliere un altro, ma non se stesso
- [ ] Il proprietario non può uscire: deve eliminarla

## 6 — Tavolo effimero, link e ospiti

Serve a mettere in formazione chi non è socio della lega, anche senza account.
Non passa dal database: vive solo mentre la schermata è aperta.

- [ ] Creando una partita si può generare un codice del tavolo
- [ ] Il codice si condivide, e il messaggio contiene anche il link
- [ ] Chi apre il **link** arriva nella schermata di ingresso
- [ ] Chi ha solo il codice **dettato a voce** entra dalla home
- [ ] Un ospite **senza account** manda il suo nome e resta in attesa
- [ ] Chi ha creato la partita lo vede comparire e lo mette in squadra
- [ ] Chiudendo il tavolo, chi era in attesa se ne accorge
- [ ] Un ospite che accede mentre è in attesa non viene contato due volte

## 7 — Partite di lega

La parte con più pezzi mai esercitati insieme.

- [ ] **A** avvia una partita scegliendo lo schieramento: soci di lega,
      amici e ospiti compaiono nello stesso elenco
- [ ] Accanto a ogni nome nella formazione c'è la sua icona
- [ ] La partita compare a **B** nella lega
- [ ] **B** la apre: vede il tabellone e la fascia *stai seguendo*, senza il
      pulsante per aggiungere una mano
- [ ] **B** prova a toccare una riga di mano: non apre nulla
- [ ] **A** aggiunge una mano — **lo schermo di B si aggiorna da solo.** È il
      punto centrale di tutto il lavoro sulle leghe
- [ ] Se non si aggiorna da solo ma si aggiorna uscendo e rientrando, il
      salvataggio funziona e il problema è la sottoscrizione: sono due guasti
      diversi e conviene non confonderli
- [ ] **A** modifica una mano: **B** vede cambiare il totale
- [ ] **A** conclude la partita: **B** vede il vincitore
- [ ] Tornando alla home, il punteggio nell'elenco è quello giusto
- [ ] La partita conclusa passa da «Da concludere» a «Partite concluse»

### Classifiche

- [ ] Con almeno due partite concluse, la classifica per giocatore ha senso
- [ ] La classifica per coppia ha senso, e una coppia con i ruoli invertiti
      fra due partite resta la stessa coppia
- [ ] Ogni riga mostra le icone dei giocatori, due nelle righe di coppia
- [ ] La scheda classifiche mostra una lega alla volta

## 8 — Cancellazione dell'account

Obbligatoria per Google Play, e distruttiva. **Per ultima**, con un account
che non ti serve più.

- [ ] Dalle impostazioni, con la conferma richiesta
- [ ] Dopo la cancellazione l'app torna allo stato senza account
- [ ] Un nuovo accesso con lo stesso indirizzo crea un account vuoto, senza
      le vecchie leghe

## Come annotare quello che non torna

Per ogni problema servono tre cose, altrimenti non è riproducibile:

1. la schermata e cosa stavi toccando
2. cosa ti aspettavi e cosa è successo
3. il messaggio esatto, se ce n'era uno

Se l'app si chiude da sola, il motivo compare nel terminale dove gira Metro:
è più preciso di qualunque descrizione.
