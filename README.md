# ⎔ DevMonitor

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-22.22-339933?logo=node.js&style=flat-square)
![Express](https://img.shields.io/badge/Express-4.21-000?logo=express&style=flat-square)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)
![Status](https://img.shields.io/badge/status-production-green?style=flat-square)
![CI](https://img.shields.io/badge/CI-passing-brightgreen?style=flat-square)
![WebSocket](https://img.shields.io/badge/WebSocket-real--time-4FC08D?style=flat-square)
![Chart.js](https://img.shields.io/badge/Chart.js-graphics-FF6384?style=flat-square)
![Export](https://img.shields.io/badge/Export-CSV%2FJSON-success?style=flat-square)

**A modern, responsive personal dashboard for developers and sysadmins**  
Real-time system monitoring, weather forecasts, tech news, and task management in one place.

[🚀 Live Demo](http://YOUR_SERVER_IP:3002) • [✨ Features](#-features) • [📦 Installation](#-installation) • [🛠️ Tech Stack](#️-tech-stack) • [📸 Screenshots](#-screenshots)

</div>

---

## ✨ Features

### 🌤️ Weather Widget
- Real-time temperature with dynamic color gradient
- Feels like, humidity, wind speed
- 3-day forecast
- Automatic geolocation

### 💻 System Monitor
- CPU & RAM usage with animated progress bars
- Real-time sparkline charts for historical data
- Hostname, platform, uptime
- Load average monitoring

### 📰 Tech News
- Live feed from HackerNews API
- Animated news ticker
- Scores, comments count, author
- Auto-refresh every 2 minutes

### ✅ Todo List
- Add, complete, and delete tasks
- Smooth animations
- Persistent storage via JSON file
- Keyboard shortcuts support

### 🛡️ Security
- Helmet.js for HTTP headers security
- Rate limiting protection
- Input sanitization
- Compression enabled

### 🔌 Real-time Updates
- WebSocket connection for live system metrics
- Auto-refresh every 5 seconds
- No page reload needed

### 📊 Data Export
- Export todos and notes as CSV
- Export system metrics as CSV
- One-click download

### 📈 Charts & Analytics
- CPU usage history chart
- RAM usage history chart
- Real-time data visualization with Chart.js
- Helmet.js for HTTP headers security
- Rate limiting protection
- Input sanitization
- Compression enabled

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **Node.js 22** | Runtime environment |
| **Express 4.21** | Web framework |
| **Docker** | Containerization & deployment |
| **Helmet.js** | Security headers |
| **express-rate-limit** | API rate limiting |
| **compression** | Gzip compression |
| **HackerNews API** | Tech news feed |
| **Open-Meteo API** | Weather data (free, no key needed) |

---

## 📦 Installation

### Prerequisites
- Node.js 22+ or Docker
- Modern web browser

### Option 1: Docker (Recommended)
```bash
docker run -d \
  --name devdash \
  -p 3002:3002 \
  -v $(pwd)/data:/app/data \
  ghcr.io/fioru12/devdash:latest
```

### Option 2: Docker Compose
```yaml
services:
  devdash:
    build: .
    container_name: devdash
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - PORT=3002
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

### Option 3: Manual
```bash
git clone https://github.com/Fioru12/devdash.git
cd devdash
npm install --production
npm start
```

---

## 🔧 Configuration

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3002` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `WS_PORT` | `3002` | WebSocket server port |

### WebSocket
Connect to `ws://localhost:3002` for real-time system updates.
```javascript
const ws = new WebSocket('ws://localhost:3002');
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'system') {
        console.log('CPU:', data.data.cpu, 'RAM:', data.data.ram);
    }
};
```

No API keys required! Weather data uses free Open-Meteo API.

---

## 📸 Screenshots

> *Coming soon - screenshots will be added here*

---

## 🏗️ Architecture

```
devdash/
├── server.js          # Express server + API routes
├── public/            # Static frontend files
│   ├── index.html     # Main dashboard UI
│   ├── css/           # Stylesheets
│   └── js/            # Client-side JavaScript
├── data/              # Persistent data storage
├── Dockerfile         # Multi-stage Docker build
├── docker-compose.yml # Orchestration config
└── tests/             # Test suite
```

---

## 📈 API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/health` | Health check |
| `GET /api/system` | System metrics (CPU, RAM, uptime) |
| `GET /api/weather` | Weather forecast data |
| `GET /api/news` | Latest tech news from HackerNews |
| `GET /api/todos` | Get all todos |
| `POST /api/todos` | Add a new todo |
| `DELETE /api/todos/:id` | Delete a todo |

---

## 🧪 Testing

```bash
npm test
```

---

## 🤝 Contributing

Contributions are welcome! Check [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

---

## 👨‍💻 Author

**Fioru12** - [GitHub Profile](https://github.com/Fioru12)

---

<div align="center">
  <sub>Built with ❤️ for developers and sysadmins</sub>
</div>