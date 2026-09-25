/* Original Canvas 2D artwork. Sprites and the stationary board are cached. */
(function (root) {
  'use strict';
  var colors = ['#ff738d', '#5dded1', '#b297ff', '#ffc569', '#8de292'];
  function circle(ctx,x,y,r) { ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); }
  function create(canvas) {
    var ctx=canvas.getContext('2d',{alpha:false}), cache=document.createElement('canvas');
    var sprites=[], ratio=1, light=true, revision=-1, cachedEngine=null, effects=[];
    var boardBuilds=0,spriteBuilds=0,aim=null,aimRevision=-1,aimAngle=0;
    function symbol(c,color) {
      c.lineWidth=2;c.strokeStyle='rgba(255,255,255,.88)';c.lineJoin='round';c.lineCap='round';c.beginPath();
      if(color===0)c.rect(-6,-6,12,12);
      if(color===1){c.moveTo(0,-8);c.lineTo(8,6);c.lineTo(-8,6);c.closePath();}
      if(color===2){c.moveTo(0,-8);c.lineTo(8,0);c.lineTo(0,8);c.lineTo(-8,0);c.closePath();}
      if(color===3){for(var i=0;i<10;i++){var a=-Math.PI/2+i*Math.PI/5,r=i%2?4:8; if(i)c.lineTo(Math.cos(a)*r,Math.sin(a)*r);else c.moveTo(0,-8);}c.closePath();}
      if(color===4)c.arc(0,0,6,0,Math.PI*2);
      c.stroke();
    }
    function buildSprites() {
      sprites=[];spriteBuilds++;
      for(var i=0;i<5;i++){
        var s=document.createElement('canvas');s.width=s.height=44*ratio;var c=s.getContext('2d');c.scale(ratio,ratio);c.translate(22,22);
        circle(c,0,1,19.5);c.fillStyle='#041a2d';c.fill();
        circle(c,0,-.5,18.5);c.fillStyle=colors[i];c.fill();
        var g=c.createRadialGradient(-7,-9,1,1,3,24);g.addColorStop(0,'rgba(255,255,255,.6)');g.addColorStop(.45,'rgba(255,255,255,.03)');g.addColorStop(1,'rgba(7,30,57,.45)');c.fillStyle=g;c.fill();c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=1;c.stroke();
        c.beginPath();c.arc(-1,-1,14,Math.PI*1.12,Math.PI*1.53);c.strokeStyle='rgba(255,255,255,.65)';c.lineWidth=2;c.stroke();
        symbol(c,i);sprites.push(s);
      }
    }
    function quality(value) {
      light=value;ratio=light?1:Math.min(2,Math.max(1,root.devicePixelRatio||1));
      canvas.width=Math.round(500*ratio);canvas.height=Math.round(724*ratio);cache.width=canvas.width;cache.height=canvas.height;
      buildSprites();revision=-1;
    }
    function bubble(c,color,x,y,size) {
      if(color===null||color===undefined)return;
      var d=size||44;c.drawImage(sprites[color],Math.round(x-d/2),Math.round(y-d/2),d,d);
    }
    function board(e) {
      if(revision===e.revision&&cachedEngine===e)return;
      revision=e.revision;cachedEngine=e;boardBuilds++;
      var c=cache.getContext('2d');c.setTransform(ratio,0,0,ratio,0,0);
      var g=c.createLinearGradient(0,0,0,724);g.addColorStop(0,'#173e50');g.addColorStop(1,'#0b2439');c.fillStyle=g;c.fillRect(0,0,500,724);
      c.fillStyle='#86c8d410';
      for(var y=20;y<634;y+=34.641)for(var x=30;x<500;x+=40){circle(c,x,y,1);c.fill();}
      c.fillStyle='#122b3d';c.fillRect(0,0,500,e.ceilingOffset);
      c.fillStyle='#5e91a1';c.fillRect(0,e.ceilingOffset,500,3);
      if(e.ceilingOffset>0){c.strokeStyle='#456977';c.lineWidth=2;for(x=10;x<500;x+=32){c.beginPath();c.moveTo(x,e.ceilingOffset-11);c.lineTo(x+8,e.ceilingOffset-4);c.lineTo(x+16,e.ceilingOffset-11);c.stroke();}}
      c.strokeStyle='#f6ae7155';c.lineWidth=1.5;c.setLineDash([5,8]);c.beginPath();c.moveTo(0,e.loseLine);c.lineTo(500,e.loseLine);c.stroke();c.setLineDash([]);
      c.fillStyle='#f6ae71';c.beginPath();c.moveTo(0,e.loseLine-6);c.lineTo(8,e.loseLine);c.lineTo(0,e.loseLine+6);c.fill();c.beginPath();c.moveTo(500,e.loseLine-6);c.lineTo(492,e.loseLine);c.lineTo(500,e.loseLine+6);c.fill();
      for(var r=0;r<e.grid.length;r++)for(var col=0;col<e.grid[r].length;col++)if(e.grid[r][col]!==null){var p=e.position(r,col);bubble(c,e.grid[r][col],p.x,p.y);}
    }
    function add(events) {
      events.forEach(function(event){
        if(event.type!=='pop'&&event.type!=='drop')return;
        var cap=light?36:90;
        event.bubbles.forEach(function(b,i){
          if(effects.length>=cap)return;
          effects.push({x:b.x,y:b.y,color:b.color,age:0,kind:event.type,vx:(i%5-2)*25,vy:-60-(i%3)*18});
        });
      });
    }
    function step(dt) {
      for(var i=effects.length-1;i>=0;i--){var p=effects[i];p.age+=dt;if(p.kind==='drop'){p.vy+=900*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}if(p.age>(p.kind==='pop'?.3:1.2)||p.y>750)effects.splice(i,1);}
    }
    function draw(e,angle) {
      board(e);ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(cache,0,0);ctx.setTransform(ratio,0,0,ratio,0,0);
      if(e.status==='playing'&&!e.shot){
        if(!aim||aimRevision!==e.revision||aimAngle!==angle){aim=e.aimPath(angle);aimRevision=e.revision;aimAngle=angle;}
        ctx.strokeStyle='#ccece38c';ctx.lineWidth=2;ctx.lineCap='round';ctx.setLineDash([2,12]);ctx.beginPath();
        for(var n=0;n<aim.length;n++){if(n)ctx.lineTo(aim[n].x,aim[n].y);else ctx.moveTo(aim[n].x,aim[n].y);}ctx.stroke();ctx.setLineDash([]);
        var last=aim[aim.length-1];if(last){circle(ctx,last.x,last.y,18);ctx.strokeStyle='#e4fff85c';ctx.lineWidth=1;ctx.stroke();}
      }
      effects.forEach(function(p){
        ctx.globalAlpha=Math.max(0,1-p.age/(p.kind==='pop'?.3:1.2));
        if(p.kind==='drop')bubble(ctx,p.color,p.x,p.y);
        else{circle(ctx,p.x,p.y,18+p.age*48);ctx.strokeStyle=colors[p.color];ctx.lineWidth=3*(1-p.age/.3);ctx.stroke();}
      });ctx.globalAlpha=1;
      if(e.shot)bubble(ctx,e.shot.color,e.shot.x,e.shot.y);
      // A fixed base, a rotating barrel and a clearly separated next bubble.
      circle(ctx,250,706,38);ctx.fillStyle='#21475c';ctx.fill();ctx.strokeStyle='#59869a';ctx.lineWidth=2;ctx.stroke();
      ctx.save();ctx.translate(e.launch.x,e.launch.y);ctx.rotate(angle+Math.PI/2);ctx.fillStyle='#426d7f';ctx.strokeStyle='#8cbdc8';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-13,-12);ctx.lineTo(-10,-37);ctx.lineTo(10,-37);ctx.lineTo(13,-12);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
      if(!e.shot)bubble(ctx,e.currentColor,250,694,48);
      circle(ctx,335,697,20);ctx.fillStyle='#24485b';ctx.fill();bubble(ctx,e.nextColor,335,697,32);
      ctx.strokeStyle='#88b8c6';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(309,694);ctx.lineTo(301,697);ctx.lineTo(309,700);ctx.stroke();
    }
    quality(true);
    return {quality:quality,draw:draw,add:add,step:step,clear:function(){effects=[];aim=null;revision=-1;},active:function(){return effects.length>0;},stats:function(){return {boardBuilds:boardBuilds,spriteBuilds:spriteBuilds};}};
  }
  root.BubbleRenderer={create:create};
}(window));
