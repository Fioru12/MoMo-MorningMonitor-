const { WebSocketServer } = require('ws');
const { getSystemMetrics } = require('../services/systemService');

function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });
  const clients = new Set();
  let shutdownTimer = null;

  wss.on('connection', (ws) => {
    clients.add(ws);
    if (shutdownTimer) {
      clearTimeout(shutdownTimer);
      shutdownTimer = null;
    }

    ws.on('close', () => {
      clients.delete(ws);
      if (clients.size === 0) {
        shutdownTimer = setTimeout(() => {
          if (clients.size === 0) {
            console.log('Tutte le finestre chiuse. Spegnimento server MoMo...');
            process.exit(0);
          }
        }, 2000);
      }
    });

    // Immediate update on connect
    getSystemMetrics().then((data) => {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'system', data }));
      }
    });
  });

  function broadcast(data) {
    for (const client of clients) {
      if (client.readyState === 1) {
        client.send(JSON.stringify(data));
      }
    }
  }

  // Periodic broadcast of system metrics
  const broadcastInterval = setInterval(async () => {
    if (clients.size > 0) {
      const data = await getSystemMetrics();
      broadcast({ type: 'system', data });
    }
  }, 3000);

  return {
    wss,
    getClientCount: () => clients.size,
    close: () => {
      clearInterval(broadcastInterval);
      wss.close();
    },
  };
}

module.exports = setupWebSocket;
