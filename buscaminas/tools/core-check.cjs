'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Core = require('../src/core.js');

const source = fs.readFileSync(path.join(__dirname, '../src/core.js'), 'utf8');
const browser = {};
vm.runInNewContext(source, browser);
assert.equal(typeof browser.MinesCore.create, 'function', 'classic browser export');
assert(source.includes('Copyright (c) 2019 Mu-An Chiou'));
assert.deepEqual(Object.keys(Core).sort(), ['create', 'neighbours', 'reveal', 'toggleFlag']);

function random(seed) {
    return function () {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
    };
}

// Independent reference, including rectangular boards and one-cell dimensions.
function around(rows, cols, index) {
    const result = [];
    const row = Math.floor(index / cols), col = index % cols;
    for (let other = 0; other < rows * cols; other++) {
        const dr = Math.abs(Math.floor(other / cols) - row);
        const dc = Math.abs(other % cols - col);
        if (other !== index && dr <= 1 && dc <= 1) result.push(other);
    }
    return result;
}

function check(board) {
    assert.equal(board.cells.length, board.rows * board.cols);
    assert.equal(board.cells.filter(cell => cell.mine).length,
        board.status === 'ready' ? 0 : board.mineCount);
    assert.equal(board.flags, board.cells.filter(cell => cell.flagged).length);
    assert.equal(board.revealedCount, board.cells.filter(cell => cell.revealed).length);
    for (let index = 0; index < board.cells.length; index++) {
        const neighbours = around(board.rows, board.cols, index);
        assert.deepEqual(Core.neighbours(board, index), neighbours);
        assert.equal(board.cells[index].adjacent,
            neighbours.filter(other => board.cells[other].mine).length);
        assert(!(board.cells[index].flagged && board.cells[index].revealed));
    }
}

function frozen(board) {
    const before = JSON.stringify(board);
    for (let index = 0; index < board.cells.length; index++) {
        assert.equal(Core.reveal(board, index), false);
        assert.equal(Core.toggleFlag(board, index), false);
    }
    assert.equal(JSON.stringify(board), before, 'terminal board immutable through actions');
}

// No placement or random calls on flags, invalid indexes or a flagged reveal.
let calls = 0;
const waiting = Core.create(6, 6, 5, () => { calls++; return 0.5; });
assert.equal(waiting.status, 'ready');
assert.equal(waiting.explodedIndex, -1);
assert(Core.toggleFlag(waiting, 14));
assert.equal(Core.reveal(waiting, 14), false);
for (const bad of [-1, 36, 0.5, NaN, Infinity, '0', null, undefined]) {
    const before = JSON.stringify(waiting);
    assert.equal(Core.reveal(waiting, bad), false);
    assert.equal(Core.toggleFlag(waiting, bad), false);
    assert.deepEqual(Core.neighbours(waiting, bad), []);
    assert.equal(JSON.stringify(waiting), before);
}
assert.equal(calls, 0);
check(waiting);
assert(Core.toggleFlag(waiting, 14));
assert(Core.reveal(waiting, 14));
assert(calls > 0);
const callsAfterPlacement = calls;
assert.equal(Core.reveal(waiting, 14), false, 'repeated reveal does not change the board');
assert.equal(calls, callsAfterPlacement);
assert.equal(Core.toggleFlag(waiting, 14), false, 'revealed cell cannot be flagged');

// Flags do not alter mine placement or cause a false win. Even a safe flag stays hidden.
const flagged = Core.create(6, 6, 5, random(7));
const plain = Core.create(6, 6, 5, random(7));
Core.toggleFlag(flagged, 1);
Core.reveal(flagged, 0);
Core.reveal(plain, 0);
assert.deepEqual(flagged.cells.map(cell => cell.mine), plain.cells.map(cell => cell.mine));
assert.equal(flagged.cells[1].mine, false);
assert.equal(flagged.cells[1].flagged, true);
assert.equal(flagged.cells[1].revealed, false);
for (let index = 0; index < flagged.cells.length; index++) {
    if (!flagged.cells[index].mine) Core.reveal(flagged, index);
}
assert.equal(flagged.status, 'playing', 'a flagged safe cell prevents victory');
Core.toggleFlag(flagged, 1);
Core.reveal(flagged, 1);
assert.equal(flagged.status, 'won');
check(flagged);
frozen(flagged);

const allFlags = Core.create(6, 6, 5, random(8));
for (let index = 0; index < allFlags.cells.length; index++) Core.toggleFlag(allFlags, index);
assert.equal(allFlags.flags, 36);
assert.equal(allFlags.status, 'ready', 'flags alone never win or place mines');
assert.equal(Core.reveal(allFlags, 0), false);

