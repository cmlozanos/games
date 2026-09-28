const {test,expect}=require('@playwright/test');
const {solveGate}=require('./helpers/learning-fixture.cjs');
const types=['addition','subtraction','trace','reading'];
const minimums=types.slice(0,3);

async function openSettings(page) {
  await page.goto('/');
  await page.getByRole('button',{name:'Perfiles y retos',exact:true}).click();
  await expect(page.locator('#profile-panel')).toBeVisible();
}

async function expectSelection(page,selected) {
  for(const type of types) {
    const checkbox=page.locator('#profile-'+type);
    await expect(checkbox).toBeEnabled();
    await expect(checkbox).toBeChecked({checked:selected.includes(type)});
  }
}

async function selectChallenges(page,selected) {
  // Select first so changing between single-type profiles never transiently empties the set.
  for(const type of selected)await page.locator('#profile-'+type).check();
  for(const type of types)if(!selected.includes(type))await page.locator('#profile-'+type).uncheck();
  await expectSelection(page,selected);
}

async function saveProfile(page) {
  await page.getByRole('button',{name:'Guardar en esta tablet'}).click();
  await expect(page.getByRole('status')).toContainText('Perfil guardado');
}

async function solveSelectedGate(page,type) {
  await expect(page.locator('#learning-gate')).toBeVisible();
  if(type==='reading') {
    await expect(page.locator('#gate-word')).toBeVisible();
    const word=await page.locator('#gate-word').textContent();
    expect(word).toMatch(/^[a-záéíóúüñ]{1,5}$/);
    await page.getByRole('button',{name:word,exact:true}).click();
  } else {
    if(type==='trace')await expect(page.locator('#gate-trace')).toBeVisible();
    else await expect(page.locator('#gate-prompt')).toContainText(type==='addition'?'+':'−');
    await solveGate(page);
  }
  await expect(page.locator('#learning-gate')).toHaveCount(0);
}

test('no profile uses editable defaults, fits a narrow phone and preserves catalogue links',async({page,context})=>{
  await context.clearCookies();
  await page.setViewportSize({width:320,height:640});
  await page.goto('/');
  await expect(page.locator('#profile-panel')).toBeHidden();
  await page.getByRole('button',{name:'Perfiles y retos',exact:true}).click();
  await expectSelection(page,minimums);
  await expect(page.getByRole('radio',{name:'Aprendiz',exact:true})).toBeChecked();
  expect(await page.evaluate(()=>window.LearningProfile.read())).toBeNull();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const label of await page.locator('.profile-options label').all()) {
    const box=await label.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x+box.width).toBeLessThanOrEqual(320);
  }
  await expect(page.locator('main a')).toHaveCount(18);
  await expect(page.locator('#learning-gate')).toHaveCount(0);
  await page.getByRole('button',{name:'Perfiles y retos',exact:true}).click();
  await expect(page.locator('#profile-panel')).toBeHidden();
});

test('all fifteen nonempty combinations save and survive reload without disabling any option',async({page,context})=>{
  await openSettings(page);
  for(let mask=1;mask<16;mask++) {
    const selected=types.filter((_,index)=>mask&(1<<index));
    await selectChallenges(page,selected);
    await saveProfile(page);
    const saved=await page.evaluate(()=>window.LearningProfile.read());
    expect(saved).toMatchObject({version:2,level:'learner',reading:selected.includes('reading'),challenges:selected});
    expect(saved.expiresAt-Date.now()).toBeGreaterThan(364*24*60*60*1000);
    expect(saved.expiresAt-Date.now()).toBeLessThanOrEqual(366*24*60*60*1000);
    await openSettings(page);
    await expectSelection(page,selected);
  }
  const cookie=(await context.cookies()).find(item=>item.name==='family-learning-profile');
  expect(cookie).toMatchObject({path:'/',sameSite:'Lax'});
});

test('the last checkbox remains selected after touch or keyboard and reports the minimum accessibly',async({page})=>{
  await openSettings(page);
  await selectChallenges(page,['reading']);
  const reading=page.locator('#profile-reading');
  await reading.tap();
  await expectSelection(page,['reading']);
  await expect(page.getByRole('status')).toContainText('Elige al menos un reto');
  await expect(page.getByRole('status')).toHaveAttribute('aria-live','polite');
  await reading.focus();
  await page.keyboard.press('Space');
  await expectSelection(page,['reading']);
  await saveProfile(page);
  await selectChallenges(page,['addition']);
  await saveProfile(page);
  await openSettings(page);
  await expectSelection(page,['addition']);
});

test('presets are editable starting points and reset restores unsaved defaults',async({page})=>{
  await openSettings(page);
  await page.getByRole('radio',{name:'Avanzado',exact:true}).check();
  await expectSelection(page,types);
  expect(await page.evaluate(()=>window.LearningProfile.read())).toBeNull();
  await selectChallenges(page,['subtraction']);
  await saveProfile(page);
  await openSettings(page);
  await expect(page.getByRole('radio',{name:'Avanzado',exact:true})).toBeChecked();
  await expectSelection(page,['subtraction']);
  await page.getByRole('radio',{name:'Aprendiz',exact:true}).check();
  await expectSelection(page,minimums);
  await selectChallenges(page,['reading']);
  await saveProfile(page);
  expect(await page.evaluate(()=>window.LearningProfile.read())).toMatchObject({level:'learner',challenges:['reading']});
  await page.getByRole('button',{name:'Borrar perfil'}).click();
  await expect(page.getByRole('status')).toContainText('Perfil borrado');
  await openSettings(page);
  expect(await page.evaluate(()=>window.LearningProfile.read())).toBeNull();
  await expectSelection(page,minimums);
});

