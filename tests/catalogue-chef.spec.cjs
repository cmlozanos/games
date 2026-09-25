const {test,expect}=require('@playwright/test');
const {solveGate}=require('./helpers/learning-fixture.cjs');

test('catalogue links only to games, in the same tab, on a narrow phone',async({page})=>{
  await page.setViewportSize({width:320,height:640});
  await page.goto('/');
  await expect(page.locator('main a')).toHaveCount(16);
  await expect(page.getByRole('link',{name:'Quiz de Animales'})).toHaveAttribute('href','https://cmlozanos.github.io/home/animal-quiz/');
  await expect(page.locator('a[target="_blank"]')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const href of await page.locator('a').evaluateAll(nodes=>nodes.map(n=>n.href))) {
    expect(new URL(href).pathname).not.toBe('/home/');
    expect(href).not.toContain('trycloudflare');
  }
});

test('Chef: Chrome95 layout, challenge, pause and isolated offline cache',async({page,context})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/little-chef-academy/');
  await expect(page.locator('#learning-gate')).toBeVisible();
  await solveGate(page);
  await page.locator('[data-mode="count"]').click();
  await expect(page.locator('#game-screen')).toBeVisible();
  const aspect=await page.locator('#game-canvas').evaluate(canvas=>({pixels:canvas.width/canvas.height,display:canvas.clientWidth/canvas.clientHeight}));
  expect(Math.abs(aspect.pixels-aspect.display)).toBeLessThan(0.01);
  await page.locator('#pause-button').click();
  const pauseLabel=await page.locator('#pause-button').textContent();
  await page.evaluate(()=>{const now=Date.now;Date.now=()=>now()+600001;});
  await expect(page.locator('#learning-gate')).toBeVisible();
  await solveGate(page);
  await expect(page.locator('#pause-button')).toHaveText(pauseLabel);
  await page.setViewportSize({width:360,height:740});
  expect(await page.locator('#game-screen').evaluate(e=>Math.abs(e.getBoundingClientRect().height-innerHeight)<2)).toBe(true);
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#learning-gate')).toBeVisible();
  await solveGate(page);
  await expect(page.locator('[data-mode="count"]')).toBeVisible();
  expect(errors).toEqual([]);
});
