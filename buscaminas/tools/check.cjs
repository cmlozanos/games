'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const scripts = ['src/core.js', 'src/app.js', 'pwa.js', 'sw.js', 'learning-gate.js', 'learning-profile.js', 'reading-words.js'];
for (const file of scripts) new vm.Script(read(file), {filename: file});
const html = read('index.html'), app = read('src/app.js');
assert(html.includes('https://cmlozanos.github.io/games/'));
assert(html.includes('manifest.webmanifest'));
assert(!/<(?:script|link)[^>]+(?:src|href)=["']https?:/.test(html), 'No external runtime scripts/styles');
assert(html.indexOf('learning-profile.js') < html.indexOf('reading-words.js'));
assert(html.indexOf('reading-words.js') < html.indexOf('learning-gate.js'));
assert(html.indexOf('learning-gate.js') < html.indexOf('src/app.js'));
assert(app.includes('LearningGate.mount') && app.includes('onLock') && app.includes('onUnlock'));
assert(!/requestAnimationFrame|setInterval/.test(app), 'No continuous game/render loop for a static board');
assert(read('styles.css').includes('safe-area-inset-bottom'), 'Keep controls clear of system gestures');
assert(read('LICENSE').includes('Mu-An Chiou'));
assert(read('THIRD_PARTY.md').includes('2187e371e9a0f87cf54a207031760fc33b858a9a'));
const runtimeBytes = ['index.html','styles.css',...scripts].reduce((sum,file)=>sum+Buffer.byteLength(read(file)),0);
assert(runtimeBytes < 180000, 'Runtime HTML/CSS/JS budget under 180KB (reading PNGs separate)');
const lock = JSON.parse(read('package-lock.json'));
for (const value of Object.values(lock.packages)) if (value.resolved) assert(value.resolved.startsWith('https://registry.npmjs.org/'));
const manifest = JSON.parse(read('manifest.webmanifest'));
assert.equal(manifest.scope, './'); assert.equal(manifest.start_url, './'); assert.equal(manifest.display, 'standalone');
for (const size of [192,512]) {
  const entry = manifest.icons.find(icon=>icon.sizes===size+'x'+size); assert(entry);
  const png = fs.readFileSync(path.join(root, entry.src));
  assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a'); assert.equal(png.readUInt32BE(16),size); assert.equal(png.readUInt32BE(20),size);
}
function worker(options={}) {
  const scope='https://example.test/games/buscaminas/', events={}, deleted=[], stored=new Map(); let installed=[], skipped=false;
  stored.set(new URL('./index.html',scope).href,{label:'offline-index'});
  stored.set(new URL('./src/core.js?v=20260928-3',scope).href,{label:'versioned-core'});
  const sandbox={URL,self:{registration:{scope},addEventListener:(type,fn)=>events[type]=fn,skipWaiting:()=>{skipped=true;return Promise.resolve();},clients:{claim:()=>Promise.resolve()}},
    caches:{keys:()=>Promise.resolve(['buscaminas-old','burbujas-other','buscaminas-20260928-4']),delete:name=>{deleted.push(name);return Promise.resolve(true);},open:async name=>{
      assert.equal(name,'buscaminas-20260928-4');return {addAll:async urls=>{installed=Array.from(urls);if(options.broken)throw Error('missing mandatory gate');},match:async request=>stored.get(new URL(typeof request==='string'?request:request.url,scope).href)};
    }},fetch:async request=>{if(options.offline)throw Error('offline');return{ok:!options.failedNavigation,label:'network'};}};
  vm.runInNewContext(read('sw.js'),sandbox);
  function fetch(url,mode='cors',method='GET') {let response;events.fetch({request:{url:new URL(url,scope).href,mode,method},respondWith:value=>response=value});return response;}
  async function event(type) {let work;events[type]({waitUntil:value=>work=value});await work;}
  return {event,fetch,deleted,installed:()=>installed,skipped:()=>skipped};
}
(async()=>{
  const online=worker();await online.event('install');assert(online.skipped());assert.equal(new Set(online.installed()).size,online.installed().length);
  for(const file of online.installed()) assert(fs.existsSync(path.join(root,file.split('?')[0])),file+' exists');
  for(const file of ['styles.css','src/core.js','src/app.js','pwa.js']) assert(online.installed().includes('./'+file+'?v=20260928-3'));
  assert.equal(online.installed().filter(file=>/reading-images\/\d+\.png$/.test(file)).length,100);
  await online.event('activate');assert.deepEqual(online.deleted,['buscaminas-old']);
  assert.equal((await online.fetch('./','navigate')).label,'network');
  assert.equal((await online.fetch('./src/core.js?v=20260928-3')).label,'versioned-core');
  assert.equal((await online.fetch('./src/core.js?v=future')).label,'network');
  assert.equal(online.fetch('../burbujas/','navigate'),undefined);assert.equal(online.fetch('./','navigate','POST'),undefined);
  const offline=worker({offline:true});assert.equal((await offline.fetch('./','navigate')).label,'offline-index');
  await assert.rejects(offline.fetch('./learning-gate.js?missing'),/offline/);
  assert.equal((await worker({failedNavigation:true}).fetch('./','navigate')).label,'offline-index');
  const broken=worker({broken:true});await assert.rejects(broken.event('install'),/mandatory/);assert.equal(broken.skipped(),false);
  console.log('PASS syntax, MIT provenance, PWA/icon/cache isolation, 100 offline images, failed-install safety; runtime '+runtimeBytes+' bytes');
})().catch(error=>{console.error(error);process.exitCode=1;});
