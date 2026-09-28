const {test,expect}=require('@playwright/test');

async function openSettings(page) {
  await page.goto('/');
  await page.getByRole('button',{name:'Perfiles y retos',exact:true}).click();
  await expect(page.locator('#profile-panel')).toBeVisible();
}

async function expectMinimums(page) {
  for(const name of ['Sumas','Restas','Trazos']) {
    await expect(page.getByRole('checkbox',{name,exact:true})).toBeChecked();
    await expect(page.getByRole('checkbox',{name,exact:true})).toBeDisabled();
  }
}

test('no profile uses minimums, fits a narrow phone and preserves catalogue links',async({page,context})=>{
  await context.clearCookies();
  await page.setViewportSize({width:320,height:640});
  await page.goto('/');
  await expect(page.locator('#profile-panel')).toBeHidden();
  await page.getByRole('button',{name:'Perfiles y retos',exact:true}).click();
  await expectMinimums(page);
  await expect(page.getByRole('radio',{name:'Aprendiz',exact:true})).toBeChecked();
  await expect(page.getByRole('checkbox',{name:'Añadir lectura con imágenes'})).not.toBeChecked();
  expect(await page.evaluate(()=>window.LearningProfile.read())).toBeNull();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator('main a')).toHaveCount(18);
  await expect(page.locator('#learning-gate')).toHaveCount(0);
  await page.getByRole('button',{name:'Perfiles y retos',exact:true}).click();
  await expect(page.locator('#profile-panel')).toBeHidden();
});

test('advanced adds reading, requires save, persists and can reset without replacing minimums',async({page,context})=>{
  await openSettings(page);
  await page.getByRole('radio',{name:'Avanzado',exact:true}).check();
  await expect(page.locator('#profile-reading')).toBeChecked();
  await expectMinimums(page);
  expect(await page.evaluate(()=>window.LearningProfile.read())).toBeNull();
  await page.getByRole('button',{name:'Guardar en esta tablet'}).click();
  await expect(page.getByRole('status')).toContainText('Perfil guardado');
  const saved=await page.evaluate(()=>window.LearningProfile.read());
  expect(saved).toMatchObject({version:1,level:'advanced',reading:true});
  expect(saved.expiresAt-Date.now()).toBeGreaterThan(364*24*60*60*1000);
  expect(saved.expiresAt-Date.now()).toBeLessThanOrEqual(366*24*60*60*1000);
  const cookies=await context.cookies();
  expect(cookies.some(cookie=>cookie.path==='/'&&cookie.sameSite==='Lax')).toBe(true);
  await openSettings(page);
  await expect(page.getByRole('radio',{name:'Avanzado',exact:true})).toBeChecked();
  await expect(page.locator('#profile-reading')).toBeChecked();
  await page.locator('#profile-reading').uncheck();
  await page.getByRole('button',{name:'Guardar en esta tablet'}).click();
  await openSettings(page);
  await expect(page.locator('#profile-reading')).not.toBeChecked();
  await expectMinimums(page);
  await page.getByRole('radio',{name:'Aprendiz',exact:true}).check();
  await expect(page.locator('#profile-reading')).not.toBeChecked();
  await page.locator('#profile-reading').check();
  await page.getByRole('button',{name:'Guardar en esta tablet'}).click();
  expect(await page.evaluate(()=>window.LearningProfile.read())).toMatchObject({level:'learner',reading:true});
  await expectMinimums(page);
  await page.getByRole('button',{name:'Borrar perfil'}).click();
  await expect(page.getByRole('status')).toContainText('Perfil borrado');
  await openSettings(page);
  expect(await page.evaluate(()=>window.LearningProfile.read())).toBeNull();
  await expect(page.getByRole('radio',{name:'Aprendiz',exact:true})).toBeChecked();
  await expect(page.locator('#profile-reading')).not.toBeChecked();
});

