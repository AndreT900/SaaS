# Multitool Project Roadmap

## 🚀 Stato Attuale: Full-Stack Funzionante
Backend a microservizi, frontend React e tutti i servizi sono collegati a MongoDB Atlas con autenticazione JWT e controllo accessi per servizio.

---

## ✅ Completato

### Fase 1 — Sistema SaaS Core
- [x] **Flusso SuperAdmin**: Endpoint per creare aziende (`pending`) e generare link di attivazione.
- [x] **Flusso Attivazione**: Endpoint pubblico per validare token e attivare l'azienda impostando la password admin.
- [x] **Autenticazione**: Modulo `auth.py` centralizzato con hashing (Bcrypt) e JWT protetti.
- [x] **Modelli Dati**: Pydantic models integrati per Aziende, Utenti, Chat, Meeting e Calendar.

### Fase 2 — Architettura Microservizi
- [x] **Docker Stack**: 6 servizi configurati (`core`, `chat`, `meetings`, `documents`, `calendar`, `ai_engine`).
- [x] **Calendar Logic**: Gestione ferie standard (nessuna escalation).
- [x] **Chat Logic**: Chiusura chat garantita solo con consenso unanime dei partecipanti.
- [x] **AI Engine**: Integrazione **Groq** (Cloud) + **Embeddings** locali (`all-MiniLM-L6-v2`).

### Fase 3 — Database & Cloud
- [x] **MongoDB Atlas**: Connessione cloud configurata e funzionante.
- [x] **Environment**: File `.env` centralizzato con tutte le chiavi API e segreti.

### Fase 4 — Frontend Setup
- [x] Inizializzazione React Vite nella cartella `/frontend`.
- [x] Configurazione Tailwind CSS per estetica Premium/Dark-mode.
- [x] Librerie core: `axios`, `react-router-dom`, `framer-motion`, `lucide-react`, `jwt-decode`.

### Fase 5 — SaaS UI Flow
- [x] **Pagina di Setup (`/setup?token=...`)**: Interfaccia per inserimento password e conferma attivazione.
- [x] **Auth UI**: Pagina di Login per amministratori e dipendenti.

### Fase 6 — Dashboard Moduli
- [x] **Dashboard Admin**: Gestione utenti e visualizzazione permessi.
- [x] **Chat UI**: Interfaccia messaggistica con sidebar, polling 3s, crea chat con partecipanti.
- [x] **Calendar UI**: Griglia calendario mensile con visualizzazione ferie/permessi, richiesta e cancellazione.
- [x] **Documents UI**: CRUD documenti con tag, preview e AI assistant integrato (Groq).

### Fase 7 — Codebase Cleanup & Bug Fixing (19 Feb 2026)
- [x] **Rimossi import inutilizzati**: `os`, `List`, `Optional`, `Header`, `OAuth2PasswordBearer`, `verify_super_admin` da core service.
- [x] **Rimossa funzione morta**: `verify_super_admin()` in `auth.py` (vecchio sistema auth via header, sostituito da JWT).
- [x] **Fix `datetime.utcnow()` deprecato**: sostituito con `datetime.now(timezone.utc)` in `auth.py`.
- [x] **Fix mismatch ruolo `user` vs `employee`**: il backend usava `employee` ma il frontend controllava `user` in `App.jsx`, `Login.jsx` e `ProtectedRoute.jsx` — gli employee non potevano accedere alla dashboard.
- [x] **Fix `Companies.jsx`**: mostrava `admin_email` (campo inesistente) e data hardcoded `"Today"`. Corretto con `plan` e `created_at` formattato.
- [x] **Fix ridondanza `create_company_user`**: `name` e `job_title` venivano scritti manualmente su `user_dict` nonostante fossero già presenti nel model `User`.
- [x] **Fix `setup_company`**: aggiunta guardia `if not users.find_one(...)` per evitare insert duplicati silenziosi.
- [x] **Riscritto `test_saas.py`**: aggiornato da header `X-Super-Secret` (obsoleto) a JWT auth via `POST /auth/token`.
- [x] **Rimossa riga deprecata `version: '3.8'`** dal `docker-compose.yml`.
- [x] **Eliminati file inutili**: `utils.py` (vuoto), `App.css` (boilerplate Vite), `react.svg` (logo default Vite).
- [x] **Eliminate cartelle vuote**: `hooks/`, `utils/`, `components/features/`, `components/ui/`.
- [x] **Creato `.gitignore`**: protezione `.env`, `CREDENTIALS_DEV.md`, `__pycache__`, `node_modules`, ecc.
- [x] **Creato `DEPLOY_CHECKLIST.md`**: checklist completa per il deploy in produzione (CORS, segreti, Docker, ecc.).

