# Materiali per la pubblicazione

Testi e risposte pronte da ricopiare nel Play Console. Tenuti nel repository
perché sono parte del prodotto quanto il codice: quando cambia un
comportamento dell'app, qui va aggiornata la dichiarazione corrispondente.

| File | Cosa contiene |
| --- | --- |
| [closed-test.md](closed-test.md) | Il test chiuso da 12 tester e 14 giorni. **Da leggere per primo** |
| [play-listing-it.md](play-listing-it.md) | Nome, descrizioni e campi della scheda in italiano |
| [play-listing-en.md](play-listing-en.md) | Idem in inglese |
| [data-safety.md](data-safety.md) | Risposte al questionario sulla sicurezza dei dati |
| [content-rating.md](content-rating.md) | Risposte al questionario IARC |

La privacy policy non sta qui: è una pagina pubblicata, e vive in
[`docs/privacy.html`](../docs/privacy.html).

## Ordine di esecuzione

1. Verifica identità sul Play Console — è bloccante e può richiedere giorni
2. Crea la scheda dell'app e compila `data-safety` e `content-rating`
3. Pubblica GitHub Pages e prendi l'URL della privacy policy
4. Genera l'AAB e caricalo sulla traccia di test chiuso
5. **Avvia il closed test**: da qui partono i 14 giorni
6. Nel frattempo: icona, screenshot, rifiniture

## Cosa manca ancora

- [ ] Email di contatto pubblica dedicata (non quella di lavoro)
- [ ] Icona dell'app: ora è ancora quella di default di Expo
- [ ] Feature graphic 1024×500
- [ ] Almeno due screenshot da telefono reale
- [ ] GitHub Pages attivato sulla cartella `docs/`
