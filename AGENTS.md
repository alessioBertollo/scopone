# Scopone — istruzioni per agenti

App mobile gratuita per il conteggio dei punti a scopone e scopa.

Ha due modi d'uso, e la distinzione regge tutte le scelte di progetto:

- **senza account** si conta una partita al tavolo, senza rete e senza che
  nulla esca dal telefono. È il caso principale e non deve mai regredire.
- **con account** si entra in una lega e le partite diventano condivise: chi
  avvia una partita è l'unico che la modifica, gli altri la seguono dal vivo.

Backend su Supabase (Postgres, auth, realtime, RLS). Le regole di
autorizzazione stanno **nel database**, non nell'app: la chiave pubblica vive
dentro l'APK ed è nota a chiunque, quindi un controllo in una schermata è
pulizia, non sicurezza. Vedi `supabase/README.md`.

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

**I testID non si traducono mai**: restano in italiano anche quando l'app è in
inglese. E i flow non devono contenere asserzioni su testo, perché lingua e
mazzo li sceglie l'utente: si asserisce su identificatori, o sull'assenza di
un elemento.

## Architettura

- `app/` — rotte expo-router: `index`, `friends` e `standings` sono le tre
  schede di primo livello (barra fissa in basso, montata da `_layout.tsx`
  solo su queste tre; `standings` mostra una lega alla volta, mai i
  giocatori di leghe diverse mescolati nella stessa tabella),
  `new-match`, `match` (tabellone, anche in sola lettura per chi segue),
  `hand`, `sign-in`, `settings`, `league/new`, `league/[id]`, e
  `join/index` + `join/[code]` per entrare nella formazione di una partita
  di lega da un link o da un codice, senza essere socio né amico.
- `src/domain/` — logica pura, zero dipendenze da React o React Native.
  È il cuore del progetto: ogni regola di punteggio vive qui ed è testata.
- `src/store/` — stato della partita con zustand, persistito su AsyncStorage.
  Non contiene regole di punteggio: delega tutto al dominio.
  `match-store.ts` è verificabile in Node (i test sostituiscono AsyncStorage
  con un mock in memoria via alias in `vitest.config.mts`); `hooks.ts` tiene
  il collegamento a React, che un renderer lo richiede, ed è escluso dalla
  copertura.
- `src/lib/` — accesso al backend: `supabase.ts` (client creato solo quando
  serve), `auth.ts`, `leagues.ts`, `friends.ts`, `matches.ts`, `deck.ts`,
  `errors.ts` (traduzione degli errori Supabase condivisa fra i moduli),
  `lobby.ts` (tavolo pre-partita effimero su canale Realtime broadcast,
  senza righe di database: solo chi ha creato la partita scrive, gli ospiti
  mandano il nome e restano in ascolto di dove vengono messi).
- `src/i18n/` — dizionari e traduzione.
- `src/ui/` — componenti presentazionali riutilizzabili, senza logica di gioco.
- `src/components/` — componenti che conoscono il dominio.
- `src/test/` — factory e finti per i test, non codice di produzione. I moduli
  che non si possono importare in Node (`react-native`, `expo-localization`,
  AsyncStorage) hanno qui un sostituto, agganciato con un alias in
  `vitest.config.mts`: non duplicarli nei singoli file di test.

Il dominio deve restare importabile da Node senza toccare React Native:
è ciò che permette ai test di girare in millisecondi. La UI consuma il
dominio e non ricalcola mai i punti per conto proprio.

## Icone

La fonte di verità sono gli SVG in `assets/source/`; i PNG sono generati con
`npm run icons` (richiede `rsvg-convert`, da `brew install librsvg`) e
committati perché servono alla build. Non modificare i PNG a mano.

Il soggetto è il settebello: moneta d'oro con il sette, su feltro verde.
Nessun testo negli SVG, solo tracciati, così la resa non dipende dai font
installati.

Attenzione alla versione monocromatica: è una silhouette unica in cui il
sette è ritagliato dalla moneta con `fill-rule="evenodd"`. Qualunque forma
aggiunta che si **sovrapponga** al sette verrebbe riempita invece che
ritagliata, spezzando la cifra. Verifica sempre il risultato rasterizzando su
fondo colorato (`rsvg-convert -b "#1B5E3F"`), perché su bianco il difetto è
invisibile.

### Avatar

Gli animali in `assets/source/avatars/` seguono la stessa pipeline. Sono
sagome monocrome mostrate con `tintColor`: **un solo file serve tema chiaro e
scuro**, e per questo non devono contenere colori. I buchi — occhi, becco,
pancia del pinguino — si fanno con una `<mask>` e non con `evenodd`, che con le
forme sovrapposte riempirebbe invece di ritagliare.

