/* Native-only refinement regressions. No shared kit writes or production debug hooks. */
const {test,expect}=require('@playwright/test');
const {solveGate}=require('./helpers/learning-fixture.cjs');
const {execFileSync}=require('node:child_process');

test.use({serviceWorkers:'block'});
async function appearance(page,theme,motion){
  await page.evaluate(({theme,motion})=>{
    // Exercise the agreed API before the independently-owned shared kit arrives.
    window.FamilyV2.theme=()=>theme;
    window.FamilyV2.motionAllowed=()=>motion;
    document.documentElement.dataset.familyTheme=theme;
    document.documentElement.classList.toggle('family-no-motion',!motion);
    dispatchEvent(new CustomEvent('familyv2:appearance',{detail:{theme,motion}}));
  },{theme,motion});
}
async function open(page,game){
  await page.addInitScript(()=>{
    Math.random=()=>.1;
    window.__nativeFonts=[];
    const fill=CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText=function(...args){window.__nativeFonts.push({text:String(args[0]),font:this.font});return fill.apply(this,args);};
  });
  if(game==='little-chef-academy')await page.route('**/src/main.js*',async route=>{
    let source=await (await route.fetch()).text();
    if(process.env.NATIVE_BASELINE)source=execFileSync('git',['show','HEAD:little-chef-academy/src/main.js'],{encoding:'utf8'});
    await route.fulfill({contentType:'text/javascript',body:source+`\nwindow.__nativeChef={read(){return {background:scene.background.getHexString(),wall:materials.wall.color.getHexString(),steam:steam.visible,items:state.itemMeshes.map(e=>({y:e.group.position.y,r:e.group.rotation.y})),player:{...state.player},calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,aa:renderer.getContext().getContextAttributes().antialias,shadows:renderer.shadowMap.enabled,tiles:world.children.filter(n=>n.isInstancedMesh).map(n=>n.count),particles:state.particles.length,tosses:state.tosses.length};}};`});
  });
  await page.goto(game+'/?test=1');await solveGate(page);
  await page.evaluate(()=>FamilyV2.fontReady);
  if(game==='little-chef-academy')await page.locator('[data-mode="count"]').click();
  if(game==='burbujas')await page.locator('#play').click();
  if(game==='buscaminas')await page.locator('[data-cell="0"]').click();
}
for(const viewport of [{width:1024,height:768},{width:960,height:540}]){
  for(const game of ['little-chef-academy','burbujas','buscaminas'])test(`${game} native theme/motion/font ${viewport.width}x${viewport.height}`,async({page},testInfo)=>{
    test.setTimeout(60000);await page.setViewportSize(viewport);
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await open(page,game);
    await appearance(page,'light',false);
    await page.waitForTimeout(300);
    const target=page.locator(game==='little-chef-academy'?'#game-canvas':game==='burbujas'?'#board':'.board-card');
    const day=await target.screenshot({path:testInfo.outputPath('day.png')});
    const fonts=await page.evaluate(()=>Array.from(document.querySelectorAll('button,h1,h2,p,.metric,b,select')).filter(n=>n.getClientRects().length).map(n=>({text:n.textContent.slice(0,30),font:getComputedStyle(n).fontFamily})));
    expect(fonts.filter(n=>!n.font.includes('Family School'))).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if(game==='little-chef-academy'){
      const before=await page.evaluate(()=>__nativeChef.read());
      await page.waitForTimeout(150);const after=await page.evaluate(()=>__nativeChef.read());
      expect(after.items).toEqual(before.items);expect(after.steam).toBe(false);
      expect(after.tiles).toEqual([330,330]);expect(after.aa).toBe(false);expect(after.shadows).toBe(false);
      expect(after.calls).toBeLessThan(250);
      const labels=await page.evaluate(()=>__nativeFonts.filter(n=>/[A-Za-z0-9]/.test(n.text)));
      expect(labels.length).toBeGreaterThan(0);expect(labels.every(n=>n.font.includes('Family School'))).toBe(true);
      await page.keyboard.down('ArrowRight');await page.waitForTimeout(200);await page.keyboard.up('ArrowRight');
      expect((await page.evaluate(()=>__nativeChef.read())).player.x).toBeGreaterThan(after.player.x);
      await testInfo.attach('render-budget',{body:JSON.stringify(after),contentType:'application/json'});
    }else if(game==='burbujas'){
      const before=await page.evaluate(()=>__bubblesRead());
      await page.waitForTimeout(150);expect((await page.evaluate(()=>__bubblesRead())).frames).toBe(before.frames);
      await page.locator('#board').focus();await page.keyboard.press('Space');
      await expect.poll(()=>page.evaluate(()=>__bubblesRead().shots)).toBe(before.shots+1);
      await expect.poll(()=>page.evaluate(()=>__bubblesRead().shot)).toBe(null);
    }else{
      const cells=page.locator('.cell');expect(await cells.count()).toBe(36);
      const number=page.locator('.cell[data-number]').first();await expect(number).toBeVisible();
      expect(await number.evaluate(n=>getComputedStyle(n).fontFamily)).toContain('Family School');
      const rect=await cells.first().boundingBox();expect(rect.width).toBeGreaterThanOrEqual(44);expect(rect.height).toBeGreaterThanOrEqual(44);
      await page.locator('#flag-mode').click();await expect(page.locator('#flag-mode')).toHaveAttribute('aria-pressed','true');
    }
    await appearance(page,'dark',false);await page.waitForTimeout(150);
    const night=await target.screenshot({path:testInfo.outputPath('night.png')});expect(day.equals(night)).toBe(false);
    if(game==='little-chef-academy')expect((await page.evaluate(()=>__nativeChef.read())).background).toBe('17283d');
    if(game==='burbujas'){
      const state=await page.evaluate(()=>__bubblesRead());await page.waitForTimeout(120);
      expect((await page.evaluate(()=>__bubblesRead())).boardBuilds).toBe(state.boardBuilds);
      expect(state.sound).toBe(false);expect(state.canvasWidth).toBe(500);
    }
    expect(errors).toEqual([]);
  });
}

