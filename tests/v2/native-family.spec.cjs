const {test,expect}=require('@playwright/test');
const {solveGate}=require('../helpers/learning-fixture.cjs');
async function adults(page){await page.getByRole('button',{name:'Para adultos',exact:true}).click();const[a,b]=(await page.locator('family-v2-shell').locator('#gate-label').textContent()).match(/\d+/g).map(Number);await page.getByRole('textbox',{name:'Resultado de la multiplicación'}).fill(String(a*b));await page.getByRole('button',{name:'Entrar',exact:true}).click();}
for(const game of ['burbujas','buscaminas','little-chef-academy'])test(game+':2.0 real entry/native home/settings/offline',async({page,context})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>Math.random=()=>.1);
 await page.goto(game+'/?test=1');await solveGate(page);await expect(page.locator('family-v2-shell')).toBeVisible();
 if(game==='burbujas')await page.locator('#play').click();
 if(game==='little-chef-academy')await page.locator('[data-mode="count"]').click();
 if(game==='buscaminas')await page.locator('[data-cell="0"]').click();
 const url=page.url();await page.getByRole('button',{name:'Inicio del juego',exact:true}).click();expect(page.url()).toBe(url);
 await expect(page.locator(game==='burbujas'?'#menu':game==='buscaminas'?'#family-menu':'#menu-screen')).toBeVisible();
 await adults(page);await page.getByRole('button',{name:'Cerrar',exact:true}).click();
 await page.evaluate(()=>navigator.serviceWorker.ready);await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
 await context.setOffline(true);await page.reload();await solveGate(page);await expect(page.locator('family-v2-shell')).toBeVisible();await context.setOffline(false);
 expect(errors).toEqual([]);
});
