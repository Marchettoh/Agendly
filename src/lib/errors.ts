import { FirebaseError } from 'firebase/app';

const MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'L’indirizzo email non è valido.',
  'auth/missing-email': 'Inserisci il tuo indirizzo email.',
  'auth/missing-password': 'Inserisci la password.',
  'auth/user-disabled': 'Questo account è stato disattivato.',
  'auth/user-not-found': 'Nessun account trovato con questa email.',
  'auth/wrong-password': 'Password errata. Riprova.',
  'auth/invalid-credential': 'Email o password non corrette.',
  'auth/invalid-login-credentials': 'Email o password non corrette.',
  'auth/email-already-in-use': 'Esiste già un account con questa email.',
  'auth/weak-password': 'La password deve contenere almeno 6 caratteri.',
  'auth/too-many-requests': 'Troppi tentativi. Attendi qualche minuto e riprova.',
  'auth/network-request-failed': 'Connessione assente. Controlla la rete e riprova.',
  'auth/popup-closed-by-user': 'Accesso con Google annullato.',
  'auth/cancelled-popup-request': 'Accesso con Google annullato.',
  'auth/popup-blocked': 'Il browser ha bloccato la finestra di accesso. Consenti i popup e riprova.',
  'auth/operation-not-allowed': 'Questo metodo di accesso non è abilitato nel progetto Firebase.',
  'auth/unauthorized-domain': 'Dominio non autorizzato per l’accesso. Aggiungilo nella console Firebase.',
  'auth/requires-recent-login': 'Per sicurezza, esci e accedi di nuovo prima di ripetere l’operazione.',
  'permission-denied': 'Non hai i permessi per questa operazione.',
  unavailable: 'Servizio non raggiungibile. Le modifiche verranno sincronizzate appena torni online.',
  'not-found': 'Elemento non trovato.',
  'deadline-exceeded': 'L’operazione ha impiegato troppo tempo. Riprova.',
  'messaging/permission-blocked': 'Le notifiche sono bloccate dal browser.',
  'messaging/unsupported-browser': 'Questo browser non supporta le notifiche push.',
  'messaging/token-subscribe-failed': 'Impossibile registrare il dispositivo per le notifiche. Riprova.',
};

export function errorMessage(err: unknown, fallback = 'Si è verificato un errore imprevisto. Riprova.'): string {
  if (err instanceof FirebaseError) return MESSAGES[err.code] ?? fallback;
  if (err && typeof err === 'object' && 'code' in err && typeof err.code === 'string' && MESSAGES[err.code]) {
    return MESSAGES[err.code];
  }
  if (err instanceof Error && err.message && /[àèéìòù]|\s(il|la|di|non)\s/i.test(err.message)) return err.message;
  return fallback;
}