Niente tratti sottili: a ventiquattro punti sparisconono. È il motivo per cui
nell'insieme non c'è un cervo, e perché il granchio ha le zampe innestate nel
corpo invece che staccate.

L'elenco vive in `src/ui/avatar-names.ts`; `src/ui/avatars.ts` mappa i nomi
alle immagini con `satisfies`, così aggiungere un animale senza il disegno dà
errore di compilazione invece di un buco a schermo.

`assets/source` è escluso da Biome in `biome.json`. Non è pigrizia: quegli SVG
sono sorgenti di disegno, non markup di una pagina, e la regola di
accessibilità sugli SVG inline pretenderebbe un `<title>` che nel PNG generato
non esiste. L'etichetta vera la mettono i componenti che mostrano le immagini.

## Testi e lingue

Ogni stringa che l'utente legge sta nei dizionari `src/i18n/it.ts` e
`src/i18n/en.ts`, che devono avere **le stesse chiavi e gli stessi
segnaposto**: un test lo verifica, quindi una traduzione dimenticata fa
fallire la build invece di comparire in produzione.

- Dentro React: `const { t } = useTranslation()`, poi `t('ambito.chiave')`
- Fuori da React, negli strati dati: `tr('ambito.chiave')` da `src/i18n/tr.ts`

I segnaposto si scrivono `{nome}`: mai concatenare stringhe, perché le lingue
hanno ordini diversi. I plurali si risolvono con chiavi distinte, non con
logica dentro la traduzione.

L'italiano è la lingua di riferimento: le chiavi nascono lì. Di partenza l'app
segue la lingua del dispositivo.

## Nomi delle carte

Le chiavi del dominio (`denari`, `coppe`, `spade`, `bastoni`) sono
identificatori, non testo, e **non cambiano mai**: sono salvate sul telefono e
sul server, e rinominarle vorrebbe dire riscrivere i dati a ogni cambio di
impostazione. La traduzione verso ciò che l'utente legge vive in
`src/lib/deck.ts`, che segue il mazzo scelto.

Il nove è la carta che distingue i due mazzi: cavallo con le carte italiane,
donna con le francesi. Se serve mostrarne il nome, passare sempre da
`rankLabelFor`, mai da una costante.

## Stile

NativeWind con i colori come variabili CSS in `global.css`, mappate nel tema
Tailwind. Per cambiare la palette si tocca solo `global.css`.

Il tema scelto (`sistema`, `chiaro`, `scuro`) vive in `src/store/settings-store.ts`
e va riapplicato con `colorScheme.set()` a ogni avvio: NativeWind riparte
sempre da quello di sistema.

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
- Napola e donna di denari sono varianti opzionali, disattivate di default.
- Il punteggio lo calcola **sempre l'app**: il database conserva le mani come
  jsonb e non le reinterpreta, così le regole restano implementate una volta
  sola, quella coperta dai test.

## Peso dell'app

Misurato il 18/08/2026 sull'APK di release, architettura `arm64-v8a`:

| Voce | Peso |
| --- | --- |
| Librerie native | 19,3 MB |
| Bytecode dopo R8 | 13,7 MB |
| Bundle JavaScript | 2,9 MB |
| Risorse | 3,2 MB |
| **APK totale** | **30,6 MB** |

Partiva da 93 MB. La riduzione è venuta da due mosse, entrambe in
`app.json` ed `eas.json`: R8 con rimozione delle risorse inutilizzate, e
l'APK preview limitato alla sola `arm64-v8a`.

Le altre architetture sono state provate e scartate: `x86` e `x86_64` servono
solo agli emulatori, e `armeabi-v7a` costa 13,5 MB per coprire telefoni a 32
bit che sul Play Store vengono comunque serviti dall'app bundle. L'APK
preview è un artefatto di prova, non il canale di distribuzione.

Non insistere su ulteriori ottimizzazioni: il margine è esaurito.

- Il runtime di React Native da solo occupa ~12 MB per architettura
  (`libreactnative`, `libhermesvm`, `libexpo-modules-core`, `libc++_shared`).
  È un pavimento, non è comprimibile.
- **Reanimated non è rimovibile** pur non essendo usato direttamente:
  NativeWind lo richiede a runtime in `react-native-css-interop` per gli
  stili di stato, e ogni `active:` nel codice passa da lì.
- La build di produzione resta un app bundle con tutte le architetture: è
  Google Play a servire a ogni dispositivo solo quella che gli serve, quindi
  restringerle lì non gioverebbe all'utente.

Scendere sotto i ~25 MB richiederebbe un cambio di stack, non una
configurazione diversa.