### Fase 8 — Microservizi Collegati a MongoDB & Controllo Accessi (19 Feb 2026)
- [x] **JWT arricchito**: il token ora include `allowed_tools` (lista servizi accessibili) oltre a `sub`, `role`, `company_id`.
- [x] **Controllo accessi per servizio**: superadmin e company_admin hanno accesso a **tutti** i servizi; gli employee solo a quelli selezionati.
- [x] **Chat Service** (porta 8001): riscritto con MongoDB (`chats`, `messages`), JWT auth, CRUD chat/messaggi, chiusura consensuale.
- [x] **Meetings Service** (porta 8002): riscritto con MongoDB (`meetings`), JWT auth, CRUD meeting, upload file metadata, gestione note.
- [x] **Documents Service** (porta 8003): riscritto con MongoDB (`documents`), JWT auth, CRUD documenti con tag, ownership check su delete.
- [x] **Calendar Service** (porta 8004): riscritto con MongoDB (`leaves`), JWT auth, request/cancel leave, duplicate detection, admin company view.
- [x] **AI Engine** (porta 8005): aggiunto CORS middleware e health check endpoint.
- [x] **`python-jose`** aggiunto a tutti i `requirements.txt` dei microservizi per la decodifica JWT.
- [x] **`__init__.py`** creato in tutte le cartelle `src/` dei servizi (necessario per package Python).

### Fase 9 — Frontend Aggiornato per Microservizi Reali (19 Feb 2026)
- [x] **`Users.jsx`**: aggiunto toggle buttons per selezionare i servizi durante la creazione utente. Tabella con icone servizi. Submit disabilitato se nessun servizio selezionato per employee. Nota informativa per admin ("accesso a tutti i servizi").
- [x] **`Chat.jsx`**: riscritto con `apiChat` reale — sidebar chat, polling messaggi, crea chat con email partecipanti, chiusura chat.
- [x] **`Calendar.jsx`**: riscritto con `apiCalendar` reale — griglia mensile, ferie/permessi con icone, richiesta/cancellazione leave.
- [x] **`Documents.jsx`**: riscritto con `apiDocuments` + `apiAI` — CRUD documenti, tag, preview, AI assistant (Groq) su contesto documento.
- [x] **`DashboardLayout.jsx`**: sidebar dinamica — mostra solo i servizi a cui l'utente ha accesso (lettura `allowed_tools` dal JWT).

---

## 🔲 Prossimi Passi

### Testing & Stabilità
- [ ] Test E2E completo: SuperAdmin → Crea azienda → Attivazione → Login admin → Crea utente con servizi → Login employee → Verifica accesso servizi.
- [ ] Unit test per ogni microservizio (endpoint CRUD + auth).
- [ ] Test di integrazione servizi (frontend ↔ backend).

### Funzionalità Mancanti
- [ ] Meetings UI: pagina frontend per la gestione meeting (il backend è pronto).
- [ ] Ricerca semantica documenti: collegare embeddings (`/embed`) alla ricerca nel Documents service.
- [ ] Notifiche real-time: sostituire polling chat con WebSocket.
- [ ] Admin Settings page (`/admin/settings`): attualmente è una route senza contenuto.
- [ ] SuperAdmin Overview page (`/superadmin`): dashboard con statistiche aggregate.

### Miglioramenti
- [ ] Refresh token per evitare ri-login alla scadenza JWT.
- [ ] Rate limiting su `/auth/token` contro brute-force.
- [ ] Upload file reale per Documents (attualmente solo content testuale).
- [ ] Paginazione per chat messages, documenti e utenti.

### Deploy (vedi `DEPLOY_CHECKLIST.md`)
- [ ] CORS: limitare `allow_origins` all'URL frontend di produzione.
- [ ] Rigenerare segreti (.env) per produzione.
- [ ] Reverse proxy (Nginx/Traefik) con HTTPS.
- [ ] Build frontend di produzione (`npm run build`).
- [ ] Rimuovere `--reload` da uvicorn.

---

## 📌 Configurazione Attiva (Sviluppo)

| Servizio | URL | Porta |
|----------|-----|-------|
| Core API | `http://localhost:8000` | 8000 |
| Chat | `http://localhost:8001` | 8001 |
| Meetings | `http://localhost:8002` | 8002 |
| Documents | `http://localhost:8003` | 8003 |
| Calendar | `http://localhost:8004` | 8004 |
| AI Engine | `http://localhost:8005` | 8005 |
| Frontend | `http://localhost:5173` | 5173 |
| Database | MongoDB Atlas (Cloud) | — |
| LLM | `openai/gpt-oss-120b` via Groq | — |