test('Bubbles suppresses optional effects without changing required projectile',async({page})=>{
  await open(page,'burbujas');await appearance(page,'dark',false);
  const stats=await page.evaluate(()=>{
    const canvas=document.createElement('canvas'),r=BubbleRenderer.create(canvas),e=BubbleCore.create({seed:'test',level:1});
    const grid=JSON.stringify(e.grid);r.add([{type:'pop',bubbles:[{x:30,y:30,color:0}]}]);r.draw(e,-Math.PI/2);
    return {active:r.active(),same:grid===JSON.stringify(e.grid),canFire:e.fire(-Math.PI/2),shot:!!e.shot};
  });expect(stats).toEqual({active:false,same:true,canFire:true,shot:true});
});

test('real shared appearance controls reach all three native games',async({page})=>{
  for(const game of ['little-chef-academy','burbujas','buscaminas']){
    await open(page,game);
    const theme=page.getByRole('combobox',{name:'Aspecto'});
    await theme.selectOption('dark');
    await expect.poll(()=>page.evaluate(()=>FamilyV2.theme())).toBe('dark');
    await page.getByRole('button',{name:'Para adultos',exact:true}).click();
    const [a,b]=(await page.locator('family-v2-shell').locator('#gate-label').textContent()).match(/\d+/g).map(Number);
    await page.getByRole('textbox',{name:'Resultado de la multiplicación'}).fill(String(a*b));
    await page.getByRole('button',{name:'Entrar',exact:true}).click();
    await page.locator('family-v2-shell').locator('#motion').click();
    await page.getByRole('button',{name:'Cerrar',exact:true}).click();
    expect(await page.evaluate(()=>FamilyV2.motionAllowed())).toBe(false);
    if(game==='little-chef-academy'){
      const state=await page.evaluate(()=>__nativeChef.read());expect(state.background).toBe('17283d');expect(state.steam).toBe(false);
    }else if(game==='buscaminas'){
      const cell=page.locator('.cell.is-revealed').first();
      const dark=await cell.evaluate(n=>getComputedStyle(n).backgroundColor);
      await theme.selectOption('light');
      await expect.poll(()=>cell.evaluate(n=>getComputedStyle(n).backgroundColor)).not.toBe(dark);
      expect(await cell.evaluate(n=>getComputedStyle(n).fontFamily)).toContain('Family School');
    }else{
      const before=await page.evaluate(()=>__bubblesRead().boardBuilds);
      await theme.selectOption('light');
      expect(await page.evaluate(()=>__bubblesRead().boardBuilds)).toBeGreaterThan(before);
    }
  }
});
