/*
 * Adapted from muan/emoji-minesweeper, game.js.
 * Copyright (c) 2019 Mu-An Chiou. MIT License; see ../LICENSE and ../THIRD_PARTY.md.
 * Upstream: 2187e371e9a0f87cf54a207031760fc33b858a9a.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.MinesCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var randomSources = new WeakMap();

    function create(rows, cols, mineCount, random) {
        var size = rows * cols;
        if (!Number.isSafeInteger(rows) || rows < 1 ||
            !Number.isSafeInteger(cols) || cols < 1 ||
            !Number.isSafeInteger(size) || size > 4294967295) {
            throw new RangeError('Rows and columns must be positive integers with a valid array size.');
        }
        // Every possible first cell must have enough space for its safe neighbourhood.
        var capacity = size - Math.min(rows, 3) * Math.min(cols, 3);
        if (!Number.isSafeInteger(mineCount) || mineCount < 0 || mineCount > capacity) {
            throw new RangeError('Mine count must leave the first cell and its neighbours safe.');
        }
        if (random === undefined) random = Math.random;
        if (typeof random !== 'function') throw new TypeError('Random must be a function.');
        var cells = new Array(size);
        for (var index = 0; index < size; index++) {
            cells[index] = { mine: false, adjacent: 0, revealed: false, flagged: false };
        }
        var board = {
            rows: rows,
            cols: cols,
            mineCount: mineCount,
            cells: cells,
            status: 'ready',
            flags: 0,
            revealedCount: 0,
            explodedIndex: -1
        };
        randomSources.set(board, random);
        return board;
    }

    function validIndex(board, index) {
        if (!randomSources.has(board)) throw new TypeError('Board must be created by MinesCore.create.');
        return Number.isInteger(index) && index >= 0 && index < board.cells.length;
    }

    function neighbours(board, index) {
        if (!validIndex(board, index)) return [];
        var row = Math.floor(index / board.cols), col = index % board.cols;
        var result = [];
        for (var y = Math.max(0, row - 1); y <= Math.min(board.rows - 1, row + 1); y++) {
            for (var x = Math.max(0, col - 1); x <= Math.min(board.cols - 1, col + 1); x++) {
                var other = y * board.cols + x;
                if (other !== index) result.push(other);
            }
        }
        return result;
    }

    // Fisher-Yates loop adapted from Game.prototype.shuffle in the MIT source.
    function shuffle(array, random) {
        var currentIndex = array.length, temporaryValue, randomIndex;
        while (currentIndex !== 0) {
            var sample = random();
            if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
                throw new RangeError('Random must return a finite number in [0, 1).');
            }
            randomIndex = Math.floor(sample * currentIndex);
            currentIndex -= 1;
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }
        return array;
    }

    function placeMines(board, first) {
        var protectedCells = neighbours(board, first);
        protectedCells.push(first);
        var candidates = [];
        for (var index = 0; index < board.cells.length; index++) {
            if (protectedCells.indexOf(index) === -1) candidates.push(index);
        }
        // Placement is bounded and does not retry boards or depend on player flags.
        shuffle(candidates, randomSources.get(board));
        for (var mine = 0; mine < board.mineCount; mine++) board.cells[candidates[mine]].mine = true;
        for (var cell = 0; cell < board.cells.length; cell++) {
            var adjacent = neighbours(board, cell);
            for (var n = 0; n < adjacent.length; n++) {
                if (board.cells[adjacent[n]].mine) board.cells[cell].adjacent++;
            }
        }
        board.status = 'playing';
    }

    function reveal(board, index) {
        if (!validIndex(board, index) || board.status === 'won' || board.status === 'lost') return false;
        var cell = board.cells[index];
        if (cell.revealed || cell.flagged) return false;
        if (board.status === 'ready') placeMines(board, index);
        if (cell.mine) {
            cell.revealed = true;
            board.revealedCount++;
            board.explodedIndex = index;
            board.status = 'lost';
            return true;
        }

        // Iterative adaptation of revealNeighbors: visit each unflagged safe cell once.
        var pending = [index];
        while (pending.length) {
            var next = pending.pop(), target = board.cells[next];
            if (target.revealed || target.flagged || target.mine) continue;
            target.revealed = true;
            board.revealedCount++;
            if (target.adjacent === 0) {
                var adjacent = neighbours(board, next);
                for (var n = 0; n < adjacent.length; n++) pending.push(adjacent[n]);
            }
        }
        // As in the upstream game(), flags alone never satisfy the win condition.
        if (board.revealedCount === board.cells.length - board.mineCount) board.status = 'won';
        return true;
    }

    function toggleFlag(board, index) {
        if (!validIndex(board, index) || board.status === 'won' || board.status === 'lost') return false;
        var cell = board.cells[index];
        if (cell.revealed) return false;
        cell.flagged = !cell.flagged;
        board.flags += cell.flagged ? 1 : -1;
        return true;
    }

    return { create: create, reveal: reveal, toggleFlag: toggleFlag, neighbours: neighbours };
}));
