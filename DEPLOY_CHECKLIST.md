# 🚀 Checklist Pre-Deploy — Multitool SaaS

Questo documento raccoglie tutte le modifiche obbligatorie da fare **prima** di mandare il progetto in produzione.

---

## 1. 🔐 Segreti e Variabili d'Ambiente

### Problema attuale
Il file `.env` contiene credenziali in chiaro usate in sviluppo:
- `MONGO_URI` con username/password MongoDB Atlas
- `GROQ_API_KEY` 
- `SUPER_ADMIN_KEY` (password del superadmin)
- `SECRET_KEY` (chiave di firma JWT)

### Azioni richieste

- [ ] **Rigenerare tutte le credenziali** per la produzione (nuova password MongoDB, nuova API key Groq)
- [ ] **Cambiare `SECRET_KEY`** con una stringa crittograficamente sicura (es. `openssl rand -hex 32`)
- [ ] **Cambiare `SUPER_ADMIN_KEY`** con una password forte
- [ ] **Non committare `.env`** — è già nel `.gitignore`, ma verificalo prima del primo push
- [ ] Usare un **secret manager** (es. AWS Secrets Manager, Docker Secrets, Vault) invece di `.env` in produzione

---

## 2. 🌐 CORS — Cross-Origin Resource Sharing

### Problema attuale
In `services/core/src/main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Accetta richieste da QUALSIASI sito
)
```

Con `"*"`, qualsiasi sito web può fare richieste al backend a nome degli utenti loggati (attacco CSRF/cross-origin).

### Azione richiesta

- [ ] Sostituire `["*"]` con l'URL esatto del frontend in produzione:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://app.multitool.com"],  # Solo il tuo dominio
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

> **Tip**: Puoi rendere il valore dinamico leggendolo da `.env`:
> ```python
> import os
> ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
> allow_origins=ALLOWED_ORIGINS
> ```

---

## 3. 🔑 Autenticazione e JWT

### Azioni richieste

- [ ] **`ACCESS_TOKEN_EXPIRE_MINUTES`**: attualmente 30 minuti. Valutare se è troppo lungo per il tuo caso d'uso. In ambienti sensibili si usa 15 min + refresh token
- [ ] **Implementare refresh token**: attualmente il token scade e l'utente deve ri-loggarsi. In produzione serve un flusso `refresh_token` per una UX migliore
- [ ] **Login superadmin**: attualmente il superadmin si autentica confrontando la password con `SUPER_ADMIN_KEY` in chiaro. In produzione, creare un vero utente superadmin nel database con password hashata
- [ ] **Rate limiting**: aggiungere un rate limiter sull'endpoint `/auth/token` per prevenire attacchi brute-force (es. `slowapi` per FastAPI)

---

## 4. 🗄️ Database

### Azioni richieste

- [ ] **Indici MongoDB**: creare gli indici necessari per le query frequenti:
  ```javascript
  db.users.createIndex({ "email": 1 }, { unique: true })
  db.users.createIndex({ "company_id": 1 })
  db.companies.createIndex({ "responsible_email": 1 }, { unique: true })
  db.companies.createIndex({ "activation_token": 1 })
  ```
- [ ] **Credenziali dedicate**: creare un utente MongoDB con permessi minimi (solo lettura/scrittura sul database `multitool`, non admin)
- [ ] **Backup**: configurare backup automatici su MongoDB Atlas

---

## 5. 🐳 Docker & Infrastruttura

### Azioni richieste

- [ ] **Rimuovere `--reload`** dai comandi uvicorn nel `docker-compose.yml` (è solo per sviluppo)
  ```yaml
  # Dev:  uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
  # Prod: uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers 4
  ```
- [ ] **Rimuovere i volume mount** del codice sorgente (servono solo per hot-reload in dev)
- [ ] **Aggiungere un reverse proxy** (Nginx o Traefik) davanti a tutti i servizi per:
  - Terminazione SSL/TLS (HTTPS)
  - Routing unificato (un solo dominio, path diversi per servizio)
  - Rate limiting globale
- [ ] **Health check Docker**: aggiungere `healthcheck` nei servizi compose:
  ```yaml
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
    interval: 30s
    timeout: 5s
    retries: 3
  ```

---

## 6. 🖥️ Frontend

### Azioni richieste

- [ ] **Build di produzione**: usare `npm run build` e servire i file statici con Nginx, non con il dev server Vite
- [ ] **Variabili d'ambiente**: configurare `VITE_API_Core_URL` e le altre con gli URL di produzione
- [ ] **HTTPS**: tutto il traffico deve passare su HTTPS (sia frontend che API)

---

## 7. 📋 Varie

- [ ] **Logging strutturato**: sostituire i `print()` nei microservizi con un logger Python properly configurato (es. `logging` o `structlog`)
- [ ] **Error handling globale**: aggiungere un exception handler globale in FastAPI per non esporre stacktrace al client
- [ ] **CREDENTIALS_DEV.md**: questo file è solo per sviluppo. **Non deve esistere** nell'ambiente di produzione
- [ ] **Test file** (`test_saas.py`, `test_microservices.py`): non deployarli in produzione

---

## Quick Reference — Comandi Utili

```bash
# Generare una SECRET_KEY sicura
openssl rand -hex 32

# Build di produzione frontend
cd frontend && npm run build

# Avviare tutto in produzione (dopo aver configurato)
docker compose --profile all up -d --build

# Controllare lo stato dei container
docker compose ps
```
