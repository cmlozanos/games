const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { chromium, expect } = require('@playwright/test');

const root = path.resolve(__dirname, '..');
const engine = process.env.CHROME95_PATH ? 'chrome95' : 'modern';
const output = path.join(root, 'test-results', `browser-${engine}`);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };

async function serve() {
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (pathname === '/favicon.ico') { res.writeHead(204).end(); return; }
      if (!pathname.startsWith('/burbujas/')) { res.writeHead(404).end(); return; }
      const file = path.resolve(root, pathname.slice('/burbujas/'.length) || 'index.html');
      if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
      const body = await fs.readFile(file);
      res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(body);
    } catch (_) { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}/burbujas/?test=1` };
}

async function solveGate(page) {
  await expect(page.locator('#learning-gate')).toBeVisible();
  const prompt = page.locator('#gate-prompt');
  if (await prompt.isVisible()) {
    const match = (await prompt.textContent()).match(/(\d)\s*([+−-])\s*(\d)/);
    assert.ok(match, 'recognizable visible arithmetic challenge');
    const answer = match[2] === '+' ? Number(match[1]) + Number(match[3]) : Number(match[1]) - Number(match[3]);
    await page.locator(`[data-gate-key="${answer}"]`).click();
  } else {
    const canvas = page.locator('#gate-trace');
    const strokes = await canvas.evaluate(node => window.LearningGate.Core.glyphs[node.dataset.letter]);
    const box = await canvas.boundingBox();
    assert.ok(box);
    for (const stroke of strokes) {
      const point = p => ({ x: box.x + p[0] * box.width / 100, y: box.y + p[1] * box.height / 100 });
      let p = point(stroke[0]);
      await page.mouse.move(p.x, p.y); await page.mouse.down();
      for (const next of stroke.slice(1)) { p = point(next); await page.mouse.move(p.x, p.y, { steps: 3 }); }
      await page.mouse.up();
    }
  }
  await expect(page.locator('#learning-gate')).toHaveCount(0);
}

const read = page => page.evaluate(() => window.__bubblesRead());
function movingState(state) {
  return { steps: state.steps, shots: state.shots, score: state.score, remaining: state.remaining, shot: state.shot, grid: state.grid };
}
async function frozen(page, label, render = true) {
  await page.waitForTimeout(100); // allow the single pause/menu repaint
  const before = await read(page);
  await page.waitForTimeout(300);
  const after = await read(page);
  assert.deepEqual(movingState(after), movingState(before), `${label}: simulation must freeze`);
  if (render) assert.equal(after.frames, before.frames, `${label}: no hidden rendering`);
}
async function visibility(page, hidden) {
  // Portable Chromium 95 test of the production visibilitychange handler.
  // This is a browser-event simulation, not a physical tablet visibility claim.
  await page.evaluate(value => {
    if (value) Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    else delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}
async function expireGate(page) {
  await page.evaluate(() => { const now = Date.now; Date.now = () => now() + 600001; });
  await expect(page.locator('#learning-gate')).toBeVisible({ timeout: 5000 });
}
async function audioState(page, expected) {
  if (await page.evaluate(() => window.__testAudioStates() === null)) return;
  await expect.poll(() => page.evaluate(value => {
    const states = window.__testAudioStates();
    return states.length > 0 && states.every(state => state === value);
  }, expected)).toBe(true);
}
async function controlsFit(page, size) {
  for (const id of ['play', 'pause', 'resume', 'restart', 'next', 'retry', 'sound', 'quality']) {
    const button = page.locator('#' + id);
    if (!await button.isVisible()) continue;
    const box = await button.boundingBox();
    assert.ok(box.width >= 44 && box.height >= 44, `${id}: touch target at least 44 CSS pixels`);
    assert.ok(box.x >= -1 && box.y >= -1 && box.x + box.width <= size.width + 1 && box.y + box.height <= size.height + 1, `${id}: fits ${size.width}x${size.height}`);
    assert.ok(await button.evaluate(node => node.scrollWidth <= node.clientWidth + 1), `${id}: no clipped label`);
  }
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal document overflow');
}
async function tapShot(page) {
  const before = await read(page);
  const box = await page.locator('#board').boundingBox();
  assert.ok(box);
  await page.touchscreen.tap(box.x + box.width * 0.54, box.y + box.height * 0.25);
  await expect.poll(async () => (await read(page)).shots).toBeGreaterThan(before.shots);
}

async function dragShot(page) {
  const before = await read(page), box = await page.locator('#board').boundingBox();
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height * 0.4 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + box.width * 0.7, y: box.y + box.height * 0.25 }] });
    assert.equal((await read(page)).shots, before.shots, 'drag aims without firing before release');
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(async () => (await read(page)).shots).toBeGreaterThan(before.shots);
  } finally { await session.detach(); }
}

async function runViewport(browser, url, size, comprehensive) {
  const context = await browser.newContext({ viewport: size, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.addInitScript(() => {
    const Audio = window.AudioContext || window.webkitAudioContext;
    const instances = [];
    if (Audio) {
      window.AudioContext = function (...args) { const instance = new Audio(...args); instances.push(instance); return instance; };
      window.AudioContext.prototype = Audio.prototype;
    }
    window.__testAudioStates = () => Audio ? instances.map(instance => instance.state) : null;
    const pending = new Set();
    const request = window.requestAnimationFrame.bind(window), cancel = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => {
      const id = request(time => { pending.delete(id); callback(time); });
      pending.add(id); return id;
    };
    window.cancelAnimationFrame = id => { pending.delete(id); cancel(id); };
    window.__testPendingRaf = () => pending.size;
  });
  try {
    await page.goto(url);
    await page.waitForFunction(() => typeof window.__bubblesRead === 'function');
    await frozen(page, 'entry challenge');
    await solveGate(page);
    assert.equal((await read(page)).light, true, 'light mode defaults ON');
    assert.equal((await read(page)).sound, false, 'sound defaults OFF');
    assert.ok(await page.evaluate(() => !window.__testAudioStates() || window.__testAudioStates().length === 0), 'muted startup creates no audio context');
    await expect(page.locator('#menu')).toBeVisible();
    await frozen(page, 'menu');
    await controlsFit(page, size);
    await page.screenshot({ path: path.join(output, `menu-${size.width}x${size.height}.png`) });
    await page.locator('#play').click();
    await expect.poll(async () => (await read(page)).status).toBe('playing');
    const cached = await read(page);
    await tapShot(page);
    await page.waitForTimeout(80);
    const flying = await read(page);
    assert.equal(flying.boardBuilds, cached.boardBuilds, 'flight reuses the stationary board cache');
    assert.equal(flying.spriteBuilds, cached.spriteBuilds, 'flight reuses bubble sprites');
    await controlsFit(page, size);
    await page.screenshot({ path: path.join(output, `playing-${size.width}x${size.height}.png`) });

    if (comprehensive) {
      await expect.poll(async () => Boolean((await read(page)).shot), { timeout: 10000 }).toBe(false);
      await page.waitForTimeout(1300); // allow finite pop/drop effects to settle
      await frozen(page, 'stationary playing board');
      await page.screenshot({ path: path.join(output, `aim-${size.width}x${size.height}.png`) });
      await page.locator('#sound').click();
      assert.equal((await read(page)).sound, true);
      await audioState(page, 'running');
      await page.locator('#board').focus();
      const shots = (await read(page)).shots;
      await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(90); await page.keyboard.up('ArrowLeft');
      await page.keyboard.press('Space');
      await expect.poll(async () => (await read(page)).shots).toBeGreaterThan(shots);
      await page.locator('#pause').click();
      await expect(page.locator('#pause-panel')).toBeVisible();
      await frozen(page, 'manual pause');
      await audioState(page, 'suspended');
      await visibility(page, true); await frozen(page, 'hidden while manually paused'); await visibility(page, false);
      await frozen(page, 'manual pause preserved on visibility restoration');
      await expireGate(page); await frozen(page, 'timed challenge while manually paused'); await solveGate(page);
      await expect(page.locator('#pause-panel')).toBeVisible(); await frozen(page, 'manual pause preserved after challenge');
      await audioState(page, 'suspended');
      await page.locator('#resume').click();
      await expect.poll(async () => (await read(page)).paused).toBe(false);
      await audioState(page, 'running');
      await visibility(page, true); await frozen(page, 'hidden active race'); await audioState(page, 'suspended'); await visibility(page, false);
      await expect.poll(async () => (await read(page)).paused).toBe(false);
      await audioState(page, 'running');
      await expireGate(page); await frozen(page, 'timed active challenge'); await audioState(page, 'suspended'); await solveGate(page);
      assert.equal((await read(page)).locked, false);
      assert.equal((await read(page)).paused, false);
      await audioState(page, 'running');
      await page.locator('#sound').click(); await audioState(page, 'suspended');
      await page.locator('#pause').click();
      await page.locator('#restart').click();
      for (let i = 0; i < 3; i++) { await page.locator('#pause').click(); await page.locator('#restart').click(); }
      assert.ok(await page.evaluate(() => window.__testPendingRaf()) <= 1, 'restarts must not multiply RAF loops');
      await dragShot(page);
      const beforeQuality = await read(page);
      await page.locator('#quality').click();
      assert.equal((await read(page)).light, false);
      assert.equal((await read(page)).shots, beforeQuality.shots, 'quality must not restart the game');
      await page.reload(); await solveGate(page);
      assert.equal((await read(page)).light, false, 'explicit normal quality persists');
      assert.equal((await read(page)).sound, false);
      await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), { timeout: 10000 }).toBe(true);
      await context.setOffline(true); await page.reload(); await solveGate(page);
      assert.equal((await read(page)).light, false, 'offline keeps the quality choice');
      await page.locator('#play').click(); await tapShot(page);
      await page.screenshot({ path: path.join(output, 'offline-playing.png') });
    }
    if (!comprehensive) {
      await expect.poll(async () => Boolean((await read(page)).shot), { timeout: 10000 }).toBe(false);
      await page.waitForTimeout(1300);
      await page.screenshot({ path: path.join(output, `aim-${size.width}x${size.height}.png`) });
    }
    assert.deepEqual(errors, [], 'no browser runtime or console errors');
    console.log(`${engine} ${size.width}x${size.height}: defaults, touch, layout, cached board/sprites${comprehensive ? ', idle sleep, keyboard, pause/gate, one RAF, persistence and offline' : ''} OK`);
  } finally { await context.close(); }
}

async function runResultFixture(browser, url, kind) {
  const size = { width: 360, height: 740 };
  const context = await browser.newContext({ viewport: size, hasTouch: true, serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // Replace only the HTTP response in this test context. The production core
  // performs the actual shot, match/support resolution, win/loss and next level.
  const setup = kind === 'won'
    ? 'game.grid[0][5]=0;game.grid[0][6]=0;game.currentColor=0;game.nextColor=0;'
    : 'for(var r=0;r<game.rows;r++)game.grid[r][5]=r%2;game.currentColor=0;game.nextColor=0;game.shots=4;';
  await page.route('**/src/core.js?*', async route => {
    const source = await fs.readFile(path.join(root, 'src/core.js'), 'utf8');
    const fixture = `\n(function(){var original=BubbleCore.create;BubbleCore.create=function(options){var game=original(options);if(game.level!==1)return game;for(var r=0;r<game.rows;r++)for(var c=0;c<game.grid[r].length;c++)game.grid[r][c]=null;${setup}game.revision++;return game;};}());`;
    await route.fulfill({ contentType: 'text/javascript', body: source + fixture });
  });
  try {
    await page.goto(url); await solveGate(page); await page.locator('#play').click();
    const box = await page.locator('#board').boundingBox();
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 4);
    await expect.poll(async () => (await read(page)).status, { timeout: 10000 }).toBe(kind);
    await expect(page.locator('#result')).toBeVisible();
    await page.waitForTimeout(1000); // finite result particles may finish before idle
    await frozen(page, `${kind} result`);
    await controlsFit(page, size);
    await page.screenshot({ path: path.join(output, `${kind}-result.png`) });
    if (kind === 'won') {
      assert.equal((await read(page)).remaining, 0);
      assert.ok((await read(page)).score >= 30);
      await expect(page.locator('#next')).toBeVisible();
      await page.locator('#next').click();
      await expect.poll(async () => (await read(page)).level).toBe(2);
    } else {
      await expect(page.locator('#next')).toBeHidden();
      await page.locator('#retry').click();
    }
    await expect.poll(async () => (await read(page)).status).toBe('playing');
    assert.deepEqual(errors, []);
    console.log(`${engine}: real shot -> ${kind}, result controls and ${kind === 'won' ? 'next level' : 'retry'} OK (response fixture only)`);
  } finally { await context.close(); }
}

(async () => {
  await fs.mkdir(output, { recursive: true });
  const local = process.env.BUBBLES_URL ? null : await serve();
  const published = process.env.BUBBLES_URL ? new URL(process.env.BUBBLES_URL) : null;
  if (published) published.searchParams.set('test', '1');
  const url = published ? published.href : local.url;
  let browser;
  try {
    browser = await chromium.launch(process.env.CHROME95_PATH ? { executablePath: process.env.CHROME95_PATH } : {});
    for (const [index, size] of [{ width: 360, height: 740 }, { width: 1024, height: 768 }, { width: 844, height: 390 }].entries()) {
      await runViewport(browser, url, size, index === 0);
    }
    await runResultFixture(browser, url, 'won');
    await runResultFixture(browser, url, 'lost');
  } finally {
    if (browser) await browser.close();
    if (local) await new Promise(resolve => local.server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
