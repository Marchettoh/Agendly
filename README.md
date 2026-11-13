<p align="center"><img src="public/logo/agendly-logo.svg" alt="Agendly" width="260"></p>
<p align="center"><strong>La tua giornata, sotto controllo.</strong></p>

Agendly è una web app PWA mobile-first per gestire l'agenda personale: eventi, attività e promemoria con notifiche push, viste giornaliera/settimanale/mensile, tema chiaro/scuro e funzionamento offline. Interfaccia interamente in italiano.

## Stack

| Livello | Tecnologia |
| --- | --- |
| Frontend | React 18 + TypeScript, Vite 5, React Router, Tailwind CSS |
| Backend | Firebase Authentication, Cloud Firestore, Cloud Messaging, Cloud Functions (Node 22) |
| PWA | `vite-plugin-pwa` (Workbox, strategia `injectManifest`) |
| Hosting | Firebase Hosting |
| Date/fusi | `date-fns` + `date-fns-tz` (IANA, default `Europe/Rome`, ora legale gestita) |

## Struttura del progetto

```
agendly/
├── public/                 # favicon, icone PWA (192/512/maskable), logo e splash
├── scripts/generate-icons.mjs  # genera tutti gli asset di brand a partire dall'SVG
├── src/
│   ├── components/         # layout, card, banner urgenti, logo, componenti UI (ui/)
│   ├── contexts/           # Auth, Data (Firestore realtime), Theme, Toast
│   ├── hooks/              # stato online, orologio, azioni rapide, watcher promemoria
│   ├── lib/                # firebase, tipi, schema/CRUD, fusi orari, selettori, FCM, errori
│   ├── pages/              # Onboarding, Accesso, Oggi, Agenda, Dettaglio, Nuovo/Modifica,
│   │                       # Promemoria, Notifiche, Impostazioni
│   ├── sw.ts               # service worker: precache, offline, push in background, click
│   └── main.tsx
├── functions/src/          # Cloud Function schedulata che invia le push dei promemoria
├── tests/                  # test regole Firestore e scheduler (emulatore)
├── firestore.rules         # regole di sicurezza
├── firestore.indexes.json
└── firebase.json           # hosting, header di cache/sicurezza, emulatori
```

## Schema Firestore

```
users/{uid}                      profilo
  displayName, email, timezone, notificationsEnabled, theme, createdAt, updatedAt

users/{uid}/items/{itemId}       evento | attività | promemoria
  type          'evento' | 'attivita' | 'promemoria'
  title         string (max 140)
  description   string (max 2000)
  date          'YYYY-MM-DD'   data locale
  time          'HH:mm' | null (attività senza orario)
  timezone      fuso IANA in cui è stata creata la voce (es. Europe/Rome)
  startAt       Timestamp UTC calcolato da date+time+timezone
  category      lavoro | personale | famiglia | acquisti | salute | altro
  priority      bassa | media | alta | urgente
  status        da_fare | in_corso | completato | rinviato
  reminderMinutes  number | null (minuti prima dell'inizio)
  remindAt      Timestamp | null  prossimo invio push (usato dallo scheduler)
  recurrence    none | daily | weekly | monthly
  completedAt, createdAt, updatedAt

users/{uid}/fcmTokens/{token}    token dei dispositivi per le push
  token, userAgent, createdAt, lastSeenAt
```

Ogni utente può leggere/scrivere **solo** i documenti sotto `users/{suo uid}`; le regole validano anche tipi e valori dei campi. Le date sono salvate come data+ora locale + fuso, così un evento alle 10:00 resta alle 10:00 anche attraverso il cambio dell'ora legale, e le ricorrenze mantengono l'orario locale.

## Requisiti

- Node.js 22+ e npm
- Firebase CLI: `npm i -g firebase-tools` (poi `firebase login`)
- Java 21+ (solo per gli emulatori e i test)
- Un progetto Firebase sul **piano Blaze** se vuoi le push con app chiusa (la Cloud Function schedulata lo richiede; per uso personale resta nella quota gratuita)

## Configurazione Firebase (una tantum)

1. Crea un progetto su <https://console.firebase.google.com>.
2. **Authentication → Metodo di accesso**: abilita *Email/password* e *Google*. In *Impostazioni → Domini autorizzati* aggiungi il dominio di hosting (es. `tuo-progetto.web.app`; `localhost` è già presente).
3. **Firestore Database**: crea il database in modalità produzione (regione consigliata `eur3` o `europe-west1`).
4. **Impostazioni progetto → Generali → Le tue app**: registra un'app **Web** e copia l'oggetto di configurazione.
5. **Impostazioni progetto → Cloud Messaging → Configurazione Web → Certificati push web**: genera una coppia di chiavi e copia la **VAPID key**.
6. Collega il progetto alla CLI:
   ```bash
   firebase use --add   # scegli il progetto e l'alias "default"
   ```
   (oppure sostituisci `demo-agendly` con il tuo project ID in `.firebaserc`).