let boards = 0, wins = 0, losses = 0;
for (const [rows, cols, mines] of [[6, 6, 5], [8, 8, 10], [5, 9, 7], [9, 5, 7]]) {
    for (let seed = 1; seed <= 1000; seed++) {
        const board = Core.create(rows, cols, mines, random(seed));
        const first = seed % board.cells.length;
        assert(Core.reveal(board, first));
        const protectedCells = [first, ...around(rows, cols, first)];
        for (const index of protectedCells) {
            assert.equal(board.cells[index].mine, false, 'first cell and neighbours safe');
            assert.equal(board.cells[index].revealed, true, 'initial clear area opens');
        }
        assert.equal(board.cells[first].adjacent, 0);
        check(board);
        const replay = Core.create(rows, cols, mines, random(seed));
        Core.reveal(replay, first);
        assert.deepEqual(board, replay, 'seeded first move deterministic');
        if (seed % 2 && board.status === 'playing') {
            const mine = board.cells.findIndex(cell => cell.mine);
            Core.toggleFlag(board, mine);
            assert.equal(Core.reveal(board, mine), false);
            Core.toggleFlag(board, mine);
            assert(Core.reveal(board, mine));
            assert.equal(board.status, 'lost');
            assert.equal(board.explodedIndex, mine);
            assert.equal(board.cells[mine].revealed, true);
            losses++;
        } else {
            for (let index = 0; index < board.cells.length; index++) {
                if (!board.cells[index].mine) Core.reveal(board, index);
            }
            assert.equal(board.status, 'won');
            assert.equal(board.revealedCount, rows * cols - mines);
            assert.equal(board.explodedIndex, -1);
            wins++;
        }
        check(board);
        frozen(board);
        boards++;
    }
}

// Largest allowed density still guarantees an empty first neighbourhood without retries.
for (const [rows, cols] of [[1, 1], [1, 5], [5, 1], [2, 7], [7, 2], [4, 4]]) {
    const mines = rows * cols - Math.min(rows, 3) * Math.min(cols, 3);
    for (let first = 0; first < rows * cols; first++) {
        const board = Core.create(rows, cols, mines, () => 0);
        Core.reveal(board, first);
        check(board);
        assert.equal(board.cells[first].adjacent, 0);
    }
}
const long = Core.create(1, 20000, 0, random(1));
Core.reveal(long, 10000);
assert.equal(long.status, 'won', '20,000-cell flood is iterative, not recursive');
assert.equal(long.revealedCount, 20000);

for (const args of [
    [0, 6, 1], [-1, 6, 1], [6, 0, 1], [1.5, 6, 1], ['6', 6, 1],
    [NaN, 6, 1], [Infinity, 6, 1], [6, 6, -1], [6, 6, 1.2],
    [6, 6, NaN], [6, 6, Infinity], [6, 6, '5'], [3, 3, 1], [6, 6, 28],
    [Number.MAX_SAFE_INTEGER, 2, 1], [6, 6, 5, null], [6, 6, 5, 1]
]) assert.throws(() => Core.create(...args), { name: /^(TypeError|RangeError)$/ });
for (const result of [-0.01, 1, NaN, Infinity, '0.5']) {
    const board = Core.create(6, 6, 5, () => result);
    const before = JSON.stringify(board);
    assert.throws(() => Core.reveal(board, 0), RangeError);
    assert.equal(JSON.stringify(board), before, 'invalid RNG leaves board untouched');
}
let lateCalls = 0;
const lateInvalid = Core.create(6, 6, 5, () => ++lateCalls < 8 ? 0.25 : NaN);
const beforeLateInvalid = JSON.stringify(lateInvalid);
assert.throws(() => Core.reveal(lateInvalid, 14), RangeError);
assert.equal(lateCalls, 8);
assert.equal(JSON.stringify(lateInvalid), beforeLateInvalid, 'partially shuffled candidates never leak');
for (const action of [Core.reveal, Core.toggleFlag, Core.neighbours]) {
    assert.throws(() => action(null, 0), TypeError);
    assert.throws(() => action({}, 0), TypeError);
}
assert.equal(Core.create(6, 6, 5).status, 'ready', 'default Math.random');
console.log('PASS Buscaminas: UMD/MIT, ' + boards + ' deterministic boards (' + wins +
    ' wins, ' + losses + ' losses), both profiles/rectangles, 3x3 first safety, counts,' +
    ' neighbours, iterative flood, flags, terminal lock and invalid inputs.');
