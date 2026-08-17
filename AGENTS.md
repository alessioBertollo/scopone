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
```

## Architettura

- `src/domain/` — logica pura, zero dipendenze da React o React Native.
  È il cuore del progetto: ogni regola di punteggio vive qui ed è testata.
- `src/test/` — factory per i test, non codice di produzione.
- La UI (quando esisterà) consuma il dominio e non ricalcola mai i punti.

Il dominio deve restare importabile da Node senza toccare React Native:
è ciò che permette ai test di girare in millisecondi.

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