## Variabili d'ambiente

Copia `.env.example` in `.env` e compila i valori:

```bash
cp .env.example .env
```

| Variabile | Dove trovarla |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | config app Web → `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |
| `VITE_FIREBASE_VAPID_KEY` | Cloud Messaging → Certificati push web |
| `VITE_USE_EMULATORS` | `true` per usare Auth/Firestore emulati in locale |

Questi valori sono pubblici per natura (finiscono nel bundle); la protezione dei dati è garantita dalle regole Firestore. Non committare comunque `.env`.

## Sviluppo locale

```bash
npm install
npm --prefix functions install
npm run dev            # http://localhost:5173
```

### Con gli emulatori (senza toccare dati reali)

```bash
# .env.local
VITE_FIREBASE_API_KEY=demo-api-key
VITE_FIREBASE_AUTH_DOMAIN=demo-agendly.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=demo-agendly
VITE_FIREBASE_APP_ID=1:000000000000:web:demo
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_USE_EMULATORS=true
```

```bash
npm run emulators      # Auth :9099, Firestore :8080, UI :4000
npm run dev
```

Con gli emulatori il login Google usa un account fittizio e le push FCM non sono disponibili (le notifiche locali di test sì).

## Comandi npm

| Comando | Descrizione |
| --- | --- |
| `npm run dev` | server di sviluppo Vite |
| `npm run build` | type-check + build di produzione in `dist/` (con service worker) |
| `npm run preview` | serve la build per provare PWA/offline |
| `npm run typecheck` | solo controllo TypeScript |
| `npm run lint` | ESLint |
| `npm test` | test regole Firestore e scheduler sull'emulatore |
| `npm run icons` | rigenera favicon, icone PWA, logo e splash |
| `npm run emulators` | avvia gli emulatori Auth e Firestore |
| `npm run deploy` | build + deploy completo (hosting, regole, indici, functions) |
| `npm run deploy:hosting` | build + deploy del solo hosting |

## Deploy su Firebase

```bash
firebase login
npm install && npm --prefix functions install
npm run deploy
```

Il primo deploy delle functions abilita automaticamente le API necessarie (Cloud Functions, Cloud Scheduler, Cloud Build, Artifact Registry). L'app sarà disponibile su `https://<project-id>.web.app`.

Per CI/CD puoi usare un service account (`GOOGLE_APPLICATION_CREDENTIALS=/percorso/sa.json firebase deploy`) con ruoli *Firebase Admin* e *Service Account User*.

Senza piano Blaze: `firebase deploy --only hosting,firestore` (tutto funziona tranne le push con app chiusa).

## Notifiche push

- **App aperta**: il watcher dei promemoria mostra notifiche locali all'orario previsto e il banner rosso per le voci urgenti imminenti.
- **App chiusa / in background**: la function `sendDueReminders` (ogni minuto, `europe-west1`) cerca le voci con `remindAt` scaduto, invia la push FCM a tutti i dispositivi dell'utente, rimuove i token non più validi e programma l'occorrenza successiva per le ricorrenze.
- La notifica contiene titolo, testo, orario e l'azione **Apri Agendly**; il tocco apre direttamente il dettaglio della voce.
- Le voci con priorità **Urgente** sono inviate con priorità alta e restano visibili finché non vengono toccate.

### iPhone / iPad

Su iOS (16.4+) le notifiche web funzionano **solo** con l'app installata sulla schermata Home: Safari → Condividi → *Aggiungi alla schermata Home*, poi apri Agendly dall'icona e attiva le notifiche da *Impostazioni → Notifiche*.

### Android / desktop

Chrome/Edge propongono l'installazione automaticamente; in alternativa usa *Impostazioni → Installa Agendly* nell'app.

## PWA e offline

- App shell e asset precaricati dal service worker: l'app si apre anche senza connessione.
- Firestore usa la cache persistente (IndexedDB, multi-scheda): le voci restano consultabili offline e le modifiche fatte offline vengono sincronizzate al ritorno della rete.
- Manifest con icone 192/512/maskable, colori di brand, scorciatoie *Nuova voce* e *Oggi*.

## Brand

| Colore | Hex | Uso |
| --- | --- | --- |
| Blu principale | `#2563EB` | azioni primarie, link, focus |
| Blu scuro | `#1E3A8A` | logo, titoli |
| Azzurro chiaro | `#EFF6FF` | sfondi evidenziati |
| Verde | `#16A34A` | completato |
| Arancione | `#F59E0B` | priorità alta, avvisi |
| Rosso | `#DC2626` | urgente, errori |
| Grigio testo | `#1F2937` | testo principale |
| Grigio sfondo | `#F8FAFC` | sfondo app |

Font: **Inter** (variabile, self-hosted). Gli asset del logo (completo, solo icona, monocromatico bianco/nero, splash) sono in `public/logo/`.
