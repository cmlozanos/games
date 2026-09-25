/*
 * Burbujas: deterministic, DOM-free adaptation of ssrtist/bubble-shooter.
 * Source: https://github.com/ssrtist/bubble-shooter/tree/c479d9fb3dd3cc427e41c814b35337afa2b859d0
 * Hex neighbours, colour traversal and roof connectivity adapted from script.js.
 *
 * MIT License
 * Copyright (c) 2026 ssrtist
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
(function (root, factory) {
    'use strict';
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.BubbleCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';
    var RADIUS = 20, ROW_HEIGHT = RADIUS * Math.sqrt(3), SPEED = 720;
    var TICK = 1 / 60, EPS = 0.0000001;
    var DIRECTIONS = [
        [[0,-1],[0,1],[-1,-1],[-1,0],[1,-1],[1,0]],
        [[0,-1],[0,1],[-1,0],[-1,1],[1,0],[1,1]]
    ];

    function clampAngle(angle) {
        if (typeof angle !== 'number' || !isFinite(angle)) return -Math.PI / 2;
        return Math.max(-Math.PI + 0.1, Math.min(-0.1, angle));
    }

    // grid[r][c] = null or colour ID 0..4; no animation nodes enter the grid.
    // position(): even rows x=30+40c, odd rows x=50+40c; y=20+sqrt(3)*20r+ceiling.
    // UI calls step(seconds), never advances while paused, and drains events.
    function create(options) {
        options = options || {};
        var seed = options.seed === undefined ? 1 : options.seed;
        var level = Math.max(1, Math.floor(Number(options.level) || 1));
        var text = String(seed) + ':' + level, rng = 2166136261;
        for (var h = 0; h < text.length; h++) rng = Math.imul(rng ^ text.charCodeAt(h), 16777619) >>> 0;
        if (!rng) rng = 1;
        var accumulator = 0, events = [];
        var e = {
            width:500, height:724, radius:RADIUS, rowHeight:ROW_HEIGHT, cols:12, rows:18,
            launch:{x:250,y:694}, loseLine:634, ceilingEvery:5, ceilingOffset:0,
            seed:seed, level:level, grid:[], status:'playing', score:0, shots:0,
            currentColor:null, nextColor:null, shot:null, revision:0
        };

        function random() {
            rng ^= rng << 13; rng ^= rng >>> 17; rng ^= rng << 5;
            return (rng >>> 0) / 4294967296;
        }
        function valid(r, c) { return r >= 0 && r < e.rows && c >= 0 && c < e.grid[r].length; }
        function position(r, c) {
            return {x:30 + c * 40 + (r % 2 ? 20 : 0), y:20 + r * ROW_HEIGHT + e.ceilingOffset};
        }
        function neighbors(r, c) {
            var result = [], directions = DIRECTIONS[r % 2];
            for (var i = 0; i < directions.length; i++) {
                var nr = r + directions[i][0], nc = c + directions[i][1];
                if (valid(nr,nc)) result.push([nr,nc]);
            }
            return result;
        }
        function colors() {
            var found = [], present = {};
            for (var r = 0; r < e.rows; r++) for (var c = 0; c < e.grid[r].length; c++) {
                var color = e.grid[r][c];
                if (color !== null && !present[color]) { present[color] = true; found.push(color); }
            }
            return found.sort();
        }
        function chooseColor() {
            var available = colors();
            return available.length ? available[Math.floor(random() * available.length)] : null;
        }
        function count() {
            var total = 0;
            for (var r = 0; r < e.rows; r++) for (var c = 0; c < e.grid[r].length; c++) {
                if (e.grid[r][c] !== null) total++;
            }
            return total;
        }
        function emit(type, bubbles) {
            events.push({type:type, bubbles:bubbles || [], count:(bubbles || []).length,
                score:e.score, shots:e.shots, offset:e.ceilingOffset});
        }
        function end(status) {
            if (e.status !== 'playing') return;
            e.status = status; e.shot = null;
            emit(status);
        }
        // Iterative traversal avoids recursion and ignores already removed bubbles.
        function matches(r, c) {
            var target = e.grid[r][c], queue = [[r,c]], visited = {}, result = [];
            visited[r + ',' + c] = true;
            for (var head = 0; head < queue.length; head++) {
                var cell = queue[head]; result.push(cell);
                var adjacent = neighbors(cell[0],cell[1]);
                for (var i = 0; i < adjacent.length; i++) {
                    var n = adjacent[i], key = n[0] + ',' + n[1];
                    if (!visited[key] && e.grid[n[0]][n[1]] === target) {
                        visited[key] = true; queue.push(n);
                    }
                }
            }
            return result;
        }
        function remove(cells) {
            var removed = [];
            for (var i = 0; i < cells.length; i++) {
                var r = cells[i][0], c = cells[i][1], point = position(r,c);
                removed.push({x:point.x,y:point.y,color:e.grid[r][c]});
                e.grid[r][c] = null;
            }
            if (removed.length) e.revision++;
            return removed;
        }
        function floating() {
            var visited = {}, queue = [], result = [];
            for (var c = 0; c < e.grid[0].length; c++) if (e.grid[0][c] !== null) {
                queue.push([0,c]); visited['0,' + c] = true;
            }
            for (var head = 0; head < queue.length; head++) {
                var adjacent = neighbors(queue[head][0],queue[head][1]);
                for (var i = 0; i < adjacent.length; i++) {
                    var n = adjacent[i], key = n[0] + ',' + n[1];
                    if (!visited[key] && e.grid[n[0]][n[1]] !== null) {
                        visited[key] = true; queue.push(n);
                    }
                }
            }
            for (var r = 0; r < e.rows; r++) for (c = 0; c < e.grid[r].length; c++) {
                if (e.grid[r][c] !== null && !visited[r + ',' + c]) result.push([r,c]);
            }
            return result;
        }
        function crossedLine() {
            for (var r = 0; r < e.rows; r++) for (var c = 0; c < e.grid[r].length; c++) {
                if (e.grid[r][c] !== null && position(r,c).y + RADIUS >= e.loseLine) return true;
            }
            return false;
        }
        function settle(cell, color) {
            if (!cell || e.grid[cell[0]][cell[1]] !== null) { end('lost'); return; }
            var r = cell[0], c = cell[1];
            e.grid[r][c] = color; e.revision++;
            var group = matches(r,c);
            if (group.length >= 3) {
                var popped = remove(group); e.score += popped.length * 10; emit('pop',popped);
            }
            var dropped = remove(floating());
            if (dropped.length) { e.score += dropped.length * 20; emit('drop',dropped); }
            e.shot = null;
            // Resolve the board synchronously: animation cannot delay victory/support.
            if (!count()) { e.currentColor = null; e.nextColor = null; end('won'); return; }
            if (e.shots % e.ceilingEvery === 0) {
                e.ceilingOffset += ROW_HEIGHT; e.revision++; emit('ceiling');
            }
            if (crossedLine()) { end('lost'); return; }
            var available = colors();
            e.currentColor = available.indexOf(e.nextColor) >= 0 ? e.nextColor : chooseColor();
            e.nextColor = chooseColor();
        }

        // Earliest swept circle contact. Direction is normalized; t is distance.
        function collision(x, y, dx, dy, limit) {
            var hit = null, best = limit + EPS;
            function candidate(t, type, r, c) {
                if (t >= -EPS && t < best && t <= limit + EPS) {
                    best = Math.max(0,t); hit = {distance:best,type:type,r:r,c:c};
                }
            }
            if (dx < -EPS) candidate((RADIUS-x)/dx,'wall');
            if (dx > EPS) candidate((e.width-RADIUS-x)/dx,'wall');
            if (dy < -EPS) candidate((e.ceilingOffset+RADIUS-y)/dy,'top');
            for (var r = 0; r < e.rows; r++) for (var c = 0; c < e.grid[r].length; c++) {
                if (e.grid[r][c] === null) continue;
                var p = position(r,c), ox = x-p.x, oy = y-p.y;
                var along = ox*dx + oy*dy, square = ox*ox + oy*oy - 4*RADIUS*RADIUS;
                var discriminant = along*along - square;
                if (discriminant >= 0 && along < 0) {
                    candidate(square <= 0 ? 0 : -along-Math.sqrt(discriminant),'bubble',r,c);
                }
            }
            return hit;
        }
        function snap(hit, x, y) {
            var candidates = [], best = null, distance = Infinity, center;
            if (hit.type === 'top') {
                for (var c = 0; c < e.grid[0].length; c++) candidates.push([0,c]);
            } else { candidates = neighbors(hit.r,hit.c); center = position(hit.r,hit.c); }
            for (var i = 0; i < candidates.length; i++) {
                var cell = candidates[i];
                if (e.grid[cell[0]][cell[1]] !== null) continue;
                var p = position(cell[0],cell[1]), dx = p.x-x, dy = p.y-y;
                // Do not transport a projectile through its impacted bubble to the rear.
                if (center && (p.x-center.x)*(x-center.x)+(p.y-center.y)*(y-center.y) < -EPS) continue;
                if (!center && Math.abs(dx) > RADIUS + EPS) continue;
                var d = dx*dx+dy*dy;
                if (d < distance) { distance = d; best = cell; }
            }
            return best;
        }
        function fire(angle) {
            if (e.status !== 'playing' || e.shot) return false;
            if (colors().indexOf(e.currentColor) < 0) e.currentColor = chooseColor();
            if (e.currentColor === null) { end('won'); return false; }
            angle = clampAngle(angle);
            e.shot = {x:e.launch.x,y:e.launch.y,vx:Math.cos(angle)*SPEED,vy:Math.sin(angle)*SPEED,color:e.currentColor};
            e.shots++; emit('shot',[{x:e.shot.x,y:e.shot.y,color:e.shot.color}]);
            return true;
        }
        function tick() {
            if (!e.shot || e.status !== 'playing') return;
            var remaining = SPEED*TICK;
            // At 720px/s one tick is 12px: at most one wall normally; guard is bounded.
            for (var bounce = 0; bounce < 4 && remaining > EPS && e.shot; bounce++) {
                var shot = e.shot, dx = shot.vx/SPEED, dy = shot.vy/SPEED;
                var hit = collision(shot.x,shot.y,dx,dy,remaining);
                var travel = hit ? hit.distance : remaining;
                shot.x += dx*travel; shot.y += dy*travel; remaining -= travel;
                if (!hit) break;
                if (hit.type === 'wall') shot.vx *= -1;
                else { settle(snap(hit,shot.x,shot.y),shot.color); break; }
            }
        }
        function step(dt) {
            if (typeof dt !== 'number' || !isFinite(dt) || dt <= 0 || e.status !== 'playing') return 0;
            accumulator += Math.min(dt,TICK*12);
            var ticks = 0;
            while (accumulator + EPS >= TICK && ticks < 12 && e.status === 'playing') {
                accumulator -= TICK; ticks++; tick();
            }
            return ticks;
        }
        function aimPath(angle) {
            angle = clampAngle(angle);
            var x=e.launch.x, y=e.launch.y, dx=Math.cos(angle), dy=Math.sin(angle);
            var path=[{x:x,y:y}];
            for (var bounce=0; bounce<20; bounce++) {
                var hit=collision(x,y,dx,dy,10000);
                if (!hit) break;
                x+=dx*hit.distance; y+=dy*hit.distance;
                path.push({x:x,y:y});
                if(hit.type!=='wall') break;
                dx=-dx;
            }
            return path;
        }
        function snapshot() {
            return {width:e.width,height:e.height,radius:RADIUS,rowHeight:ROW_HEIGHT,cols:e.cols,rows:e.rows,
                launch:{x:e.launch.x,y:e.launch.y},loseLine:e.loseLine,ceilingOffset:e.ceilingOffset,
                ceilingEvery:e.ceilingEvery,seed:seed,level:level,status:e.status,score:e.score,shots:e.shots,
                currentColor:e.currentColor,nextColor:e.nextColor,revision:e.revision,remaining:count(),
                shot:e.shot ? {x:e.shot.x,y:e.shot.y,vx:e.shot.vx,vy:e.shot.vy,color:e.shot.color} : null,
                grid:e.grid.map(function(row){return row.slice();})};
        }
        for (var r=0;r<e.rows;r++) {
            var row=[];
            for(var c=0;c<(r%2?11:12);c++) row.push(r<6?Math.floor(random()*5):null);
            e.grid.push(row);
        }
        e.currentColor=chooseColor(); e.nextColor=chooseColor();
        e.fire=fire; e.step=step; e.position=position; e.neighbors=neighbors;
        e.aimPath=aimPath; e.snapshot=snapshot;
        e.consumeEvents=function(){var pending=events;events=[];return pending;};
        return e;
    }
    return {create:create,clampAngle:clampAngle};
}));
