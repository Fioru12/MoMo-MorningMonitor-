const express = require('express');
const router = express.Router();
const si = require('systeminformation');
const { getCache, setCache } = require('../services/cacheService');
const { formatBytes } = require('../utils/formatters');

// --- Time ---
router.get('/time', (req, res) => {
  const timezones = [
    { label: 'Roma', zone: 'Europe/Rome' },
    { label: 'New York', zone: 'America/New_York' },
    { label: 'Londra', zone: 'Europe/London' },
    { label: 'Tokyo', zone: 'Asia/Tokyo' },
    { label: 'Sydney', zone: 'Australia/Sydney' },
    { label: 'Mosca', zone: 'Europe/Moscow' },
  ];

  const times = timezones.map((tz) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('it-IT', {
      timeZone: tz.zone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const dateStr = now.toLocaleDateString('it-IT', {
      timeZone: tz.zone,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    return { label: tz.label, time: timeStr, date: dateStr };
  });

  res.json(times);
});

// --- Storage ---
router.get('/storage', async (req, res) => {
  try {
    const cached = getCache('storage_data');
    if (cached) return res.json(cached);

    const fsSizes = await si.fsSize();
    const usage = (fsSizes || []).map((fs) => ({
      device: fs.fs || fs.mount,
      mount: fs.mount,
      type: fs.type,
      total: formatBytes(fs.size),
      used: formatBytes(fs.used),
      free: formatBytes(fs.available || fs.size - fs.used),
      percent: Math.round(fs.use || 0) + '%',
    }));

    const result = {
      disks: usage.map((u) => ({ device: u.device, size: u.total })),
      usage,
    };

    setCache('storage_data', result, 10000);
    res.json(result);
  } catch {
    res.json({ disks: [], usage: [] });
  }
});

// --- Network ---
router.get('/network', async (req, res) => {
  try {
    const cached = getCache('network_data');
    if (cached) return res.json(cached);

    const [ifaces, stats] = await Promise.all([si.networkInterfaces(), si.networkStats()]);

    const ifaceArray = Array.isArray(ifaces) ? ifaces : ifaces ? [ifaces] : [];
    const interfacesList = ifaceArray.map((iface) => ({
      name: iface.iface,
      ip: iface.ip4 || 'N/A',
      mac: iface.mac || 'N/A',
      state: iface.operstate || 'active',
    }));

    let totalRx = 0;
    let totalTx = 0;
    if (Array.isArray(stats)) {
      stats.forEach((s) => {
        totalRx += s.rx_bytes || 0;
        totalTx += s.tx_bytes || 0;
      });
    }

    const result = {
      interfaces: interfacesList,
      rxBytes: formatBytes(totalRx),
      txBytes: formatBytes(totalTx),
    };

    setCache('network_data', result, 5000);
    res.json(result);
  } catch {
    res.json({ interfaces: [], rxBytes: '0 B', txBytes: '0 B' });
  }
});

// --- Services ---
router.get('/services', async (req, res) => {
  try {
    if (process.platform === 'win32') {
      const winServices = ['W3SVC', 'Spooler', 'Dhcp', 'Dnscache', 'EventLog', 'Themes', 'AudioSrv'];
      const serviceList = winServices.map((svc) => {
        try {
          const result = require('child_process')
            .execSync(`sc query "${svc}" 2>&1`, { encoding: 'utf8' })
            .toString();
          const isRunning = result.includes('RUNNING');
          return { name: svc, status: isRunning ? 'running' : 'stopped' };
        } catch {
          return { name: svc, status: 'not-found' };
        }
      });
      res.json(serviceList);
    } else {
      const defaultServices = ['nginx', 'apache2', 'mysql', 'postgresql', 'redis', 'docker', 'ssh', 'cron'];
      const serviceList = defaultServices.map((svc) => {
        try {
          const result = require('child_process')
            .execSync(`systemctl is-active ${svc} 2>&1`)
            .toString()
            .trim();
          return { name: svc, status: result === 'active' ? 'running' : 'stopped' };
        } catch {
          return { name: svc, status: 'not-found' };
        }
      });
      res.json(serviceList);
    }
  } catch {
    res.json([]);
  }
});

// --- Docker ---
router.get('/docker', async (req, res) => {
  try {
    const cached = getCache('docker_containers');
    if (cached) return res.json(cached);

    const containers = await si.dockerContainers();
    const result = (containers || []).map((c) => ({
      id: c.id ? c.id.substring(0, 12) : '',
      name: c.name,
      image: c.image,
      state: c.state,
      status: c.status,
    }));

    setCache('docker_containers', result, 10000);
    res.json(result);
  } catch {
    res.json([]);
  }
});

// --- Calendar ---
router.get('/calendar', (req, res) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  const days = [];
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      day: i,
      month: month + 1,
      year,
      weekday: new Date(year, month, i).getDay(),
    });
  }

  res.json({
    month: month + 1,
    year,
    days,
    today: now.getDate(),
  });
});

// --- Timer ---
router.get('/timer', (req, res) => {
  res.json({ mode: 'pomodoro', duration: 25 * 60 });
});

// --- Snippet Exec / Web Terminal ---
const { exec } = require('child_process');
const crypto = require('crypto');

const TERMINAL_PIN = process.env.TERMINAL_PIN || crypto.randomInt(100000, 999999).toString();
if (!process.env.TERMINAL_PIN) {
  console.log(`🔒 PIN Web Terminal (non impostato in .env, generato per questa sessione): ${TERMINAL_PIN}`);
}

function pinMatches(candidate) {
  const a = Buffer.from(String(candidate || ''));
  const b = Buffer.from(TERMINAL_PIN);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

router.post('/snippets/exec', (req, res) => {
  const { command, pin } = req.body;

  if (!pinMatches(pin)) {
    return res.status(401).json({ error: 'PIN non valido o mancante' });
  }

  if (!command || typeof command !== 'string' || !command.trim()) {
    return res.status(400).json({ error: 'Comando non valido' });
  }

  const startTime = Date.now();
  const options = {
    timeout: 10000,
    maxBuffer: 1024 * 512, // 512 KB
    encoding: 'utf8',
  };

  exec(command.trim(), options, (error, stdout, stderr) => {
    const durationMs = Date.now() - startTime;
    res.json({
      ok: !error,
      command: command.trim(),
      stdout: stdout || '',
      stderr: stderr || (error ? error.message : ''),
      exitCode: error ? (error.code || 1) : 0,
      durationMs,
    });
  });
});

module.exports = router;

