import {readFileSync, existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const sw = readFileSync('sw.js', 'utf8');
const files = sw.slice(sw.indexOf('const ASSETS'), sw.indexOf('];')).matchAll(/'([^']+)'/g);
for (const [,file] of files) assert.ok(existsSync(file.split('?')[0]), file);
assert.match(sw, /startsWith\('little-chef-academy-'\)/);
assert.match(readFileSync('index.html','utf8'), /https:\/\/cmlozanos.github.io\/games\//);
assert.ok(!readFileSync('styles.css','utf8').includes(':has('));
console.log('Chef: assets, cache isolation, navigation and legacy CSS verified');

// Execute the production binding function; reproduce releasing a key outside
// the browser before the educational deadline expires, without creating WebGL.
const source = readFileSync('src/main.js', 'utf8');
const bindings = source.slice(source.indexOf('function bindEvents()'), source.indexOf('function startMode('));
function eventTarget() {
  const handlers = new Map();
  return {
    addEventListener(type, callback) { const list = handlers.get(type) || []; list.push(callback); handlers.set(type, list); },
    emit(type, event = {}) { for (const callback of handlers.get(type) || []) callback(event); }
  };
}
const testWindow = eventTarget(), testDocument = eventTarget(), touch = eventTarget();
touch.dataset = {direction: 'right'};
const fixture = {
  state: {keys: new Set()}, modeCards: [], characterButtons: [], touchButtons: [touch],
  window: testWindow, document: testDocument,
  resizeRenderer() {}, speakCurrentInstruction() {}, showMenu() {}
};
for (const name of ['languageSelect', 'pauseButton', 'soundButton', 'speakButton', 'menuButton', 'replayButton', 'nextButton']) fixture[name] = eventTarget();
vm.runInNewContext(bindings + '\nbindEvents();', fixture);
for (const interruption of ['blur', 'visibilitychange']) {
  testWindow.emit('keydown', {key: 'ArrowRight', preventDefault() {}});
  touch.emit('pointerdown', {preventDefault() {}});
  assert.deepEqual([...fixture.state.keys].sort(), ['arrowright', 'right']);
  if (interruption === 'blur') testWindow.emit('blur');
  else { testDocument.hidden = true; testDocument.emit('visibilitychange'); }
  assert.equal(fixture.state.keys.size, 0, interruption + ' must clear keyboard and touch input');
}
console.log('Chef: real keyboard/touch handlers release held input on blur and hidden document');
