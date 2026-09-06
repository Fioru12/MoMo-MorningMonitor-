const express = require('express');
const router = express.Router();
const pkg = require('../../package.json');
const { getSystemMetrics } = require('../services/systemService');

// Get connected WS count from ws handler (passed in or attached)
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: pkg.version,
  });
});

router.get('/system', async (req, res) => {
  const metrics = await getSystemMetrics();
  res.json(metrics);
});

router.get('/ws-status', (req, res) => {
  const wsHandler = req.app.get('wsHandler');
  const connected = wsHandler ? wsHandler.getClientCount() : 0;
  res.json({ connected });
});

module.exports = router;