for(const invalid of ['malformed','expired']) test(invalid+' profile cookie falls back to minimums',async({page,context})=>{
  await openSettings(page);
  await page.getByRole('radio',{name:'Avanzado',exact:true}).check();
  await page.getByRole('button',{name:'Guardar en esta tablet'}).click();
  const profile=await page.evaluate(()=>window.LearningProfile.read());
  const cookies=await context.cookies();
  const cookieName=await page.evaluate(()=>window.LearningProfile.cookieName);
  const cookie=cookies.find(item=>item.name===cookieName);
  expect(cookie).toBeTruthy();
  const value=invalid==='malformed'?'broken-json':encodeURIComponent(JSON.stringify({...profile,expiresAt:Date.now()-1000}));
  await context.addCookies([{...cookie,value}]);
  await openSettings(page);
  expect(await page.evaluate(()=>window.LearningProfile.read())).toBeNull();
  await expect(page.locator('#profile-reading')).not.toBeChecked();
  await expectMinimums(page);
});

test('blocked cookie reports not saved and cannot enable reading for games',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(document,'cookie',{configurable:true,get:()=>'',set:()=>{}}));
  await openSettings(page);
  await page.getByRole('radio',{name:'Avanzado',exact:true}).check();
  await page.getByRole('button',{name:'Guardar en esta tablet'}).click();
  await expect(page.getByRole('status')).toContainText('No se ha guardado');
  await expect(page.getByRole('status')).toHaveAttribute('data-error','true');
  expect(await page.evaluate(()=>window.LearningProfile.read())).toBeNull();
  await openSettings(page);
  await expect(page.locator('#profile-reading')).not.toBeChecked();
  await expectMinimums(page);
});

test('Games saves a shared profile and Burbujas uses its reading challenge before play',async({page,context})=>{
  await page.addInitScript(()=>{Math.random=()=>.99;});
  await openSettings(page);
  await page.getByRole('radio',{name:'Avanzado',exact:true}).check();
  await page.getByRole('button',{name:'Guardar en esta tablet'}).click();
  await expect(page.getByRole('status')).toContainText('Perfil guardado');
  const cookie=(await context.cookies()).find(item=>item.name==='family-learning-profile');
  expect(cookie.path).toBe('/');
  await page.locator('main a[href="./burbujas/"]').click();
  await expect(page).toHaveURL(/\/burbujas\/$/);
  expect(await page.evaluate(()=>window.LearningProfile.read())).toMatchObject({level:'advanced',reading:true});

  async function readyWord() {
    await expect(page.locator('#gate-word')).toBeVisible();
    await expect(page.locator('.gate-pictures button')).toHaveCount(3);
    for(const button of await page.locator('.gate-pictures button').all())await expect(button).toBeEnabled();
    const word=await page.locator('#gate-word').textContent();
    expect(word).toMatch(/^[a-záéíóúüñ]{1,5}$/);
    expect(await page.locator('.gate-pictures img').evaluateAll(nodes=>nodes.filter(image=>image.complete&&image.naturalWidth>0).length)).toBe(3);
    return word;
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
  await page.evaluate(()=>navigator.serviceWorker.ready);
});

test('Games profile also enables reading in the new Buscaminas',async({page})=>{
  await page.addInitScript(()=>{Math.random=()=>.99;});
  await openSettings(page);
  await page.getByRole('radio',{name:'Avanzado',exact:true}).check();
  await page.getByRole('button',{name:'Guardar en esta tablet'}).click();
  await expect(page.getByRole('status')).toContainText('Perfil guardado');
  await page.locator('main a[href="./buscaminas/"]').click();
  await expect(page.locator('#gate-word')).toBeVisible();
  const word=await page.locator('#gate-word').textContent();
  await page.getByRole('button',{name:word,exact:true}).click();
  await expect(page.locator('#learning-gate')).toHaveCount(0);
  await expect(page.locator('#board [data-cell]')).toHaveCount(36);
  await expect(page.locator('#board [data-cell="0"]')).toBeEnabled();
  await page.evaluate(()=>navigator.serviceWorker.ready);
});
