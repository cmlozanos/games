(function () {
  'use strict';
  var $=function(id){return document.getElementById(id);};
  var canvas=$('board'),renderer=BubbleRenderer.create(canvas),engine;
  var status='menu',level=1,light=true,sound=false,paused=false,locked=true;
  var angle=-Math.PI/2,pointer=null,left=false,right=false,raf=0,last=0,accumulator=0;
  var frames=0,steps=0,audio=null,gate=null;
  var KEY='burbujas-save-v1',SAVE_LIGHT='burbujas-light';
  function read(key){try{return localStorage.getItem(key);}catch(ignore){return null;}}
  function write(key,value){try{localStorage.setItem(key,value);}catch(ignore){}}
  var saved=Number(read(KEY));if(isFinite(saved)&&saved>=1&&saved<=100000)level=Math.floor(saved);
  var preference=read(SAVE_LIGHT);light=preference!=='false';
  engine=BubbleCore.create({seed:'burbujas',level:level});renderer.quality(light);
  function running(){return status==='playing'&&!paused&&!locked&&!document.hidden;}
  function setAudioActive(){if(!audio)return;var active=sound&&running();if(active&&audio.state==='suspended')audio.resume().catch(function(){});else if(!active&&audio.state==='running')audio.suspend().catch(function(){});}
  function tone(kind){
    if(!sound||!running())return;
    try{
      if(!audio){var Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;audio=new Audio();}
      setAudioActive();var osc=audio.createOscillator(),gain=audio.createGain(),t=audio.currentTime;
      osc.type='sine';osc.frequency.setValueAtTime(kind==='pop'?740:kind==='drop'?880:320,t);osc.frequency.exponentialRampToValueAtTime(kind==='shot'?180:1040,t+.12);
      gain.gain.setValueAtTime(.045,t);gain.gain.exponentialRampToValueAtTime(.001,t+.14);osc.connect(gain);gain.connect(audio.destination);osc.start(t);osc.stop(t+.15);
      osc.onended=function(){osc.disconnect();gain.disconnect();};
    }catch(ignore){}
  }
  function cancelInput(){var old=pointer;pointer=null;left=right=false;if(old!==null){try{canvas.releasePointerCapture(old);}catch(ignore){}}}
  function stop(){if(raf)cancelAnimationFrame(raf);raf=0;last=0;accumulator=0;cancelInput();setAudioActive();}
  function draw(){renderer.draw(engine,angle);frames++;}
  function updateHud(){
    $('level').textContent=String(level);$('saved-level').textContent='● '+level;$('score').textContent=String(engine.score);
    $('pause').disabled=status!=='playing';$('quality').setAttribute('aria-pressed',String(light));
    $('quality').setAttribute('aria-label',light?'Modo ligero activado. Cambiar a calidad normal':'Calidad normal. Activar modo ligero');
    $('sound').setAttribute('aria-pressed',String(sound));$('sound').setAttribute('aria-label',sound?'Apagar sonido':'Activar sonido');$('sound').classList.toggle('sound-off',!sound);
    var dots=$('shot-meter').children;for(var i=0;i<dots.length;i++)dots[i].classList.toggle('used',i<engine.shots%5);
  }
  function result(){
    status=engine.status;paused=false;stop();$('result').hidden=false;$('pause-panel').hidden=true;
    var won=status==='won';$('result-title').textContent=won?'¡Genial!':'¡Otra vez!';$('result-score').textContent=String(engine.score);
    $('result-icon').querySelector('use').setAttribute('href',won?'#i-star':'#i-restart');$('next').hidden=!won;$('retry').hidden=won;
    if(won)write(KEY,String(Math.min(100000,level+1)));updateHud();
  }
  function events(){var ev=engine.consumeEvents();if(!ev.length)return;renderer.add(ev);for(var i=0;i<ev.length;i++)if(ev[i].type==='shot'||ev[i].type==='pop'||ev[i].type==='drop')tone(ev[i].type);updateHud();}
  function needsFrame(){return !!(engine.shot||renderer.active()||left||right);}
  function schedule(){if(running()&&needsFrame()&&!raf)raf=requestAnimationFrame(tick);}
  function tick(now){
    raf=0;if(!running()){stop();return;}
    var dt=last?Math.min(.2,(now-last)/1000):1/60;last=now;accumulator+=dt;
    while(accumulator>=1/60){
      if(left||right)angle=BubbleCore.clampAngle(angle+((right?1:0)-(left?1:0))*1.6/60);
      engine.step(1/60);renderer.step(1/60);steps++;accumulator-=1/60;
    }
    events();draw();
    if(engine.status!=='playing'&&!renderer.active()){result();return;}
    if(needsFrame())schedule();else{last=0;accumulator=0;}
  }
  function sync(){setAudioActive();if(running()){draw();schedule();}else stop();}
  function start(){
    if(locked)return;stop();engine=BubbleCore.create({seed:'burbujas',level:level});renderer.clear();status='playing';paused=false;angle=-Math.PI/2;
    $('menu').hidden=true;$('pause-panel').hidden=true;$('result').hidden=true;updateHud();draw();sync();canvas.focus({preventScroll:true});
  }
  function shoot(){if(!running())return;if(engine.fire(angle)){events();draw();schedule();}}
  function aimAt(event){var rect=canvas.getBoundingClientRect();var x=(event.clientX-rect.left)*500/rect.width,y=(event.clientY-rect.top)*724/rect.height;angle=BubbleCore.clampAngle(Math.atan2(Math.min(-1,y-engine.launch.y),x-engine.launch.x));}
  canvas.addEventListener('pointerdown',function(e){if(!running()||pointer!==null||e.button>0)return;e.preventDefault();pointer=e.pointerId;aimAt(e);canvas.setPointerCapture(pointer);draw();});
  canvas.addEventListener('pointermove',function(e){if(!running())return;if(pointer!==null&&e.pointerId!==pointer)return;if(pointer===null&&e.pointerType!=='mouse')return;aimAt(e);draw();});
  canvas.addEventListener('pointerup',function(e){if(e.pointerId!==pointer)return;e.preventDefault();aimAt(e);cancelInput();shoot();});
  canvas.addEventListener('pointercancel',cancelInput);canvas.addEventListener('lostpointercapture',cancelInput);
  document.addEventListener('keydown',function(e){
    if(!running()||/^(BUTTON|A|INPUT)$/.test(e.target.tagName))return;
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();if(e.key==='ArrowLeft')left=true;else right=true;schedule();}
    if((e.code==='Space'||e.key==='Enter')&&!e.repeat){e.preventDefault();shoot();}
    if(e.key==='Escape'){e.preventDefault();pause();}
  });
  document.addEventListener('keyup',function(e){if(e.key==='ArrowLeft')left=false;if(e.key==='ArrowRight')right=false;});
  window.addEventListener('blur',function(){cancelInput();});
  function pause(){if(!running())return;paused=true;$('pause-panel').hidden=false;stop();$('resume').focus({preventScroll:true});}
  $('play').onclick=start;$('pause').onclick=pause;
  $('resume').onclick=function(){if(locked)return;paused=false;$('pause-panel').hidden=true;canvas.focus({preventScroll:true});sync();};
  $('restart').onclick=start;$('retry').onclick=start;
  $('next').onclick=function(){level=Math.min(100000,level+1);start();};
  $('quality').onclick=function(){light=!light;write(SAVE_LIGHT,String(light));renderer.quality(light);updateHud();draw();};
  $('sound').onclick=function(){sound=!sound;updateHud();tone('pop');setAudioActive();};
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('pagehide',stop);
  window.addEventListener('pageshow',sync);
  function resize(){var rect=$('stage').getBoundingClientRect(),scale=Math.min((rect.width-2)/500,(rect.height-2)/724);$('arena').style.width=Math.floor(500*scale)+'px';$('arena').style.height=Math.floor(724*scale)+'px';draw();}
  window.addEventListener('resize',resize);updateHud();resize();
  if(window.LearningGate){gate=LearningGate.mount({gameId:'burbujas',onLock:function(){locked=true;stop();},onUnlock:function(){locked=false;sync();}});}
  else{$('play').disabled=true;$('saved-level').textContent='Recarga para abrir el reto';}
  if(/[?&]test=1(?:&|$)/.test(location.search))window.__bubblesRead=function(){
    var out=engine.snapshot(),stats=renderer.stats();out.status=status;out.level=level;out.light=light;out.sound=sound;out.paused=paused;out.locked=locked;out.frames=frames;out.steps=steps;out.canvasWidth=canvas.width;out.canvasHeight=canvas.height;out.boardBuilds=stats.boardBuilds;out.spriteBuilds=stats.spriteBuilds;return out;
  };
  if('serviceWorker' in navigator)window.addEventListener('load',function(){navigator.serviceWorker.register('./sw.js').catch(function(){});});
}());
