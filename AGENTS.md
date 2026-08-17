# Scopone — istruzioni per agenti

App mobile gratuita e offline per il conteggio dei punti a scopone e scopa.
Nessun backend, nessun account, nessuna raccolta di dati.

## Expo È CAMBIATO

Consulta la documentazione della versione esatta su
https://docs.expo.dev/versions/v57.0.0/ prima di scrivere codice Expo.

## Comandi

```bash
npm run verify        # lint + typecheck + test, da lanciare prima di ogni commit
npm run test:watch    # test in watch durante lo sviluppo
npm run lint:fix      # formattazione e fix automatici (Biome)
npm run test:e2e      # flow Maestro, richiede Maestro e un dispositivo attivo
```

## Test end-to-end

I flow stanno in `.maestro/` e girano su un emulatore Android in CI
(workflow `E2E`, avvio manuale). Puntano agli identificatori `testID`, non
alle etichette: i nomi delle squadre sono scelti dall'utente e diversi titoli
sono resi maiuscoli via CSS, quindi il testo non è un aggancio affidabile.

Aggiungendo un elemento interattivo, dargli un `testID` in kebab-case. I
componenti composti espongono un prefisso: `Stepper` genera `<id>-meno`,
`<id>-piu` e `<id>-valore`, `Segmented` genera `<id>-<valore-opzione>`.

## Architettura

- `app/` — rotte expo-router: `index` (nuova partita), `match` (tabellone),
  `hand` (inserimento e modifica mano, presentata come modale).
- `src/domain/` — logica pura, zero dipendenze da React o React Native.
  È il cuore del progetto: ogni regola di punteggio vive qui ed è testata.
- `src/store/` — stato della partita con zustand, persistito su AsyncStorage.
  Non contiene regole di punteggio: delega tutto al dominio.
  `match-store.ts` è verificabile in Node (i test sostituiscono AsyncStorage
  con un mock in memoria via alias in `vitest.config.mts`); `hooks.ts` tiene
  il collegamento a React, che un renderer lo richiede, ed è escluso dalla
  copertura.
- `src/ui/` — componenti presentazionali riutilizzabili, senza logica di gioco.
- `src/components/` — componenti che conoscono il dominio.
- `src/test/` — factory per i test, non codice di produzione.

Il dominio deve restare importabile da Node senza toccare React Native:
è ciò che permette ai test di girare in millisecondi. La UI consuma il
dominio e non ricalcola mai i punti per conto proprio.

## Stile

NativeWind con i colori come variabili CSS in `global.css`, mappate nel tema
Tailwind. Per cambiare la palette si tocca solo `global.css`.

`darkMode` in `tailwind.config.js` deve restare `'class'`: con `'media'`
(che è anche il default quando il campo manca) il runtime web di NativeWind
va in errore appena sincronizza lo schema colori.

## Convenzioni

- TypeScript strict, `noUncheckedIndexedAccess` incluso. Niente `any`, niente `!`.
- Formattazione e lint: Biome. Non aggiungere ESLint o Prettier.
- Stato immutabile: le funzioni su `Match` restituiscono un nuovo oggetto.
- Le funzioni di validazione restituiscono la lista dei problemi, non lanciano.
  Solo `scoreHand` lancia, e solo su dati già invalidi.
- Commit in stile Conventional Commits.
- Nessuna attribuzione ad AI nei commit, nei file o nella documentazione.

## Regole di dominio da non sbagliare

- Le carte prese dalle due squadre sommano sempre a 40, i denari a 10.
- Carte, denari e primiera non vengono assegnati in caso di parità.
  Il settebello invece è sempre di qualcuno.
- I valori di primiera non seguono l'ordine delle carte:
  7=21, 6=18, asso=16, 5=15, 4=14, 3=13, 2=12, figure=10.
- Chi non ha carte di un seme somma zero per quel seme nella primiera.
- La partita si chiude solo se una squadra raggiunge il traguardo **e**
  non è in parità con l'altra: a pari punti si gioca un'altra mano.
- Napola e rebello sono varianti opzionali, disattivate di default.
