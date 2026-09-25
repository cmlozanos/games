'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Core = require('../src/core.js');
const source = fs.readFileSync(path.join(__dirname,'../src/core.js'),'utf8');
new vm.Script(source);
const browser = {}; vm.runInNewContext(source,browser);
assert.equal(typeof browser.BubbleCore.create,'function','classic browser export');
assert(source.includes('Copyright (c) 2026 ssrtist'));

function blank() {
    const e=Core.create({seed:'fixture',level:1});
    e.grid=e.grid.map(row=>row.map(()=>null));
    e.currentColor=0; e.nextColor=0;
    return e;
}
function finish(e,angle=-Math.PI/2,fps=60) {
    assert(e.fire(angle));
    for(let i=0;i<fps*12&&e.shot;i++) {
        e.step(1/fps);
        if(e.shot)for(const key of ['x','y','vx','vy'])assert(Number.isFinite(e.shot[key]),'finite projectile '+key);
    }
    assert.equal(e.shot,null,'shot completes');
    return e.consumeEvents();
}
function cells(e) {
    const result=[];
    e.grid.forEach((row,r)=>row.forEach((color,c)=>{if(color!==null)result.push([r,c,color]);}));
    return result;
}
const a=Core.create({seed:'same',level:4}),b=Core.create({seed:'same',level:4});
assert.deepEqual(a.snapshot(),b.snapshot(),'seed/level replay');
assert.notDeepEqual(a.grid,Core.create({seed:'same',level:5}).grid);
assert.equal(a.snapshot().remaining,69);
assert.deepEqual(a.position(0,0),{x:30,y:20});
assert.equal(a.position(1,0).x,50);
for(let r=0;r<a.rows;r++)for(let c=0;c<a.grid[r].length;c++) {
    for(const [nr,nc] of a.neighbors(r,c)) {
        assert(a.neighbors(nr,nc).some(([rr,cc])=>rr===r&&cc===c),'hex adjacency symmetric');
        const p=a.position(r,c),q=a.position(nr,nc);
        assert(Math.abs(Math.hypot(p.x-q.x,p.y-q.y)-40)<1e-6,'hex spacing');
    }
}
const copied=a.snapshot();copied.grid[0][0]=99;assert.notEqual(a.grid[0][0],99,'snapshot detached');

// Pop final three synchronously; fifth-shot ceiling cannot turn this win into loss.
const win=blank();win.grid[0][5]=0;win.grid[0][6]=0;win.shots=4;
const winEvents=finish(win);
assert.equal(win.status,'won');assert.equal(win.score,30);assert.equal(win.ceilingOffset,0);
assert.deepEqual(winEvents.map(event=>event.type),['shot','pop','won']);
assert.equal(winEvents[1].bubbles.length,3);assert.equal(win.snapshot().remaining,0);
assert.equal(win.currentColor,null);assert.equal(win.nextColor,null);
assert.deepEqual(win.consumeEvents(),[],'events drained once');

// Roof group removed BEFORE support traversal: attached green falls immediately.
const drop=blank();drop.grid[0][5]=0;drop.grid[0][6]=0;drop.grid[1][4]=1;
drop.launch.x=450;
const dropEvents=finish(drop,Math.atan2(20-694,270-450));
assert.equal(drop.status,'won');assert.equal(drop.score,50);
assert.deepEqual(dropEvents.map(event=>event.type),['shot','pop','drop','won']);
assert.equal(dropEvents[2].bubbles[0].color,1);

const snap=blank();snap.grid[0][5]=0;snap.grid[0][0]=1;snap.currentColor=1;snap.nextColor=1;
const before=cells(snap);finish(snap);
const added=cells(snap).filter(cell=>!before.some(old=>old[0]===cell[0]&&old[1]===cell[1]));
assert.equal(added.length,1);
assert(snap.neighbors(0,5).some(([r,c])=>r===added[0][0]&&c===added[0][1]),'snap only adjacent');
assert.equal(snap.grid[0][5],0,'never overwrite hit cell');

const full=blank();full.grid=full.grid.map((row,r)=>row.map((_,c)=>(r+c)%2));
const fullBefore=JSON.stringify(full.grid);finish(full);
assert.equal(full.status,'lost');assert.equal(JSON.stringify(full.grid),fullBefore,'full grid never overwritten');

const ceiling=blank();ceiling.grid[0][0]=0;ceiling.grid[0][11]=1;ceiling.currentColor=1;ceiling.shots=4;
const ceilingEvents=finish(ceiling);
assert.equal(ceiling.status,'playing');assert.equal(ceiling.ceilingOffset,ceiling.rowHeight);
assert.equal(ceiling.grid[0][0],0);assert.equal(ceiling.position(0,0).x,30,'ceiling preserves parity');
assert(ceilingEvents.some(event=>event.type==='ceiling'));assert(ceiling.revision>=2);

