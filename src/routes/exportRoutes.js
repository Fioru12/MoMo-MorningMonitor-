const express = require('express');
const router = express.Router();
const dbService = require('../../data/db');
const { getSystemMetrics } = require('../services/systemService');

router.get('/export/:type', async (req, res) => {
  const type = req.params.type;
  try {
    let items = [];
    if (type === 'todos') items = await dbService.getTodos();
    else if (type === 'notes') items = await dbService.getNotes();
    else if (type === 'bookmarks') items = await dbService.getBookmarks();
    else if (type === 'snippets') items = await dbService.getSnippets();

    if (['todos', 'notes', 'bookmarks', 'snippets'].includes(type)) {
      if (!items.length) {
        return res.status(400).json({ error: 'Nessun elemento da esportare' });
      }
      const headers = Object.keys(items[0]);
      const csvRows = [headers.join(',')];
      for (const item of items) {
        const row = headers.map((h) => {
          const val = item[h] !== undefined && item[h] !== null ? String(item[h]) : '';
          return `"${val.replace(/"/g, '""')}"`;
        });
        csvRows.push(row.join(','));
      }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.attachment(`${type}.csv`);
      return res.send(csvRows.join('\n'));
    }

    if (type === 'system') {
      const sysData = await getSystemMetrics();
      const csvLines = [
        'Metric,Value',
        `Hostname,"${sysData.hostname}"`,
        `Platform,"${sysData.platform}"`,
        `Arch,"${sysData.arch}"`,
        `CPU Usage,"${sysData.cpu.usage}%"`,
        `CPU Cores,"${sysData.cpu.cores}"`,
        `RAM Used,"${sysData.memory.used}"`,
        `RAM Total,"${sysData.memory.total}"`,
        `RAM Percent,"${sysData.memory.percent}%"`,
        `Uptime,"${sysData.uptime}"`,
      ];
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.attachment('system.csv');
      return res.send(csvLines.join('\n'));
    }

    res.status(400).json({ error: 'Tipo di export non valido' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
