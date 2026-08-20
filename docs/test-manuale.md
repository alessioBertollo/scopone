# Prova manuale

Elenco delle cose che i test automatici non possono verificare: il tempo
reale, le policy del database, la persistenza fra riavvii, e il
comportamento con due persone diverse davanti a due telefoni.

I test unitari coprono le regole del punteggio; qui si prova tutto il resto.

## Prima di cominciare

- [ ] Un **secondo indirizzo email** qualsiasi. Da quando l'SMTP è
      configurato non serve più che sia collegato al progetto Supabase.
- [ ] Metro attivo, build di sviluppo installata sul telefono.
- [ ] Se hai un secondo dispositivo, usalo per il secondo account: il tempo
      reale si vede meglio con due schermi accesi contemporaneamente.
      Altrimenti va bene alternare uscita e accesso sullo stesso telefono.

> ⚠️ **La cancellazione dell'account va provata per ultima.** Distrugge
> l'account e le leghe che possiede, e non si torna indietro.

## 1 — Senza account

Contare una partita al tavolo non deve richiedere di accedere. Questa parte
si prova con l'app appena installata, senza toccare l'accesso.

- [ ] Nuova partita, nomi delle squadre proposti e modificabili
- [ ] Obiettivo 11 e 21, con *raggiungerlo* e *superarlo*: a 21 con
      *superarlo* la partita non finisce a 21 esatti
- [ ] Primiera disattivata: la sezione non compare nella schermata della mano
- [ ] Primiera manuale: tre scelte, compresa la parità
- [ ] Primiera a carte: il totale si aggiorna, e un rango preso da una
      squadra non è selezionabile dall'altra
- [ ] Napola attiva: da 3 in su, e i punti crescono con la lunghezza
- [ ] Donna di denari attiva: due scelte, senza *nessuno*
- [ ] Scope: il contatore si ferma a 18 fra le due squadre insieme
- [ ] Carte e denari: se la somma non torna compare l'errore e il pulsante
      di salvataggio resta spento
- [ ] Modifica di una mano già inserita, e cancellazione
- [ ] Fine partita: compare il vincitore e il pulsante diventa
      *nuova partita*

### Persistenza

- [ ] Con una partita a metà, **chiudi l'app dal selettore di applicazioni**
      e riaprila: la partita è ancora lì con le mani inserite
- [ ] Dopo *nuova partita* la vecchia non ricompare al riavvio

### Impostazioni

- [ ] Tema chiaro e scuro: cambia subito, e resta dopo il riavvio
- [ ] Mazzo francese: i nomi dei semi e il 9 cambiano nella schermata della
      mano e nella primiera a carte
- [ ] Lingua: italiano e inglese, e il ritorno alla lingua del dispositivo
- [ ] In inglese non resta testo italiano in nessuna schermata
- [ ] La versione compare in fondo

## 2 — Un account

- [ ] Accesso: il codice arriva, e l'email è quella bilingue con il codice
      in grande
- [ ] Codice sbagliato: messaggio comprensibile, non un errore tecnico
- [ ] Codice scaduto o già usato: idem
- [ ] Nome visualizzato: si imposta e resta
- [ ] Crea una lega: compare il codice di invito
- [ ] La lega compare nella home
- [ ] Esci e rientra con lo stesso indirizzo: la lega è ancora tua
- [ ] Avvia una partita di lega e inserisci qualche mano

## 3 — Due account

È la parte mai provata, e quella dove i problemi sono più probabili.
Chiamiamo **A** chi crea la lega e **B** l'altro.

- [ ] **B** accede col secondo indirizzo
- [ ] **B** entra nella lega col codice di invito
- [ ] **B** vede la lega nella home, con entrambi i membri
- [ ] **A** avvia una partita scegliendo lo schieramento: chi sta con chi
- [ ] La partita compare a **B** nella lega
- [ ] **B** la apre: vede il tabellone e la fascia *stai seguendo*, senza il
      pulsante per aggiungere una mano
- [ ] **B** prova a toccare una riga di mano: non deve aprire nulla
- [ ] **A** aggiunge una mano — **lo schermo di B si aggiorna da solo**,
      senza uscire e rientrare. È il punto centrale di tutto il lavoro sulle
      leghe: se non funziona qui, non funziona.
- [ ] **A** modifica una mano già inserita: **B** vede il totale cambiare
- [ ] **A** porta la partita a termine: **B** vede il vincitore

### Classifiche

- [ ] Con almeno due partite concluse, la classifica per giocatore ha senso
- [ ] La classifica per coppia ha senso, e una coppia con i ruoli invertiti
      fra due partite resta la stessa coppia

## 4 — Quello che il database deve rifiutare

Questi controlli vivono nelle policy, non nell'app: la chiave pubblica sta
dentro l'APK, quindi un controllo lato client non dimostrerebbe niente.

- [ ] **A**, che possiede la lega, prova a uscirne: **deve essere rifiutato**
      con un messaggio che spiega che va cancellata
- [ ] **B** esce dalla lega: riesce, e la lega gli sparisce dalla home
- [ ] **A** cancella la lega: sparisce, e le sue partite con essa
- [ ] Riavvia l'app: la lega cancellata non ricompare

## 5 — Cancellazione dell'account

Obbligatoria per la pubblicazione su Google Play, e mai provata. **Per
ultima**, e con un account che non ti serve più.

- [ ] Dalle impostazioni, cancellazione con la conferma richiesta
- [ ] Dopo la cancellazione l'app torna allo stato senza account
- [ ] Un nuovo accesso con lo stesso indirizzo crea un account nuovo, vuoto,
      senza le vecchie leghe

## Come annotare quello che non torna

Per ogni problema serve sapere tre cose, altrimenti non è riproducibile:

1. la schermata e cosa stavi toccando
2. cosa ti aspettavi e cosa è successo
3. il messaggio esatto, se ce n'era uno

Se l'app si chiude da sola, il motivo compare nel terminale dove gira Metro:
è più preciso di qualunque descrizione.
