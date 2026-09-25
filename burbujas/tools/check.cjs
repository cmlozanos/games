'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const lock = JSON.parse(read('package-lock.json'));
for (const entry of Object.values(lock.packages)) {
    if (entry.resolved) assert.ok(entry.resolved.startsWith('https://registry.npmjs.org/'), 'public reproducible dependency registry');
}

for (const file of ['learning-gate.js', 'src/core.js', 'src/render.js', 'src/app.js', 'sw.js']) {
    const result = spawnSync(process.execPath, ['--input-type=module', '--check'], {input: read(file), encoding: 'utf8'});
    assert.equal(result.status, 0, file + ': ' + result.stderr);
}
const gate = require('../learning-gate.js');
assert.equal(gate.Core.interval, 600000, 'ten-minute educational gate');
const html = read('index.html');
assert.ok(html.includes('manifest.webmanifest'));
assert.ok(html.indexOf('learning-gate.js') >= 0 && html.indexOf('learning-gate.js') < html.indexOf('src/app.js'), 'gate loads before gameplay');
assert.match(read('src/app.js'), /LearningGate/, 'app integrates the required gate');
assert.ok(!/<script[^>]+src=["']https?:/i.test(html), 'no remote runtime scripts');
assert.ok(!/<link[^>]+href=["']https?:[^>]*rel=["']stylesheet/i.test(html), 'no remote styles');
assert.match(read('LICENSE'), /Copyright \(c\) 2026 ssrtist/);
assert.match(read('LICENSE'), /Permission is hereby granted, free of charge/);
assert.match(read('THIRD_PARTY.md'), /c479d9fb3dd3cc427e41c814b35337afa2b859d0/);

const manifest = JSON.parse(read('manifest.webmanifest'));
assert.equal(manifest.scope, './');
assert.equal(manifest.start_url, './');
assert.equal(manifest.display, 'standalone');
assert.deepEqual(manifest.icons.map(icon => icon.sizes).sort(), ['192x192', '512x512']);
for (const icon of manifest.icons) {
    const png = fs.readFileSync(path.join(root, icon.src));
    const size = Number(icon.sizes.split('x')[0]);
    assert.equal(icon.type, 'image/png');
    assert.equal(png.toString('hex', 0, 8), '89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
}

function worker(options = {}) {
    const scope = 'https://example.test/games/burbujas/';
    const events = {}, deleted = [], fetched = [], cache = new Map();
    const offlineIndex = {ok: true, label: 'offline-index'};
    const cachedGate = {ok: true, label: 'cached-gate'};
    cache.set(new URL('./index.html', scope).href, offlineIndex);
    cache.set(new URL('./learning-gate.js?v=20260925-1', scope).href, cachedGate);
    let skipped = false, installed = [];
    const sandbox = {URL, self: {registration: {scope}, addEventListener: (name, handler) => events[name] = handler,
        skipWaiting: () => {skipped = true; return Promise.resolve();}, clients: {claim: () => Promise.resolve()}},
        caches: {keys: () => Promise.resolve(['other-game-sentinel', 'burbujas-old', 'burbujas-20260925-1']),
            delete: name => {deleted.push(name); return Promise.resolve(true);},
            open: name => {assert.equal(name, 'burbujas-20260925-1');return Promise.resolve({
                addAll: urls => {installed = Array.from(urls);return options.failedGate ? Promise.reject(Error('gate unavailable')) : Promise.resolve();},
                match: request => Promise.resolve(cache.get(new URL(typeof request === 'string' ? request : request.url, scope).href)),
                put: () => {throw Error('Do not mix newer online resources into the installed cache');}
            });}},
        fetch: request => {fetched.push(request.url);return options.offline ? Promise.reject(Error('offline')) : Promise.resolve({ok: true, label: 'network'});}};
    vm.createContext(sandbox);vm.runInContext(read('sw.js'), sandbox);
    function fetch(url, mode = 'cors', method = 'GET') {
        let response;
        events.fetch({request: {url: new URL(url, scope).href, mode, method}, respondWith: promise => response = promise});
        return response;
    }
    return {events, deleted, fetched, fetch, offlineIndex, cachedGate, skipped: () => skipped, installed: () => installed};
}

(async () => {
    const online = worker();let installation;
    online.events.install({waitUntil: promise => installation = promise});await installation;
    assert.equal(online.skipped(), true);
    for (const url of online.installed()) assert.ok(fs.existsSync(path.join(root, url.split('?')[0])), url + ' exists');
    for (const file of ['styles.css', 'learning-gate.js', 'src/core.js', 'src/render.js', 'src/app.js']) {
        assert.ok(online.installed().includes('./' + file + '?v=20260925-1'), file + ' versioned and cached');
    }
    let activation;online.events.activate({waitUntil: promise => activation = promise});await activation;
    assert.deepEqual(online.deleted, ['burbujas-old']);
    assert.equal((await online.fetch('./', 'navigate')).label, 'network');
    assert.equal(await online.fetch('./learning-gate.js?v=20260925-1'), online.cachedGate);
    assert.equal((await online.fetch('./learning-gate.js?v=new-version')).label, 'network', 'no old/new query mixing');
    assert.equal(online.fetch('../another-game/', 'navigate'), undefined, 'other game ignored');
    assert.equal(online.fetch('./', 'navigate', 'POST'), undefined, 'non-GET ignored');
    const offline = worker({offline: true});
    assert.equal(await offline.fetch('./', 'navigate'), offline.offlineIndex);
    assert.equal(await offline.fetch('./learning-gate.js?v=20260925-1'), offline.cachedGate);
    await assert.rejects(offline.fetch('./learning-gate.js?v=new-version'), /offline/, 'missing gate fails rather than bypassing it');
    const broken = worker({failedGate: true});let failedInstallation;
    broken.events.install({waitUntil: promise => failedInstallation = promise});
    await assert.rejects(failedInstallation, /gate unavailable/);assert.equal(broken.skipped(), false);
    console.log('PASS Burbujas syntax, gate, licenses, PWA icons, exact-version cache, isolation and failed-install safety');
})().catch(error => {console.error(error);process.exitCode = 1;});