const lose=blank();for(let r=0;r<lose.rows;r++)lose.grid[r][0]=r%2;
lose.grid[0][11]=2;lose.currentColor=2;lose.shots=4;
finish(lose,Math.atan2(609-694,50-250));
assert.equal(lose.status,'lost','ceiling crossing loses');
assert.equal(lose.ceilingOffset,lose.rowHeight);

const bounced=blank();bounced.grid[0][5]=0;
const aim=bounced.aimPath(-0.4);assert(aim.length>=3,'aim includes wall rebound');
assert.equal(aim[1].x,480);assert.equal(bounced.shots,0,'preview is pure');
assert(bounced.fire(-0.4));for(let i=0;i<24;i++)bounced.step(1/60);
assert(bounced.shot&&bounced.shot.vx<0,'physical wall reflection');
assert(bounced.shot.x>=20&&bounced.shot.x<=480);
assert(!bounced.fire(-1),'no simultaneous shot');

// Extinct next colour is not retained after board resolution.
const extinct=blank();extinct.grid[0][0]=1;extinct.grid[0][5]=0;extinct.grid[0][6]=0;
extinct.nextColor=0;finish(extinct);
assert.equal(extinct.status,'playing');assert.equal(extinct.currentColor,1);assert.equal(extinct.nextColor,1);

// Identical full simulation snapshots at the same elapsed time and after contact.
for(const angle of [-Math.PI/2,-0.11,-0.7,-2.8]) {
    let expected;
    for(const fps of [10,15,30,60,120]) {
        const e=Core.create({seed:'fps',level:3});e.fire(angle);
        const timeline=[];
        for(let i=0;i<fps*10;i++) {
            e.step(1/fps);
            if((i+1)%(fps/5)===0)timeline.push({snapshot:e.snapshot(),events:e.consumeEvents()});
        }
        const result={timeline};
        if(!expected)expected=result;else assert.deepEqual(result,expected,'FPS '+fps+' angle '+angle);
    }
}
const limited=blank();limited.grid[0][5]=0;limited.fire(-Math.PI/2);
assert.equal(limited.step(600),12,'stall work bounded');
const frozen=limited.snapshot();assert.equal(limited.step(0),0);assert.equal(limited.step(NaN),0);
assert.deepEqual(limited.snapshot(),frozen);
assert.equal(Core.clampAngle(Infinity),-Math.PI/2);
assert(Core.clampAngle(2)<0);assert(Core.clampAngle(-10)>-Math.PI);
// Repeated real turns retain grid shape, live colours and roof connectivity.
for(let seed=1;seed<=25;seed++) {
    const e=Core.create({seed,level:seed});
    for(let turn=0;turn<40&&e.status==='playing';turn++) {
        const angle=-0.15-((seed*37+turn*71)%280)/100;
        const events=finish(e,angle,15), snapshot=e.snapshot();
        assert(e.grid.every((row,r)=>row.length===(r%2?11:12)));
        assert(cells(e).every(cell=>Number.isInteger(cell[2])&&cell[2]>=0&&cell[2]<5));
        assert(Number.isFinite(snapshot.score));
        events.filter(event=>event.type==='pop').forEach(event=>assert(event.count>=3));
        if(e.status==='playing') {
            const available=new Set(cells(e).map(cell=>cell[2]));
            assert(available.has(e.currentColor)&&available.has(e.nextColor));
            const visited=new Set(),queue=[];
            e.grid[0].forEach((color,c)=>{if(color!==null){queue.push([0,c]);visited.add('0,'+c);}});
            for(let head=0;head<queue.length;head++)for(const [r,c] of e.neighbors(...queue[head])) {
                const key=r+','+c;
                if(e.grid[r][c]!==null&&!visited.has(key)){visited.add(key);queue.push([r,c]);}
            }
            assert.equal(visited.size,snapshot.remaining,'no orphan remains after completed turn');
        }
    }
}
// Measured winning route for the actual first board; not a proof for every level.
// Angle samples are indexed over [-PI+.1, -.1] in 80 equal intervals.
const firstBoardRoute=[27,47,60,0,27,47,27,23,27,66,13,67,46,16,26,24,39,9,52,62,21,22,
    12,75,75,45,5,18,68,8,65,71,28,58,61,11,54,64,24,4,57,27,47,7,30,70,0,53,0];
for(const fps of [10,60]) {
    const first=Core.create({seed:'burbujas',level:1});
    for(const sample of firstBoardRoute)finish(first,-Math.PI+.1+sample*(Math.PI-.2)/80,fps);
    assert.equal(first.status,'won','actual first level route @ '+fps+' FPS');
    assert.equal(first.shots,49);assert.equal(first.score,1300);assert.equal(first.snapshot().remaining,0);
}
console.log('PASS Burbujas: UMD/MIT, deterministic levels, hex grid, continuous collision, adjacent/full snap, groups, immediate floating/win, ceiling/loss, bounce/aim, live colours, 10–120FPS and bounded ticks');
