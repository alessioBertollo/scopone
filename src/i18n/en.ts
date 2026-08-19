import type { it } from './it'

/** English dictionary. Must carry exactly the same keys as `it.ts`. */
export const en: Record<keyof typeof it, string> = {
  'app.tagline': 'Score keeping, primiera included.',

  'settings.title': 'Settings',
  'settings.close': 'Close',
  'settings.appearance': 'Appearance',
  'settings.theme': 'Theme',
  'settings.theme.system': 'System',
  'settings.theme.light': 'Light',
  'settings.theme.dark': 'Dark',
  'settings.theme.hint': 'With "System" it follows your phone settings.',
  'settings.deck': 'Cards',
  'settings.deck.italiane': 'Italian',
  'settings.deck.francesi': 'French',
  'settings.deck.hint':
    'Only changes what the cards are called: {esempio}. Scoring is identical.',
  'settings.language': 'Language',
  'settings.language.system': 'System',
  'settings.language.hint': 'Follows your phone language by default.',
  'settings.account': 'Account',
  'settings.account.signedInAs': 'Signed in as {nome}',
  'settings.account.signedOut':
    'You are not signed in. It is only needed for leagues: counting a match at the table works without it.',
  'settings.account.signIn': 'Sign in',
  'settings.account.signOut': 'Sign out',
  'settings.account.name': 'Display name',
  'settings.account.nameHint': 'Other members of your leagues see this.',
  'settings.account.namePlaceholder': 'What they call you at the table',
  'settings.account.save': 'Save',
  'settings.account.saved': 'Saved',
  'settings.account.email': 'Email',
  'settings.account.emailHint': 'Only used to sign you in: other players never see it.',
  'settings.delete.title': 'Delete your account',
  'settings.delete.body':
    'This deletes your account, name, the matches you started and the leagues you created. Those leagues disappear for the other members too, because a league without an owner cannot be administered.',
  'settings.delete.irreversible': 'This cannot be undone and we keep no copies.',
  'settings.delete.action': 'Delete my account',
  'settings.delete.confirmTitle': 'Delete your account?',
  'settings.delete.confirmBody':
    'Your account, name, the matches you started and the leagues you created all disappear, for other members too. This cannot be undone.',
  'settings.delete.confirmCancel': 'Cancel',
  'settings.delete.confirmOk': 'Delete everything',
  'settings.version': 'Version {versione}',
  'settings.sourceCode': 'Source code on GitHub',

  'common.error': 'Something went wrong.',
  'common.back': 'Go back',
}
