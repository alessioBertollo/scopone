# Scopone

Contapunti per scopone e scopa. Gratuito e senza pubblicità.

Per contare i punti al tavolo non serve nessun account e non serve rete: la
partita resta sul telefono e non esce nulla. Chi vuole giocare in lega con
altre persone può creare un account, e allora l'app tratta il minimo
indispensabile — email, nome mostrato e partite — su server nell'Unione
Europea. Mai per pubblicità o profilazione: vedi la
[privacy policy](https://alessiobertollo.github.io/scopone/privacy.html).

## Perché

Contare i punti a fine mano è la parte noiosa e litigiosa della partita, e la
primiera la sbagliano tutti — non segue l'ordine delle carte, e chi non ha un
seme perde punti senza accorgersene. Questa app fa il conto al posto tuo,
comprese le varianti di casa.

## Stato

In sviluppo, ma già utilizzabile: si può giocare una partita intera e
riprenderla dopo aver chiuso l'app.

- [x] Motore di punteggio (carte, denari, settebello, primiera, scope)
- [x] Varianti configurabili (napola, donna di denari, traguardo a 11 o 21)
- [x] Validazione delle mani impossibili
- [x] Interfaccia: nuova partita, tabellone, inserimento e modifica mano
- [x] Persistenza della partita in corso
- [ ] Storico delle partite concluse e statistiche
- [ ] Pubblicazione su App Store e Google Play

## Regole implementate

Ogni mano assegna quattro punti base, più uno per ogni scopa:

| Punto | Assegnato a |
| --- | --- |
| Carte | chi ne prende più di 20; a 20 pari nessuno |
| Denari | chi ne prende più di 5; a 5 pari nessuno |
| Settebello | chi prende il 7 di denari, sempre |
| Primiera | totale più alto; a pari nessuno |
| Scope | un punto per scopa |

La primiera somma la carta migliore di ogni seme, con valori propri:

| Carta | 7 | 6 | Asso | 5 | 4 | 3 | 2 | Figure |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Valore | 21 | 18 | 16 | 15 | 14 | 13 | 12 | 10 |

Chi non ha preso nessuna carta di un seme somma zero per quel seme.

Varianti opzionali, disattivate di default:

- **Napola** — asso, due e tre di denari valgono tre punti, più uno per ogni
  denaro consecutivo in più.
- **Donna di denari** — un punto a chi la prende. Come il settebello, è
  sempre di qualcuno.

La partita si chiude quando una squadra taglia il traguardo e non è in parità
con l'avversaria: a pari punti si gioca una mano di spareggio. Il traguardo si
può impostare a 11 o 21 punti, da raggiungere oppure da superare.

## Sviluppo

Richiede Node 22 o superiore.

```bash
npm install
npm run verify
```

| Comando | Cosa fa |
| --- | --- |
| `npm run verify` | lint, typecheck e test — da lanciare prima di ogni commit |
| `npm run test:watch` | test in watch mode |
| `npm run test:coverage` | test con report di copertura |
| `npm run test:e2e` | flow Maestro su emulatore o simulatore |
| `npm run icons` | rigenera i PNG delle icone dagli SVG |
| `npm run lint:fix` | formattazione e fix automatici |
| `npm start` | avvia il server di sviluppo |

## Provare l'app sul telefono

Il giro quotidiano non richiede una build a ogni modifica. Serve installare
una volta sola una **development build**:

```bash
npx eas-cli build --profile development --platform android
```

Poi basta `npm start` sul computer e aprire l'app sul telefono: si collega al
server e si ricarica da sola a ogni salvataggio.

Expo Go sarebbe l'alternativa più immediata, ma segue solo l'SDK più recente e
sul Play Store non è sempre disponibile nella versione giusta: la development
build non ha questo problema ed è la tua app vera, con la sua icona e il suo
nome.

Se telefono e computer sono su reti che si isolano fra loro, il modo più
rapido è collegare il computer all'hotspot del telefono.

Per vedere il prodotto finito, senza server di sviluppo:

```bash
npx eas-cli build --profile preview --platform android
```

che produce un APK installabile e condivisibile.

## Architettura

```
app/          rotte expo-router: index (nuova partita), match, hand
src/
  domain/     logica pura, nessuna dipendenza da React o React Native
  store/      stato della partita (zustand + AsyncStorage), guscio sul dominio
  ui/         componenti presentazionali riutilizzabili
  components/ componenti legati al dominio
  test/       factory condivise dai test
```

La partita in corso viene salvata sul dispositivo a ogni modifica e riletta
all'avvio. Se il salvataggio non è più calcolabile — per esempio dopo un
cambio di formato — viene scartato invece di far crashare l'app.

Il dominio è TypeScript puro e gira in Node: i test completi si eseguono in
poche centinaia di millisecondi, senza emulatori e senza bundler. La UI
consuma il dominio e non ricalcola mai i punti per conto proprio.

La copertura del dominio è al 100% ed è vincolata in CI.

Lo stile usa NativeWind. I colori sono variabili CSS definite in `global.css`
e mappate nel tema Tailwind, così il tema chiaro e quello scuro cambiano in
un posto solo.

## Licenza

MIT
