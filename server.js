const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const dbService = require('./data/db');
const apiRoutes = require('./src/routes/api');
const setupWebSocket = require('./src/ws/websocketHandler');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3100;
// Di default risponde solo al tuo PC. Imposta HOST=0.0.0.0 per renderlo
// raggiungibile da altri dispositivi in rete locale (già fatto per Docker).
const HOST = process.env.HOST || '127.0.0.1';

// Initialize Database & Data Directory
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

dbService.initDB().catch((err) => console.error('DB Init Error:', err));

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'http:'],
        connectSrc: ["'self'", 'https:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
  })
);
app.use(compression());
app.use(express.json());

// Rate Limiting (applied to /api/ endpoints only)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Troppe richieste, riprova più tardi' },
});
app.use('/api/', limiter);

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Setup WebSocket Server
const wsHandler = setupWebSocket(server);
app.set('wsHandler', wsHandler);

// Mount API Routes
app.use('/api', apiRoutes);

// SPA Fallback (MUST BE LAST)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
server.listen(PORT, HOST, () => {
  console.log(`✨ MoMo avviato su porta ${PORT} (${HOST})`);
  console.log(`🌐 Apri http://localhost:${PORT} nel browser`);
  if (HOST === '0.0.0.0') {
    console.log('⚠️  MoMo è raggiungibile da altri dispositivi sulla tua rete locale.');
  }
});

module.exports = server;