for(const reading of [false,true])test('legacy v1 profile preserves its selection without rewriting the cookie: '+reading,async({page,context})=>{
  const value=encodeURIComponent(JSON.stringify({version:1,level:'advanced',reading,expiresAt:Date.now()+86400000}));
  await context.addCookies([{name:'family-learning-profile',value,url:'http://127.0.0.1:4188/',sameSite:'Lax'}]);
  await openSettings(page);
  await expectSelection(page,reading?types:minimums);
  await expect(page.getByRole('radio',{name:'Avanzado',exact:true})).toBeChecked();
  expect((await context.cookies()).find(item=>item.name==='family-learning-profile').value).toBe(value);
  await selectChallenges(page,['trace']);
  await saveProfile(page);
  expect(await page.evaluate(()=>window.LearningProfile.read())).toMatchObject({version:2,challenges:['trace']});
});

for(const invalid of ['malformed','expired','empty','unknown'])test(invalid+' profile cookie falls back to editable defaults',async({page,context})=>{
  await openSettings(page);
  await selectChallenges(page,['reading']);
  await saveProfile(page);
  const profile=await page.evaluate(()=>window.LearningProfile.read());
  const cookie=(await context.cookies()).find(item=>item.name==='family-learning-profile');
  let value='broken-json';
  if(invalid==='expired')value=encodeURIComponent(JSON.stringify({...profile,expiresAt:Date.now()-1000}));
  if(invalid==='empty')value=encodeURIComponent(JSON.stringify({...profile,challenges:[]}));
  if(invalid==='unknown')value=encodeURIComponent(JSON.stringify({...profile,challenges:['unknown']}));
  await context.addCookies([{...cookie,value}]);
  await openSettings(page);
  expect(await page.evaluate(()=>window.LearningProfile.read())).toBeNull();
  await expectSelection(page,minimums);
});

test('blocked cookie reports not saved and reload restores defaults',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(document,'cookie',{configurable:true,get:()=>'',set:()=>{}}));
  await openSettings(page);
  await selectChallenges(page,['reading']);
  await page.getByRole('button',{name:'Guardar en esta tablet'}).click();
  await expect(page.getByRole('status')).toContainText('No se ha guardado');
  await expect(page.getByRole('status')).toHaveAttribute('data-error','true');
  expect(await page.evaluate(()=>window.LearningProfile.read())).toBeNull();
  await openSettings(page);
  await expectSelection(page,minimums);
});

for(const type of types)test('only '+type+' is used in Buscaminas at entry and every ten minutes',async({page})=>{
  await page.addInitScript(()=>{Math.random=()=>.1;window.__testNow=Date.now();Date.now=()=>window.__testNow;});
  await openSettings(page);
  await selectChallenges(page,[type]);
  await saveProfile(page);
  await page.locator('main a[href="./buscaminas/"]').click();
  await expect(page.locator('#learning-gate')).toBeVisible();
  expect(await page.evaluate(()=>window.LearningProfile.read())).toMatchObject({challenges:[type]});
  await solveSelectedGate(page,type);
  await expect(page.locator('#board [data-cell]')).toHaveCount(36);
  await expect(page.locator('#board [data-cell="0"]')).toBeEnabled();
  await page.evaluate(()=>{window.__testNow+=599999;});
  await page.waitForTimeout(1100);
  await expect(page.locator('#learning-gate')).toHaveCount(0);
  await page.evaluate(()=>{window.__testNow+=1;});
  await expect(page.locator('#learning-gate')).toBeVisible();
  await expect(page.locator('#board [data-cell="0"]')).toBeDisabled();
  await solveSelectedGate(page,type);
  await expect(page.locator('#board [data-cell="0"]')).toBeEnabled();
});

test('reading-only profile is shared with Burbujas and an incorrect image rotates the challenge',async({page,context})=>{
  await page.addInitScript(()=>{Math.random=()=>.99;});
  await openSettings(page);
  await selectChallenges(page,['reading']);
  await saveProfile(page);
  const cookie=(await context.cookies()).find(item=>item.name==='family-learning-profile');
  expect(cookie.path).toBe('/');
  await page.locator('main a[href="./burbujas/"]').click();
  await expect(page).toHaveURL(/\/burbujas\/$/);
  await expect(page.locator('#learning-gate')).toBeVisible();
  expect(await page.evaluate(()=>window.LearningProfile.read())).toMatchObject({challenges:['reading']});
  async function readyWord() {
    await expect(page.locator('#gate-word')).toBeVisible();
    await expect(page.locator('.gate-pictures button')).toHaveCount(3);
    for(const button of await page.locator('.gate-pictures button').all())await expect(button).toBeEnabled();
    expect(await page.locator('.gate-pictures img').evaluateAll(nodes=>nodes.filter(image=>image.complete&&image.naturalWidth>0).length)).toBe(3);
    return page.locator('#gate-word').textContent();
  }
  const word=await readyWord();
  const before=await page.locator('.gate-pictures button').evaluateAll(nodes=>nodes.map(button=>button.dataset.readingId));
  await page.locator('.gate-pictures button').filter({hasNot:page.locator('img[alt="'+word+'"]')}).first().click();
  const next=await readyWord();
  expect(next).not.toBe(word);
  const after=await page.locator('.gate-pictures button').evaluateAll(nodes=>nodes.map(button=>button.dataset.readingId));
  expect(after.every(id=>!before.includes(id))).toBe(true);
  await expect(page.locator('#learning-gate')).toBeVisible();
  await page.getByRole('button',{name:next,exact:true}).click();
  await expect(page.locator('#learning-gate')).toHaveCount(0);
  await page.locator('#play').click();
  await expect(page.locator('#menu')).toBeHidden();
});
