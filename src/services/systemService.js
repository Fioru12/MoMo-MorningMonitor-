const os = require('os');
const si = require('systeminformation');
const { formatBytes, formatUptime } = require('../utils/formatters');

async function getSystemMetrics() {
  try {
    const [cpuLoad, mem, osInfo] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.osInfo(),
    ]);

    const totalMem = mem.total || os.totalmem();
    const usedMem = mem.active || mem.used || (totalMem - (mem.free || os.freemem()));
    const freeMem = totalMem - usedMem;

    return {
      hostname: osInfo.hostname || os.hostname(),
      platform: osInfo.platform || os.platform(),
      arch: osInfo.arch || os.arch(),
      distro: osInfo.distro || '',
      cpu: {
        model: os.cpus()[0]?.model || 'N/A',
        usage: Math.round(cpuLoad.currentLoad || 0),
        cores: os.cpus().length,
      },
      memory: {
        total: formatBytes(totalMem),
        used: formatBytes(usedMem),
        free: formatBytes(freeMem),
        percent: Math.round((usedMem / totalMem) * 100),
      },
      uptime: formatUptime(os.uptime()),
      loadAvg: os.loadavg().map((v) => v.toFixed(2)),
    };
  } catch {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const cpuUsage = Math.round((1 - totalIdle / totalTick) * 100);

    return {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpu: {
        model: cpus[0]?.model || 'N/A',
        usage: cpuUsage,
        cores: cpus.length,
      },
      memory: {
        total: formatBytes(totalMem),
        used: formatBytes(usedMem),
        free: formatBytes(freeMem),
        percent: Math.round((usedMem / totalMem) * 100),
      },
      uptime: formatUptime(os.uptime()),
      loadAvg: os.loadavg().map((v) => v.toFixed(2)),
    };
  }
}

module.exports = {
  getSystemMetrics,
};
