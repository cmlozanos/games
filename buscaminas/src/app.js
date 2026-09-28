(function () {
  'use strict';

  var core = window.MinesCore;
  var boardElement = document.getElementById('board');
  var status = document.getElementById('status');
  var game = document.getElementById('game');
  var revealMode = document.getElementById('reveal-mode');
  var flagMode = document.getElementById('flag-mode');
  var easy = document.getElementById('easy');
  var advanced = document.getElementById('advanced');
  var restart = document.getElementById('restart');
  var sound = document.getElementById('sound');
  var result = document.getElementById('result');
  var retry = document.getElementById('retry');
  var next = document.getElementById('next');
  var controls = [revealMode, flagMode, easy, advanced, restart, sound, retry, next];
  var board, buttons = [], activeIndex = 0, mode = 'reveal';
  var gate = null, locked = true, gateFailed = false;
  var soundEnabled = false, audioContext = null, voices = [];
  var soundGeneration = 0;

  if (!core) {
    status.textContent = 'No se ha podido cargar el juego. Recarga la página.';
    return;
  }

  function icon(name) {
    return '<svg aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  }

  function stopSound() {
    soundGeneration++;
    voices.forEach(function (voice) {
      try { voice.stop(); } catch (ignore) {}
    });
    voices = [];
    if (audioContext && audioContext.state === 'running') audioContext.suspend().catch(function () {});
  }

  function playSound(kind) {
    if (!soundEnabled || locked || document.hidden || !audioContext) return;
    var generation = soundGeneration;
    audioContext.resume().then(function () {
      if (generation !== soundGeneration || !soundEnabled || locked || document.hidden) return;
      var notes = kind === 'won' ? [523.25, 659.25, 783.99] : kind === 'lost' ? [261.63, 220] : kind === 'flag' ? [440] : [587.33];
      notes.forEach(function (frequency, index) {
        var oscillator = audioContext.createOscillator();
        var gain = audioContext.createGain();
        var start = audioContext.currentTime + index * 0.09;
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.045, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.1);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        voices.push(oscillator);
        oscillator.onended = function () {
          oscillator.disconnect();
          gain.disconnect();
          var position = voices.indexOf(oscillator);
          if (position !== -1) voices.splice(position, 1);
        };
        oscillator.start(start);
        oscillator.stop(start + 0.11);
      });
    }).catch(function () {});
  }

  function canUseGame() {
    if (!gate || gateFailed || document.hidden) return false;
    gate.check();
    return !locked && !gate.isLocked();
  }

  function finished() { return board.status === 'won' || board.status === 'lost'; }

  function labelFor(cell, index) {
    var label = 'Fila ' + (Math.floor(index / board.cols) + 1) + ', columna ' + (index % board.cols + 1) + '. ';
    if (cell.flagged) return label + (board.status === 'lost' && !cell.mine ? 'Bandera incorrecta.' : 'Bandera.');
    if (cell.mine && (cell.revealed || board.status === 'lost')) return label + 'Mina.';
    if (!cell.revealed) return label + 'Sin descubrir.';
    if (!cell.adjacent) return label + 'Vacía. No hay minas alrededor.';
    return label + cell.adjacent + (cell.adjacent === 1 ? ' mina alrededor.' : ' minas alrededor.');
  }

  function render() {
    var terminal = finished();
    game.setAttribute('data-status', board.status);
    game.setAttribute('data-mode', mode);
    game.setAttribute('data-locked', String(locked));
    boardElement.setAttribute('aria-label', 'Tablero de ' + board.rows + ' por ' + board.cols + ', ' + board.mineCount + ' minas');
    controls.forEach(function (control) { control.disabled = locked; });
    revealMode.disabled = locked || terminal;
    flagMode.disabled = locked || terminal;
    revealMode.setAttribute('aria-pressed', String(mode === 'reveal'));
    flagMode.setAttribute('aria-pressed', String(mode === 'flag'));
    easy.setAttribute('aria-pressed', String(board.rows === 6));
    advanced.setAttribute('aria-pressed', String(board.rows === 8));
    sound.setAttribute('aria-pressed', String(soundEnabled));
    sound.setAttribute('aria-label', soundEnabled ? 'Desactivar sonido' : 'Activar sonido');
    sound.title = soundEnabled ? 'Desactivar sonido' : 'Activar sonido';
    sound.classList.toggle('sound-off', !soundEnabled);

    var safeRevealed = 0;
    board.cells.forEach(function (cell, index) {
      var button = buttons[index];
      var showMine = cell.mine && (cell.revealed || board.status === 'lost') && !cell.flagged;
      if (cell.revealed && !cell.mine) safeRevealed++;
      button.className = 'cell';
      button.classList.toggle('is-revealed', cell.revealed);
      button.classList.toggle('is-empty', cell.revealed && !cell.mine && !cell.adjacent);
      button.classList.toggle('is-flagged', cell.flagged);
      button.classList.toggle('is-mine', showMine);
      button.classList.toggle('is-exploded', board.explodedIndex === index);
      button.classList.toggle('is-wrong', board.status === 'lost' && cell.flagged && !cell.mine);
      button.disabled = locked;
      button.setAttribute('aria-disabled', String(locked || terminal || cell.revealed || (mode === 'reveal' && cell.flagged)));
      button.setAttribute('aria-label', labelFor(cell, index));
      button.tabIndex = index === activeIndex ? 0 : -1;
      if (cell.revealed && !cell.mine && cell.adjacent) {
        button.setAttribute('data-number', String(cell.adjacent));
        button.textContent = String(cell.adjacent);
      } else {
        button.removeAttribute('data-number');
        button.innerHTML = cell.flagged ? icon('flag') : showMine ? icon('mine') : '';
      }
    });

    var remaining = board.rows * board.cols - board.mineCount - safeRevealed;
    document.getElementById('flag-count').textContent = board.flags + ' / ' + board.mineCount;
    document.getElementById('flag-metric').setAttribute('aria-label', board.flags + ' banderas de ' + board.mineCount + ' minas');
    document.getElementById('safe-count').textContent = String(remaining);
    document.getElementById('safe-metric').setAttribute('aria-label', remaining + ' casillas seguras por descubrir');

    result.hidden = !terminal;
    result.classList.toggle('is-loss', board.status === 'lost');
    next.hidden = board.status !== 'won' || board.rows !== 6;
    if (terminal) {
      document.getElementById('result-title').textContent = board.status === 'won' ? '¡Muy bien!' : '¡Vamos otra vez!';
      document.querySelector('#result-icon use').setAttribute('href', board.status === 'won' ? '#i-star' : '#i-restart');
    }
    status.textContent = gateFailed ? 'No se ha podido cargar el reto. Recarga la página.' : locked ? 'Resuelve el reto para jugar.' :
      board.status === 'won' ? '¡Encontraste todas las casillas seguras!' : board.status === 'lost' ? 'Había una mina. ¡Prueba de nuevo!' :
      mode === 'flag' ? 'Toca para poner o quitar una bandera.' : board.status === 'ready' ? 'Tu primer toque es seguro.' : 'Busca las casillas sin minas.';
  }

  function newBoard(size) {
    stopSound();
    board = core.create(size, size, size === 6 ? 5 : 10);
    mode = 'reveal';
    activeIndex = 0;
    buttons = [];
    boardElement.textContent = '';
    boardElement.style.setProperty('--columns', String(size));
    boardElement.setAttribute('aria-rowcount', String(size));
    boardElement.setAttribute('aria-colcount', String(size));
    for (var row = 0; row < size; row++) {
      var rowElement = document.createElement('div');
      rowElement.className = 'board-row';
      rowElement.setAttribute('role', 'row');
      for (var col = 0; col < size; col++) {
        var button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('role', 'gridcell');
        button.setAttribute('data-cell', String(row * size + col));
        button.setAttribute('aria-rowindex', String(row + 1));
        button.setAttribute('aria-colindex', String(col + 1));
        rowElement.appendChild(button);
        buttons.push(button);
      }
      boardElement.appendChild(rowElement);
    }
    document.getElementById('board-frame').scrollLeft = 0;
    render();
  }

  function chooseMode(value) {
    if (!canUseGame() || finished()) return;
    mode = value;
    render();
  }

  function activate(index) {
    if (!canUseGame() || finished()) return;
    activeIndex = index;
    var changed = mode === 'flag' ? core.toggleFlag(board, index) : core.reveal(board, index);
    if (!changed) return;
    render();
    playSound(finished() ? board.status : mode);
  }

  boardElement.addEventListener('click', function (event) {
    var button = event.target.closest('[data-cell]');
    if (button && boardElement.contains(button)) activate(Number(button.getAttribute('data-cell')));
  });
  boardElement.addEventListener('focusin', function (event) {
    var button = event.target.closest('[data-cell]');
    if (!button) return;
    activeIndex = Number(button.getAttribute('data-cell'));
    buttons.forEach(function (cell, index) { cell.tabIndex = index === activeIndex ? 0 : -1; });
  });
  boardElement.addEventListener('keydown', function (event) {
    if (!canUseGame()) return;
    var row = Math.floor(activeIndex / board.cols), col = activeIndex % board.cols;
    if (event.key === 'ArrowLeft') col = Math.max(0, col - 1);
    else if (event.key === 'ArrowRight') col = Math.min(board.cols - 1, col + 1);
    else if (event.key === 'ArrowUp') row = Math.max(0, row - 1);
    else if (event.key === 'ArrowDown') row = Math.min(board.rows - 1, row + 1);
    else return;
    event.preventDefault();
    activeIndex = row * board.cols + col;
    buttons[activeIndex].focus();
  });
  game.addEventListener('keydown', function (event) {
    if (event.key.toLowerCase() !== 'f' || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    if (event.target.matches('input, textarea, select, [contenteditable]')) return;
    event.preventDefault();
    chooseMode(mode === 'reveal' ? 'flag' : 'reveal');
  });
  var lastTouch = -Infinity;
  function rememberTouch(event) {
    if (event.type === 'touchstart' || event.pointerType === 'touch') lastTouch = Date.now();
  }
  document.addEventListener('pointerdown', rememberTouch, { passive: true });
  document.addEventListener('touchstart', rememberTouch, { passive: true });
  document.addEventListener('contextmenu', function (event) {
    var editable = event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])');
    if (!editable && (event.pointerType === 'touch' || Date.now() - lastTouch < 2000)) event.preventDefault();
  });

  revealMode.addEventListener('click', function () { chooseMode('reveal'); });
  flagMode.addEventListener('click', function () { chooseMode('flag'); });
  easy.addEventListener('click', function () { if (canUseGame() && board.rows !== 6) newBoard(6); });
  advanced.addEventListener('click', function () { if (canUseGame() && board.rows !== 8) newBoard(8); });
  restart.addEventListener('click', function () { if (canUseGame()) newBoard(board.rows); });
  retry.addEventListener('click', function () {
    if (!canUseGame()) return;
    newBoard(board.rows);
    buttons[0].focus();
  });
  next.addEventListener('click', function () {
    if (!canUseGame() || board.status !== 'won' || board.rows !== 6) return;
    newBoard(8);
    buttons[0].focus();
  });
  sound.addEventListener('click', function () {
    if (!canUseGame()) return;
    if (soundEnabled) {
      soundEnabled = false;
      stopSound();
    } else {
      var Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) {
        status.textContent = 'El sonido no está disponible en este navegador.';
        return;
      }
      try { if (!audioContext) audioContext = new Audio(); } catch (ignore) {
        status.textContent = 'El sonido no está disponible en este navegador.';
        return;
      }
      soundEnabled = true;
      playSound('reveal');
    }
    render();
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stopSound();
    if (gate) gate.check();
  });
  window.addEventListener('blur', stopSound);
  window.addEventListener('pagehide', stopSound);

  newBoard(6);
  if (window.LearningGate && typeof window.LearningGate.mount === 'function') {
    try {
      gate = window.LearningGate.mount({
        gameId: 'buscaminas',
        onLock: function () { locked = true; stopSound(); render(); },
        onUnlock: function () { locked = false; render(); }
      });
    } catch (ignore) {
      gateFailed = true;
      locked = true;
      stopSound();
      render();
    }
  } else {
    gateFailed = true;
    render();
  }
}());
