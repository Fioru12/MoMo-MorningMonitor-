# ☀️ MoMo — Morning Monitor

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&style=flat-square)
![Express](https://img.shields.io/badge/Express-4.21-000?logo=express&style=flat-square)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)
![CI](https://img.shields.io/badge/CI-passing-brightgreen?style=flat-square)
![WebSocket](https://img.shields.io/badge/WebSocket-real--time-4FC08D?style=flat-square)
![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?style=flat-square)

**Il tuo mattino, perfettamente organizzato.**
Meteo, focus del giorno, briefing, sistema e tanto altro in un'unica dashboard personale, personalizzabile e installabile come app.

[✨ Funzionalità](#-funzionalità) • [📦 Installazione](#-installazione) • [🛠️ Stack Tecnico](#️-stack-tecnico) • [📈 API](#-api)

</div>

---

## ✨ Funzionalità

### 🌅 Mattino
- Meteo in tempo reale con temperatura percepita, umidità, vento e previsioni a 3 giorni
- Alba/tramonto e geolocalizzazione automatica
- Briefing giornaliero con citazione motivazionale e notizie in evidenza
- Focus del giorno — l'unico obiettivo su cui concentrarsi
- Notizie dal mondo (non solo tech) con ticker live a velocità di lettura
- Notifiche push del browser per promemoria e aggiornamenti

### 🧰 Produttività
- Todo list con completamento, animazioni e persistenza
- Note veloci
- Bookmarks con link rapidi
- CLI Snippets — comandi da terminale salvati e pronti all'uso
- **Web Terminal** — esegui comandi sul tuo PC direttamente dalla dashboard, protetto da PIN
- Calendario mensile con indicatori dei task
- Pomodoro timer integrato

### 💻 Monitor di sistema
- CPU & RAM in tempo reale via WebSocket, con sparkline storico
- Rete, storage, servizi in esecuzione e container Docker attivi
- Integrazione GitHub (profilo e repository)

### 📈 Mercati
- Schermata dedicata con indici (S&P 500, Nasdaq, FTSE MIB), ETF (QQQ, SPY, Vanguard All-World) e crypto (BTC, ETH, SOL) con sparkline storico

### 🎨 Personalizzazione
- Griglia widget drag & drop e ridimensionabile (layout salvato in locale)
- Profili rapidi (Mattina / Lavoro / Sera) per adattare la vista al momento della giornata
- Selettore colore accent, tema chiaro/scuro e oltre 25 sfondi
- Backup e ripristino della configurazione (widget, layout, preferenze) in un file locale
- Installabile come PWA, con supporto offline via service worker

### 🛡️ Sicurezza & affidabilità
- Helmet.js per gli header HTTP, rate limiting e compressione
- Il server risponde solo al tuo PC per default (non è raggiungibile da altri dispositivi a meno che tu non lo esponga esplicitamente)
- Web Terminal protetto da PIN (generato automaticamente o impostato da te)
- Persistenza su SQLite con migrazione automatica dai vecchi dati JSON
- Export dati (todo, note, metriche di sistema) in CSV

---

## 🛠️ Stack Tecnico

| Tecnologia | Ruolo |
|---|---|
| **Node.js 18+** | Runtime |
| **Express 4** | Web server & API |
| **WebSocket (ws)** | Metriche di sistema in tempo reale |
| **SQLite** | Persistenza dati |
| **systeminformation** | Raccolta metriche hardware/OS |
| **GridStack.js** | Griglia widget drag & drop |
| **Chart.js** | Sparkline CPU/RAM |
| **Helmet / express-rate-limit / compression** | Sicurezza e performance |
| **Docker** | Containerizzazione |
| **wttr.in** | Dati meteo (gratuito, nessuna API key) |
| **Google News / Yahoo Finance** | Notizie dal mondo e dati di mercato (gratuiti, nessuna API key) |

---

## 📦 Installazione

### Prerequisiti
- Node.js 18+ oppure Docker

### Opzione 1: Docker
```bash
docker build -t momo .
docker run -d \
  --name momo \
  -p 3100:3100 \
  -v $(pwd)/data:/app/data \
  momo
```

### Opzione 2: Docker Compose
```bash
docker compose up -d
```

### Opzione 3: Manuale
```bash
git clone https://github.com/Fioru12/MoMo-MorningMonitor-.git
cd MoMo-MorningMonitor-
npm install
npm start
```

Apri [http://localhost:3100](http://localhost:3100) nel browser. Su Windows puoi anche usare `start-momo.bat` per avviare il server con un doppio click.

---

## 🔧 Configurazione

| Variabile | Default | Descrizione |
|---|---|---|
| `PORT` | `3100` | Porta del server (HTTP + WebSocket) |
| `NODE_ENV` | `production` | Ambiente di esecuzione |
| `HOST` | `127.0.0.1` | Interfaccia di rete. Lascialo com'è per uso personale; `0.0.0.0` lo rende raggiungibile da altri dispositivi in rete locale (impostato automaticamente dentro Docker) |
| `TERMINAL_PIN` | generato a caso ad ogni avvio | PIN richiesto per usare il Web Terminal. Fissalo se esponi MoMo oltre al tuo PC |

Copia `.env.example` in `.env` per personalizzare. Non sono richieste API key: meteo, news e mercati usano fonti pubbliche gratuite.

> ⚠️ **Il Web Terminal esegue comandi shell reali sul tuo PC.** Il PIN lo protegge da accessi non autorizzati, ma se decidi di impostare `HOST=0.0.0.0` fallo solo su una rete di cui ti fidi.

### WebSocket
```javascript
const ws = new WebSocket('ws://localhost:3100');
ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);
  if (type === 'system') console.log('CPU:', data.cpu.usage, 'RAM:', data.memory.percent);
};
```

---

## 🏗️ Architettura

```
MoMo-MorningMonitor-/
├── server.js              # Bootstrap Express + WebSocket
├── src/
│   ├── routes/            # Endpoint API, raggruppati per dominio
│   ├── services/          # Logica (meteo, news, mercati, sistema, GitHub)
│   ├── utils/             # Helper condivisi (formattazione, ecc.)
│   └── ws/                # Handler WebSocket
├── public/
│   ├── index.html         # UI della dashboard
│   ├── style.css          # Entry point CSS (@import da css/)
│   ├── css/                # Stili divisi per dominio (variabili, base, componenti, widget)
│   ├── script.js          # Entry point JS (import da js/app.js)
│   ├── js/
│   │   ├── app.js         # Inizializzazione app
│   │   ├── state.js       # Stato condiviso e helper fetch
│   │   └── modules/       # Un modulo per funzionalità (tema, timer, notifiche, widget...)
│   ├── sw.js              # Service worker (PWA/offline)
│   └── manifest.json      # Manifest PWA
├── data/
│   ├── db.js              # Layer SQLite + migrazione da JSON
│   └── *.json             # Dati legacy (migrati al primo avvio)
├── Dockerfile
├── docker-compose.yml
└── tests/                 # Test suite API
```

---

## 📈 API

| Endpoint | Descrizione |
|---|---|
| `GET /api/health` | Health check |
| `GET /api/system` | Metriche di sistema (CPU, RAM, uptime) |
| `GET /api/weather` | Meteo e previsioni |
| `GET /api/news` | Notizie tech (HackerNews) |
| `GET /api/worldnews` | Notizie dal mondo (Google News) |
| `GET /api/briefing` | Briefing giornaliero |
| `GET /api/quote` | Citazione motivazionale |
| `GET/POST/PUT/DELETE /api/todos` | Gestione todo |
| `GET/POST/DELETE /api/notes` | Note veloci |
| `GET/POST/DELETE /api/bookmarks` | Bookmarks |
| `GET/POST/DELETE /api/snippets` | CLI snippets salvati |
| `POST /api/snippets/exec` | Esegue un comando shell (Web Terminal) — **richiede `pin` nel body** |
| `GET /api/calendar` | Calendario mensile |
| `GET /api/network` | Interfacce di rete |
| `GET /api/storage` | Dischi e spazio disponibile |
| `GET /api/services` | Stato servizi locali |
| `GET /api/docker` | Container Docker in esecuzione |
| `GET /api/github` | Profilo e repository GitHub |
| `GET /api/markets?type=` | Indici, ETF e crypto live (`type`: `indice`, `etf`, `crypto`) |
| `GET /api/timer` | Stato pomodoro |
| `GET /api/export/:type` | Export dati in CSV |

---

## 🧪 Testing

```bash
npm test
```

---

## 🤝 Contribuire

Le contribuzioni sono benvenute! Leggi [CONTRIBUTING.md](CONTRIBUTING.md) per le linee guida.

---

## 📄 Licenza

Distribuito sotto licenza MIT — vedi [LICENSE](LICENSE) per i dettagli.

---

## 👨‍💻 Autore

**Nicolò Fiorucci** — [@Fioru12](https://github.com/Fioru12)

---

<div align="center">
  <sub>Fatto con ☀️ per iniziare bene la giornata</sub>
</div>
