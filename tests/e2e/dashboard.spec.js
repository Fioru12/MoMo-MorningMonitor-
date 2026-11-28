const { test, expect } = require('@playwright/test');

async function openDashboard(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto('/');
  const landingBtn = page.locator('#landingBtn');
  if (await landingBtn.isVisible()) await landingBtn.click();
  await expect(page.locator('#landingOverlay')).toBeHidden();
  return errors;
}

test('la dashboard si carica senza errori JavaScript', async ({ page }) => {
  const errors = await openDashboard(page);
  await expect(page.locator('#greetingTitle')).not.toHaveText('');
  await expect(page.locator('#momoGrid .grid-stack-item').first()).toBeVisible();
  await page.waitForTimeout(1500);
  expect(errors).toEqual([]);
});

test('ogni widget è inizializzato da GridStack', async ({ page }) => {
  await openDashboard(page);
  const uninitialized = await page.$$eval('#momoGrid .grid-stack-item', (items) =>
    items.filter((el) => !el.gridstackNode).map((el) => el.getAttribute('gs-id'))
  );
  expect(uninitialized).toEqual([]);
});

test('aggiunta di un todo', async ({ page }) => {
  await openDashboard(page);
  await page.fill('#todoInput', 'Comprare il pane');
  await page.locator('#todoForm button[type=submit]').click();
  const item = page.locator('#todoList li', { hasText: 'Comprare il pane' });
  await expect(item).toBeVisible();
});

test('la command palette non esegue HTML dai testi salvati', async ({ page }) => {
  await openDashboard(page);
  await page.evaluate(() =>
    fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'xss <img src=x onerror="window.__pwned=1">' }),
    })
  );
  await page.keyboard.press('Control+k');
  await expect(page.locator('#cmdPaletteOverlay')).toHaveClass(/visible/);
  await page.fill('#cmdPaletteInput', 'xss');
  await expect(page.locator('#paletteDyn')).toContainText('<img');
  expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
});

test('le preferenze sopravvivono alla pulizia del browser', async ({ page }) => {
  await openDashboard(page);
  const initial = await page.locator('html').getAttribute('data-theme');
  await page.click('#themeToggle');
  const changed = initial === 'light' ? 'dark' : 'light';
  await expect(page.locator('html')).toHaveAttribute('data-theme', changed);
  await page.waitForTimeout(800);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', changed);
});

test('scorciatoia G attiva la modalità modifica griglia', async ({ page }) => {
  await openDashboard(page);
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('g');
  await expect(page.locator('#momoGrid')).toHaveClass(/grid-editing/);
});

test('il colore "Ciclo Solare" si applica e viene ricordato', async ({ page }) => {
  await openDashboard(page);
  await page.click('#colorPickerBtn');
  await expect(page.locator('#colorPopup')).toHaveClass(/visible/);
  // L'header si assesta quando arrivano meteo e orologio: aspetta che il pulsante smetta di muoversi.
  const solar = page.locator('.color-opt[data-color="solar"]');
  let last = '';
  await expect.poll(async () => {
    const now = JSON.stringify(await solar.boundingBox());
    const stable = now === last;
    last = now;
    return stable;
  }, { intervals: [400], timeout: 15000 }).toBe(true);
  await solar.click();
  const accent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  expect(['#f59e0b', '#0071e3', '#8b5cf6', '#38bdf8']).toContain(accent);
  await page.waitForTimeout(800);
  await page.reload();
  await expect(page.locator('.color-opt[data-color="solar"]')).toHaveClass(/active/);
});

test('Esc chiude il popup colori e un popup chiuso non riceve il focus', async ({ page }) => {
  await openDashboard(page);
  const firstSwatch = page.locator('.color-opt').first();
  await expect(firstSwatch).toBeHidden();
  await page.click('#colorPickerBtn');
  await expect(page.locator('#colorPopup')).toHaveClass(/visible/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#colorPopup')).not.toHaveClass(/visible/);
  await expect(page.locator('#colorPickerBtn')).toBeFocused();
});

test('il pulsante Esporta scarica un backup JSON di MoMo', async ({ page }) => {
  await openDashboard(page);
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#exportBackupBtn')]);
  expect(download.suggestedFilename()).toMatch(/^momo-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const body = JSON.parse(require('fs').readFileSync(await download.path(), 'utf8'));
  expect(body.app).toBe('momo');
  expect(Array.isArray(body.todos)).toBe(true);
});

test('todo con priorità e scadenza: badge "Oggi" e compare nel calendario', async ({ page }) => {
  await openDashboard(page);
  await page.fill('#todoInput', 'Pagare la bolletta');
  await page.click('#todoPriorityBtn');
  await expect(page.locator('#todoPriorityBtn')).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => {
    const d = new Date();
    const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const input = document.getElementById('todoDueInput');
    input.value = v;
    input.dispatchEvent(new Event('change'));
  });
  await expect(page.locator('#todoDueBtn')).toHaveText('Oggi');
  await page.locator('#todoForm button[type=submit]').click();
  const item = page.locator('#todoList li', { hasText: 'Pagare la bolletta' });
  await expect(item).toHaveClass(/priority/);
  await expect(item.locator('.todo-due')).toHaveText('Oggi');
  await expect(page.locator('#todoPriorityBtn')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#calendarEvents')).toContainText('Pagare la bolletta');
});
