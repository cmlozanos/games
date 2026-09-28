const {test,expect}=require('@playwright/test');
const {solveGate}=require('./helpers/learning-fixture.cjs');

for(const game of ['','little-chef-academy/','burbujas/','buscaminas/']) test((game||'catalogue')+': touch context menu and editing',async({page})=>{
  await page.addInitScript(()=>{Math.random=()=>.1;});
  await page.goto('/'+game);
  await solveGate(page);
  const result=await page.evaluate(()=>{
    const body=document.body,desktop=new MouseEvent('contextmenu',{bubbles:true,cancelable:true});body.dispatchEvent(desktop);
    body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',pointerId:77}));
    const touch=new MouseEvent('contextmenu',{bubbles:true,cancelable:true});body.dispatchEvent(touch);
    body.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch',pointerId:77}));
    const field=document.createElement('input');field.type='text';body.appendChild(field);
    const editing=new MouseEvent('contextmenu',{bubbles:true,cancelable:true});field.dispatchEvent(editing);
    const selection=getComputedStyle(body).userSelect||getComputedStyle(body).webkitUserSelect;
    const fieldSelection=getComputedStyle(field).userSelect||getComputedStyle(field).webkitUserSelect;
    field.remove();return {touch:touch.defaultPrevented,desktop:desktop.defaultPrevented,editing:editing.defaultPrevented,selection,fieldSelection};
  });
  expect(result).toEqual({touch:true,desktop:false,editing:false,selection:'none',fieldSelection:'text'});
});
