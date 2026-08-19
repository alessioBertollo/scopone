/**
 * Dizionario italiano. È la lingua di riferimento: ogni chiave nasce qui, e
 * `en.ts` deve avere esattamente le stesse, cosa verificata da un test.
 */
export const it = {
  'app.tagline': 'Il conto dei punti, primiera compresa.',

  'settings.title': 'Impostazioni',
  'settings.close': 'Chiudi',
  'settings.appearance': 'Aspetto',
  'settings.theme': 'Tema',
  'settings.theme.system': 'Sistema',
  'settings.theme.light': 'Chiaro',
  'settings.theme.dark': 'Scuro',
  'settings.theme.hint': 'Con "Sistema" segue le impostazioni del telefono.',
  'settings.deck': 'Carte',
  'settings.deck.italiane': 'Italiane',
  'settings.deck.francesi': 'Francesi',
  'settings.deck.hint':
    'Cambia solo come si chiamano le carte: {esempio}. I punti restano identici.',
  'settings.language': 'Lingua',
  'settings.language.system': 'Sistema',
  'settings.language.hint': 'Di partenza segue la lingua del telefono.',
  'settings.account': 'Account',
  'settings.account.signedInAs': 'Hai effettuato l’accesso come {nome}',
  'settings.account.signedOut':
    'Non hai effettuato l’accesso. Serve solo per le leghe: contare una partita al tavolo funziona senza.',
  'settings.account.signIn': 'Accedi',
  'settings.account.signOut': 'Esci',
  'settings.account.name': 'Nome mostrato',
  'settings.account.nameHint': 'Lo vedono gli altri membri delle tue leghe.',
  'settings.account.namePlaceholder': 'Come ti chiamano al tavolo',
  'settings.account.save': 'Salva',
  'settings.account.saved': 'Salvato',
  'settings.account.email': 'Email',
  'settings.account.emailHint': 'Serve solo ad accedere: gli altri giocatori non la vedono.',
  'settings.delete.title': 'Cancellare l’account',
  'settings.delete.body':
    'Cancelli account, nome, partite che hai avviato e le leghe che hai creato. Le leghe spariscono anche per gli altri membri, perché una lega senza proprietario non sarebbe più amministrabile.',
  'settings.delete.irreversible': 'Non è reversibile e non conserviamo copie.',
  'settings.delete.action': 'Cancella il mio account',
  'settings.delete.confirmTitle': 'Cancellare il tuo account?',
  'settings.delete.confirmBody':
    'Spariscono account, nome, partite che hai avviato e le leghe che hai creato, anche per gli altri membri. Non è reversibile.',
  'settings.delete.confirmCancel': 'Annulla',
  'settings.delete.confirmOk': 'Cancella tutto',
  'settings.version': 'Versione {versione}',
  'settings.sourceCode': 'Codice sorgente su GitHub',

  'common.error': 'Qualcosa è andato storto.',
  'common.back': 'Torna indietro',
} satisfies Record<string, string>
