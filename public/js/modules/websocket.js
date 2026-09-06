let ws = null;
let wsRetryDelay = 1000;

export function initWebSocket(onSystemUpdate) {
  function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}`);
    
    ws.onopen = () => {
      wsRetryDelay = 1000;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'system' && typeof onSystemUpdate === 'function') {
          onSystemUpdate(data.data);
        }
      } catch (e) {}
    };

    ws.onclose = () => {
      setTimeout(connect, wsRetryDelay);
      wsRetryDelay = Math.min(wsRetryDelay * 2, 30000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  setTimeout(connect, 500);
}
