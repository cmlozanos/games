'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const {chromium, webkit, expect} = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.md':'text/plain'};
async function serve() {
  let unavailable=false;
  const server = http.createServer(async (req,res)=>{
    if(unavailable){res.destroy();return;}
    try {
      let file = path.resolve(root, '.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
      if (file!==root && !file.startsWith(root+path.sep)) {res.writeHead(403).end();return;}
      if ((await fs.stat(file)).isDirectory()) file=path.join(file,'index.html');
      res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'text/plain','Cache-Control':'no-store'}).end(await fs.readFile(file));
    } catch (_) {res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {server,url:'http://127.0.0.1:'+server.address().port+'/',setUnavailable(value){unavailable=value;}};
}
function instrument() {
  Math.random=()=>.1;
  window.__testNow=Date.now();Date.now=()=>window.__testNow;
  // Test-only interception captures the real board without a production debug API.
  Object.defineProperty(window,'MinesCore',{configurable:true,set(value){
    const create=value.create;value.create=function(...args){const board=create.apply(value,args);window.__testBoard=board;return board;};
    Object.defineProperty(window,'MinesCore',{configurable:true,writable:true,value});
  }});
  window.__audio=[];
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(Audio){window.AudioContext=function(...args){const audio=new Audio(...args);window.__audio.push(audio);return audio;};window.AudioContext.prototype=Audio.prototype;}
}
const state=page=>page.evaluate(()=>JSON.parse(JSON.stringify(window.__testBoard)));
async function solve(page) {
  await expect(page.locator('#learning-gate')).toBeVisible();
  if(await page.locator('#gate-word').isVisible()) {
    const word=await page.locator('#gate-word').textContent();
    await page.getByRole('button',{name:word,exact:true}).click();
  } else {
    const prompt=await page.locator('#gate-prompt').textContent();
    const parts=prompt.match(/(\d)\s*([+−-])\s*(\d)/);assert(parts,'visible arithmetic');
    const result=parts[2]==='+'?+parts[1]+ +parts[3]:+parts[1]- +parts[3];
    await page.locator('[data-gate-key="'+result+'"]').click();
  }
  await expect(page.locator('#learning-gate')).toHaveCount(0);
}
async function tapCell(page,index) {
  const cell=page.locator('[data-cell="'+index+'"]');await cell.scrollIntoViewIfNeeded();
  const box=await cell.boundingBox();await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
}
async function layout(page, label) {
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' no body horizontal overflow');
  if(page.viewportSize().width===1280&&page.viewportSize().height===800)
    assert(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),label+' tablet landscape fits without vertical scrolling');
  for(const selector of ['#home-link','#sound','#easy','#advanced','#restart','#reveal-mode','#flag-mode','#board [data-cell="0"]']) {
    const node=page.locator(selector);await node.scrollIntoViewIfNeeded();const b=await node.boundingBox();
    assert(b.width>=43.9&&b.height>=43.9,label+' '+selector+' >=44px');
    if(!selector.includes('data-cell'))assert(await node.evaluate(n=>n.scrollWidth<=n.clientWidth+1),label+' unclipped control');
  }
  const padding=await page.locator('.app').evaluate(n=>parseFloat(getComputedStyle(n).paddingBottom));
  assert(padding>=64,label+' bottom gesture clearance');
  await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
  const last=await page.locator('.footer a').boundingBox();
  const gap=page.viewportSize().height-last.y-last.height;
  // scrollHeight/scrollY round to pixels while DOM boxes retain fractional pixels.
  assert(Math.round(gap)>=64,label+' bottommost action above gesture area: '+JSON.stringify({gap,last,scroll:await page.evaluate(()=>({y:scrollY,height:document.documentElement.scrollHeight,inner:innerHeight}))}));
}
async function touchPolicy(page) {
  const result=await page.evaluate(()=>{
    const menu=target=>{const e=new MouseEvent('contextmenu',{bubbles:true,cancelable:true});target.dispatchEvent(e);return e.defaultPrevented;};
    const desktop=menu(document.body);
    document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch'}));
    const touch=menu(document.body),input=document.createElement('input');document.body.appendChild(input);
    const editing=menu(input),selection=getComputedStyle(input).userSelect||getComputedStyle(input).webkitUserSelect;input.remove();
    return {desktop,touch,editing,selection};
  });
  assert.deepEqual(result,{desktop:false,touch:true,editing:false,selection:'text'});
}
async function run(browser,url,size,full,local) {
  const context=await browser.newContext({viewport:size,hasTouch:true});
  const timer=setTimeout(()=>context.close(),120000);
  try {
    const page=await context.newPage(),errors=[],external=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',request=>{if(new URL(request.url()).origin!==new URL(url).origin)external.push(request.url());});
    await page.addInitScript(instrument);await page.goto(url);
    await expect(page.locator('#learning-gate')).toBeVisible();
    await expect(page.locator('#board [data-cell]')).toHaveCount(36);
    await expect(page.locator('[data-cell="0"]')).toBeDisabled();
    const locked=await state(page);await page.locator('[data-cell="0"]').evaluate(n=>n.click());assert.deepEqual(await state(page),locked);
    await solve(page);await expect(page.locator('#sound')).toHaveAttribute('aria-pressed','false');
    assert.equal(await page.evaluate(()=>__audio.length),0,'sound OFF creates no audio engine');
    // Test before any touchscreen input, which legitimately remembers recent touch.
    await touchPolicy(page);
    await layout(page,'initial '+size.width+'x'+size.height);
    await tapCell(page,14);const started=await state(page);assert.equal(started.status,'playing');
    assert.equal(started.cells[14].adjacent,0);assert.equal(started.cells[14].mine,false);
    assert.equal(started.cells.filter(c=>c.mine).length,5);
    const mine=started.cells.findIndex(c=>c.mine);
    await page.locator('#flag-mode').click();await tapCell(page,mine);assert.equal((await state(page)).cells[mine].flagged,true);
    await page.locator('#reveal-mode').click();const flagged=await state(page);await tapCell(page,mine);assert.deepEqual(await state(page),flagged,'flagged cell not revealed');
    await page.locator('#flag-mode').click();await tapCell(page,mine);assert.equal((await state(page)).flags,0);
    await page.locator('#reveal-mode').click();
    const beforeRotate=await state(page);await page.setViewportSize({width:size.height,height:size.width});await layout(page,'rotated');assert.deepEqual(await state(page),beforeRotate);
    await page.setViewportSize(size);
    await page.locator('[data-cell="0"]').focus();await page.keyboard.press('ArrowRight');await expect(page.locator('[data-cell="1"]')).toBeFocused();
    await page.keyboard.press('f');await expect(page.locator('#flag-mode')).toHaveAttribute('aria-pressed','true');
    await page.keyboard.press('f');await expect(page.locator('#reveal-mode')).toHaveAttribute('aria-pressed','true');
    if(process.env.SCREENSHOT_DIR){await fs.mkdir(process.env.SCREENSHOT_DIR,{recursive:true});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'mines-'+size.width+'x'+size.height+'.png'),fullPage:true});}
    // Complete the real board through its UI; test capture only chooses known safe cells.
    for(const [index,cell] of (await state(page)).cells.entries())if(!cell.mine&&!cell.revealed&&(await state(page)).status!=='won')await tapCell(page,index);
    assert.equal((await state(page)).status,'won');await expect(page.locator('#next')).toBeVisible();
    await page.locator('#next').click();assert.equal((await state(page)).cells.length,64);assert.equal((await state(page)).mineCount,10);
    await layout(page,'advanced '+size.width+'x'+size.height);
    await tapCell(page,0);const advanced=await state(page);await tapCell(page,advanced.cells.findIndex(c=>c.mine));
    assert.equal((await state(page)).status,'lost');await expect(page.locator('#retry')).toBeVisible();
    const lost=await state(page);await page.locator('[data-cell="0"]').evaluate(n=>n.click());assert.deepEqual(await state(page),lost);
    await page.locator('#retry').click();assert.equal((await state(page)).status,'ready');assert.equal((await state(page)).cells.length,64);
    await page.locator('#easy').click();await page.locator('#flag-mode').click();await tapCell(page,35);
    const preserved=await state(page);
    await page.evaluate(()=>{__testNow+=599999;document.dispatchEvent(new Event('visibilitychange'));});await expect(page.locator('#learning-gate')).toHaveCount(0);
    await page.evaluate(()=>{__testNow+=1;document.dispatchEvent(new Event('visibilitychange'));});await expect(page.locator('#learning-gate')).toBeVisible();
    await page.locator('#restart').evaluate(n=>n.click());assert.deepEqual(await state(page),preserved);
    await solve(page);assert.deepEqual(await state(page),preserved);await expect(page.locator('#flag-mode')).toHaveAttribute('aria-pressed','true');
    if(full){
      await page.locator('#sound').click();await expect(page.locator('#sound')).toHaveAttribute('aria-pressed','true');
      await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
      await expect.poll(()=>page.evaluate(()=>__audio.every(a=>a.state==='suspended'))).toBe(true);
      await page.locator('#restart').evaluate(n=>n.click());assert.deepEqual(await state(page),preserved,'hidden game ignores actions');
      await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
      await page.locator('#sound').click();
      await page.evaluate(()=>{window.__changes=0;new MutationObserver(()=>__changes++).observe(document.getElementById('board'),{attributes:true,childList:true,subtree:true});});
      await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>__changes),0,'no board redraws while idle');
    }
    await page.evaluate(()=>navigator.serviceWorker.ready);await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller),{timeout:20000}).toBe(true);
    const images=await page.evaluate(async()=>{const cache=await caches.open('buscaminas-20260928-3');return(await cache.keys()).filter(r=>/reading-images\/\d+\.png$/.test(new URL(r.url).pathname)).length;});assert.equal(images,100);
    // WebKit's emulated offline mode errors before SW navigation. Cutting the
    // local server responses instead exercises the real failed-network fallback.
    if(process.env.BROWSER==='webkit')local.setUnavailable(true);
    else await context.setOffline(true);
    await page.reload();await solve(page);await expect(page.locator('#sound')).toHaveAttribute('aria-pressed','false');
    assert.equal((await state(page)).cells.length,36);await tapCell(page,14);assert.equal((await state(page)).status,'playing');
    if(full){
      assert(await page.evaluate(()=>LearningProfile.save({level:'advanced',reading:true})));
      await page.addInitScript(()=>{Object.defineProperty(Math,'random',{configurable:true,get:()=>()=>.99,set:()=>{}});});await page.reload();
      await expect(page.locator('#gate-word')).toBeVisible();const word=await page.locator('#gate-word').textContent();assert.match(word,/^[a-záéíóúüñ]{1,5}$/);
      for(const button of await page.locator('.gate-pictures button').all())await expect(button).toBeEnabled();
      const old=await page.locator('.gate-pictures button').evaluateAll(ns=>ns.map(n=>n.dataset.readingId));
      await page.locator('.gate-pictures button').filter({hasNot:page.locator('img[alt="'+word+'"]')}).first().click();
      await expect(page.locator('#gate-word')).not.toHaveText(word);
      const next=await page.locator('.gate-pictures button').evaluateAll(ns=>ns.map(n=>n.dataset.readingId));assert(next.every(id=>!old.includes(id)));
      await solve(page);await expect(page.locator('[data-cell="0"]')).toBeEnabled();
    }
    assert.equal(await page.locator('#home-link').getAttribute('href'),'https://cmlozanos.github.io/games/');
    assert.deepEqual(errors,[]);assert.deepEqual(external,[],'no external runtime requests');
    console.log('PASS '+size.width+'x'+size.height+' gate/layout/touch/keyboard/rotation/win/loss/retry/10min/state/offline'+(full?'/audio/idle/reading':''));
  } finally {clearTimeout(timer);await context.close();if(local)local.setUnavailable(false);}
}
async function missingGate(browser,url) {
  const context=await browser.newContext({serviceWorkers:'block'});
  try{const page=await context.newPage();await page.addInitScript(instrument);await page.route('**/learning-gate.js*',route=>route.abort());await page.goto(url);
    await expect(page.locator('#status')).toContainText('No se ha podido cargar el reto');await expect(page.locator('[data-cell="0"]')).toBeDisabled();
    const before=await state(page);await page.locator('#restart').evaluate(n=>n.click());assert.deepEqual(await state(page),before);console.log('PASS missing educational gate fails closed');
  }finally{await context.close();}
}
(async()=>{let local,browser;try{
  assert(!(process.env.BROWSER==='webkit'&&process.env.MINES_URL),'WebKit offline checks require the local server; use Chromium for published checks');
  if(!process.env.MINES_URL)local=await serve();const url=process.env.MINES_URL||local.url;
  browser=await(process.env.BROWSER==='webkit'?webkit:chromium).launch({executablePath:process.env.CHROME95_PATH||undefined});
  console.log('Browser '+await browser.version());
  for(const [i,size] of [{width:1280,height:800},{width:800,height:1280},{width:320,height:640},{width:740,height:360}].entries())await run(browser,url,size,i===0,local);
  await missingGate(browser,url);
}finally{if(browser)await browser.close();if(local)await new Promise(resolve=>local.server.close(resolve));}})().catch(error=>{console.error(error);process.exitCode=1;});
