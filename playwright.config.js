const { defineConfig } = require('@playwright/test');
const os = require('os');
const path = require('path');

const PORT = 3998;

module.exports = defineConfig({
  testDir: 'tests/e2e',
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: `http://localhost:${PORT}`,
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'node server.js',
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    stdout: 'pipe',
    env: {
      PORT: String(PORT),
      TERMINAL_PIN: '000000',
      MOMO_DB_PATH: path.join(os.tmpdir(), `momo-e2e-${Date.now()}.sqlite`),
    },
  },
});
