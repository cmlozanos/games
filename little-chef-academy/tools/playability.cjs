/* Standalone real-mechanics check: node tools/playability.cjs (Playwright required).
 * Only the local test response exposes observations and fixed-clock keyboard steps.
 * No production debug API, position writes, item writes or forced completion.
 */
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const instrumentation = `
renderer.setAnimationLoop(null);
renderer.render(scene, camera);
// This is a mechanics/DOM check, not a GPU performance or visual benchmark.
renderer.render = () => {};
clock.getDelta = () => 0.03;
window.__chefPlayability = {
  snapshot() {
    return {player: {...state.player}, mode: state.mode, round: state.roundIndex,
      feedbackText: feedbackLabel.textContent, chef: {x:chef.position.x,z:chef.position.z}, cooldown:state.collectionCooldown,
      count: state.collectedCount, stars: state.stars, completed: state.completed,
      paused: state.paused, frozen: familyFrozen, locked: educationLocked,
      points: window.FamilyV2 ? FamilyV2.read().points : 0,
      final: state.finalSummary, menu: !menuScreen.hidden, summary: !summaryScreen.hidden,
      feedback: state.feedback, progress: progressLabel.textContent,
      items: state.items.map(item => ({...item})),
      visibleCollected: state.itemMeshes.filter(e => e.item.collected && e.group.visible).length};
  },
  step(keys = [], frames = 1) {
    for (const key of keys) window.dispatchEvent(new KeyboardEvent('keydown', {key}));
    for (let i = 0; i < frames; i++) { clock.elapsedTime += 0.03; loop(); }
    for (const key of keys) window.dispatchEvent(new KeyboardEvent('keyup', {key}));
    return this.snapshot();
  },
  route(wrong = false) {
    const expected = getExpectedTarget();
    const targets = state.items.filter(item => !item.collected && isCorrectItem(item, expected) !== wrong);
    const origin = {...state.player}, step = 3.7 * 0.03;
    const moves = [[1,0,'ArrowRight'],[-1,0,'ArrowLeft'],[0,1,'ArrowDown'],[0,-1,'ArrowUp']];
    const queue = [{x:0,z:0,parent:-1}], seen = new Set(['0,0']);
    for (let head = 0; head < queue.length; head++) {
      const node = queue[head], x = origin.x + node.x * step, z = origin.z + node.z * step;
      const target = targets.find(item => Math.hypot(item.x-x,item.z-z) < 0.98);
      if (target) {
        const keys = []; let index = head;
        while (queue[index].parent >= 0) { keys.push(queue[index].key); index = queue[index].parent; }
        return {target: {id:target.id,x:target.x,z:target.z}, keys: keys.reverse(), visited: seen.size};
      }
      for (const [dx,dz,key] of moves) {
        const nx=node.x+dx,nz=node.z+dz, id=nx+','+nz;
        const px=origin.x+nx*step,pz=origin.z+nz*step;
        if (seen.has(id) || Math.abs(px)>WORLD_LIMIT_X || Math.abs(pz)>WORLD_LIMIT_Z || isPositionBlocked(px,pz)) continue;
        if (wrong && state.items.some(item => !item.collected && isCorrectItem(item,expected) && Math.hypot(item.x-px,item.z-pz)<=PLAYER_RADIUS+ITEM_RADIUS)) continue;
        seen.add(id); queue.push({x:nx,z:nz,key,parent:head});
      }
    }
    throw new Error('No keyboard route: '+JSON.stringify({origin,targets}));
  },
  walk(keys) {
    for (const key of keys) this.step([key]);
    return this.step([], 9);
  },
  checkAllSpawns() {
    const origin = {...state.player}, step = 0.111, queue = [[0,0]], seen = new Set(['0,0']);
    const reached = new Set();
    for (let head=0;head<queue.length;head++) {
      const [ix,iz]=queue[head],x=origin.x+ix*step,z=origin.z+iz*step;
      state.items.forEach((item,i)=>{if(Math.hypot(item.x-x,item.z-z)<=PLAYER_RADIUS+ITEM_RADIUS)reached.add(i);});
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx=ix+dx,nz=iz+dz,key=nx+','+nz,px=origin.x+nx*step,pz=origin.z+nz*step;
        if(seen.has(key)||Math.abs(px)>WORLD_LIMIT_X||Math.abs(pz)>WORLD_LIMIT_Z||isPositionBlocked(px,pz))continue;
        seen.add(key);queue.push([nx,nz]);
      }
    }
    return {total:state.items.length,reached:reached.size,unreachable:state.items.filter((_,i)=>!reached.has(i))};
  },
  rebuildLabels: rebuildItemLabels
};`;
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.ttf':'font/ttf','.png':'image/png','.svg':'image/svg+xml'};
const server = http.createServer((req,res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error,bytes) => {
    if (error) { res.writeHead(404).end(); return; }
    res.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-store'}).end(bytes);
  });
});
async function snapshot(page) { return page.evaluate(() => __chefPlayability.snapshot()); }
async function walk(page, wrong = false) {
  const route = await page.evaluate(wrong => __chefPlayability.route(wrong), wrong);
  const before = await snapshot(page);
  const after = await page.evaluate(keys => __chefPlayability.walk(keys), route.keys);
  const segments = [];
  for (const key of route.keys) {
    if (segments.at(-1)?.key === key) segments.at(-1).frames++;
    else segments.push({key,frames:1});
  }
  console.log(JSON.stringify({mode:before.mode,round:before.round+1,from:[before.player.x,before.player.z],target:route.target,segments,to:[after.player.x,after.player.z],count:after.count,stars:after.stars,completed:after.completed}));
  return {before,after};
}
async function solveGate(page) {
  await page.locator('#gate-prompt').waitFor({state:'visible'});
  const text = await page.locator('#gate-prompt').textContent();
  const [,a,op,b] = text.match(/(\d+)\s*([+−-])\s*(\d+)/);
  const answer = op === '+' ? +a + +b : +a - +b;
  await page.locator('[data-gate-key="'+answer+'"]').click();
  await page.locator('#learning-gate').waitFor({state:'detached'});
}
(async () => {
  let browser;
  try {
    await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
    const url = 'http://127.0.0.1:'+server.address().port;
    browser = await chromium.launch({headless:true,...(process.env.CHROME95_PATH?{executablePath:process.env.CHROME95_PATH}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const context = await browser.newContext({serviceWorkers:'block',viewport:{width:960,height:720}});
    await context.addCookies([{name:'family-learning-profile',value:encodeURIComponent(JSON.stringify({version:2,level:'learner',reading:false,challenges:['addition'],expiresAt:Date.now()+86400000})),url}]);
    await context.addInitScript(() => {
      let seed = 147;
      Math.random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror',error => errors.push(error.message));
    await page.route('**/src/main.js*',async route => {
      const response = await route.fetch();
      await route.fulfill({response,body:(await response.text())+'\n'+instrumentation});
    });
    await page.goto(url);
    await solveGate(page);
    await page.evaluate(() => { let seed=147; Math.random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}; });
    await page.locator('[data-mode="count"]').click();
    const spawns = await page.evaluate(() => __chefPlayability.checkAllSpawns());
    assert.equal(spawns.reached,spawns.total,JSON.stringify(spawns));
    console.log('PASS every spawn is reachable by collision-aware keyboard lattice');
    assert.deepEqual((await snapshot(page)).player, {x:0,z:8.5,face:0});
    const wrong = await walk(page,true);
    assert.equal(wrong.after.count,0,'wrong ingredient must not advance count');
    assert.equal(wrong.after.stars,0,'wrong ingredient must not award stars');
    assert.equal(wrong.after.points,wrong.before.points,'wrong ingredient must not award family points');
    assert.ok(wrong.after.feedback,'wrong ingredient provides feedback');
    for (let i=0;i<12 && !(await snapshot(page)).completed;i++) {
      const {before,after} = await walk(page);
      assert.ok(after.count > before.count,'native route must collect a required ingredient');
    }
    const completed = await snapshot(page);
    assert.equal(completed.count,3);
    assert.equal(completed.stars,3);
    assert.equal(completed.points,wrong.before.points+1,'one family point per completed round');
    console.log('PASS count: spawn (0,8.5) -> 3 tomatoes -> completed, without teleport/force win');
    assert.match(completed.progress,/3\/3/,'completion HUD must show final count');
    // No animation/actionability wait: the native summary deadline is only 800ms.
    // Dispatch the real adult-button handler before that deadline in this fixed-clock fixture.
    await page.getByRole('button',{name:'Para adultos',exact:true}).dispatchEvent('click');
    await page.waitForTimeout(950);
    assert.equal((await snapshot(page)).summary,false,'adult lock must freeze pending round summary');
    assert.equal((await snapshot(page)).stars,3);
    await page.getByRole('button',{name:'Cerrar',exact:true}).click();
    await page.waitForFunction(() => !__chefPlayability.snapshot().frozen);
    await page.locator('#summary-screen').waitFor({state:'visible'});
    await page.locator('#replay-button').click();
    assert.equal((await snapshot(page)).menu,true);
    await page.locator('[data-mode="count"]').click();
    assert.equal((await snapshot(page)).count,0);
    assert.equal((await snapshot(page)).stars,0);
    const fresh=await snapshot(page);
    assert.deepEqual({feedback:fresh.feedbackText,cooldown:fresh.cooldown,chef:fresh.chef}, {feedback:'',cooldown:0,chef:{x:0,z:8.5}},'retry must reset feedback, cooldown and visible chef');
    await page.getByRole('button',{name:'Para adultos',exact:true}).click();
    const frozen = await snapshot(page);
    assert.equal(frozen.frozen,true);
    const held = await page.evaluate(() => __chefPlayability.step(['ArrowRight'],30));
    assert.deepEqual(held.player,frozen.player);
    assert.equal(held.count,frozen.count);
    assert.equal(held.stars,frozen.stars);
    assert.equal(held.points,frozen.points);
    await page.getByRole('button',{name:'Cerrar',exact:true}).click();
    await page.waitForFunction(() => !__chefPlayability.snapshot().frozen);
    const resumed = await page.evaluate(() => __chefPlayability.step(['ArrowRight'],5));
    assert.ok(resumed.player.x > frozen.player.x);
    console.log('PASS menu/retry resets; active adult lock freezes native loop and resumes');
    await page.locator('#menu-button').click();
    await page.locator('[data-mode="recipe"]').click();
    for (let i=0;i<12 && !(await snapshot(page)).completed;i++) await walk(page);
    assert.equal((await snapshot(page)).completed,true,'recipe ingredients must complete');
    await page.locator('#menu-button').click();
    await page.waitForTimeout(950);
    assert.equal((await snapshot(page)).summary,false,'pending summary must not reopen after menu');
    console.log('PASS recipe completion and menu cancels pending transition');
    await page.locator('[data-mode="count"]').click();
    await page.locator('#pause-button').click();
    const paused = await snapshot(page);
    assert.equal(paused.paused,true);
    assert.deepEqual((await page.evaluate(() => __chefPlayability.step(['ArrowRight'],10))).player,paused.player);
    await page.getByRole('button',{name:'Para adultos',exact:true}).click();
    await page.getByRole('button',{name:'Cerrar',exact:true}).click();
    await page.waitForFunction(() => !__chefPlayability.snapshot().frozen);
    assert.equal((await snapshot(page)).paused,true,'adult settings must preserve manual pause');
    await page.locator('#menu-button').click();
    await page.locator('[data-mode="count"]').click();
    assert.equal((await snapshot(page)).paused,false);
    assert.equal(await page.locator('#pause-button').textContent(),'Pausa','new game must reset pause label');
    console.log('PASS manual pause, adult pause preservation and retry pause label');
    for (const mode of ['word','color','recipe','math','count']) {
      await page.locator('#menu-button').click();
      await page.locator('[data-mode="'+mode+'"]').click();
      for (let round=0;round<8;round++) {
        for(let i=0;i<20 && !(await snapshot(page)).completed;i++) {
          const {before,after}=await walk(page);
          assert.ok(after.count>before.count,mode+' route must progress');
          await page.evaluate(() => __chefPlayability.rebuildLabels());
          assert.equal((await snapshot(page)).visibleCollected,0,'rebuilding labels must not resurrect collected items');
        }
        const done=await snapshot(page);
        assert.equal(done.completed,true,mode+' round '+(round+1));
        assert.equal(done.stars,(round+1)*3);
        await page.locator('#summary-screen').waitFor({state:'visible'});
        await page.locator('#next-button').click();
      }
      const final=await snapshot(page);
      assert.equal(final.final,true,mode+' final summary');
      assert.equal(final.stars,24);
      await page.locator('#next-button').click();
      const retry=await snapshot(page);
      assert.equal(retry.round,0);assert.equal(retry.count,0);assert.equal(retry.stars,0);assert.equal(retry.completed,false);
      console.log('PASS '+mode+': all 8 rounds, final summary, play again and label rebuild');
    }
    await page.close();
    const blocked = await context.newPage();
    blocked.on('pageerror',error => errors.push(error.message));
    await blocked.addInitScript(() => {
      Storage.prototype.setItem = () => { throw new DOMException('Blocked storage','SecurityError'); };
    });
    await blocked.goto(url);
    await solveGate(blocked);
    await blocked.locator('[data-character="mint"]').click();
    await blocked.locator('[data-mode="count"]').click();
    assert.equal(await blocked.locator('#game-screen').isVisible(),true);
    console.log('PASS blocked localStorage: character selection and new game remain usable');
    assert.deepEqual(errors,[]);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {console.error(error);process.exitCode=1;});
