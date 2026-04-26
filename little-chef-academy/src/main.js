import { LOCALES, translate } from './locales.js';
import { COLORS, INGREDIENTS, RECIPES } from './recipes.js';

const STORAGE_KEY = 'littleChefAcademyState';
const TILE_SIZE = 72;
const PLAYER_RADIUS = 24;
const ITEM_RADIUS = 25;
const BASE_WIDTH = 960;
const BASE_HEIGHT = 620;

const canvas = document.getElementById('game-canvas');
const context = canvas.getContext('2d');
const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');
const summaryScreen = document.getElementById('summary-screen');
const languageSelect = document.getElementById('language-select');
const modeCards = document.querySelectorAll('[data-mode]');
const roundLabel = document.getElementById('round-label');
const scoreLabel = document.getElementById('score-label');
const instructionLabel = document.getElementById('instruction-label');
const progressLabel = document.getElementById('progress-label');
const feedbackLabel = document.getElementById('feedback-label');
const pauseButton = document.getElementById('pause-button');
const soundButton = document.getElementById('sound-button');
const speakButton = document.getElementById('speak-button');
const menuButton = document.getElementById('menu-button');
const nextButton = document.getElementById('next-button');
const replayButton = document.getElementById('replay-button');
const summaryTitle = document.getElementById('summary-title');
const summaryMessage = document.getElementById('summary-message');
const summaryRecipe = document.getElementById('summary-recipe');
const touchButtons = document.querySelectorAll('[data-direction]');

const savedState = loadSavedState();

const state = {
  locale: savedState.locale || 'es',
  mode: 'word',
  roundIndex: 0,
  stars: 0,
  collectedCount: 0,
  expectedIndex: 0,
  paused: false,
  soundEnabled: savedState.soundEnabled ?? true,
  lastTime: 0,
  completed: false,
  finalSummary: false,
  feedback: '',
  feedbackUntil: 0,
  player: { x: BASE_WIDTH / 2, y: BASE_HEIGHT - 115, vx: 0, vy: 0, face: 1 },
  items: [],
  keys: new Set(),
  particles: []
};

languageSelect.value = state.locale;
applyTranslations();
bindEvents();
resizeCanvas();
requestAnimationFrame(loop);

function bindEvents() {
  window.addEventListener('resize', resizeCanvas);

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' '].includes(key)) {
      event.preventDefault();
    }

    if (key === ' ') {
      speakCurrentInstruction();
      return;
    }

    state.keys.add(key);
  });

  window.addEventListener('keyup', (event) => {
    state.keys.delete(event.key.toLowerCase());
  });

  languageSelect.addEventListener('change', () => {
    state.locale = languageSelect.value;
    saveState();
    applyTranslations();
    updateHud();
    speakCurrentInstruction();
  });

  modeCards.forEach((card) => {
    card.addEventListener('click', () => startMode(card.dataset.mode));
  });

  pauseButton.addEventListener('click', () => {
    state.paused = !state.paused;
    pauseButton.textContent = state.paused ? t('resume') : t('pause');
  });

  soundButton.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    saveState();
    updateSoundButton();
  });

  speakButton.addEventListener('click', speakCurrentInstruction);
  menuButton.addEventListener('click', showMenu);
  nextButton.addEventListener('click', () => {
    if (state.finalSummary) {
      startMode(state.mode);
      return;
    }

    startNextRound();
  });
  replayButton.addEventListener('click', showMenu);

  touchButtons.forEach((button) => {
    const direction = button.dataset.direction;
    const start = (event) => {
      event.preventDefault();
      state.keys.add(direction);
    };
    const end = (event) => {
      event.preventDefault();
      state.keys.delete(direction);
    };

    button.addEventListener('pointerdown', start);
    button.addEventListener('pointerup', end);
    button.addEventListener('pointercancel', end);
    button.addEventListener('pointerleave', end);
  });
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });

  document.documentElement.lang = state.locale;
  updateSoundButton();
  pauseButton.textContent = state.paused ? t('resume') : t('pause');
}

function startMode(mode) {
  state.mode = mode;
  state.roundIndex = 0;
  state.stars = 0;
  state.paused = false;
  menuScreen.hidden = true;
  summaryScreen.hidden = true;
  gameScreen.hidden = false;
  startRound();
}

function startRound() {
  state.completed = false;
  state.finalSummary = false;
  state.collectedCount = 0;
  state.expectedIndex = 0;
  state.feedback = '';
  state.feedbackUntil = 0;
  state.player.x = BASE_WIDTH / 2;
  state.player.y = BASE_HEIGHT - 115;
  state.player.vx = 0;
  state.player.vy = 0;
  state.particles = [];
  state.items = createRoundItems(getCurrentRecipe());
  updateHud();
  speakCurrentInstruction();
}

function startNextRound() {
  const isLastRound = state.roundIndex >= RECIPES.length - 1;

  if (isLastRound) {
    showFinalSummary();
    return;
  }

  state.roundIndex += 1;
  summaryScreen.hidden = true;
  gameScreen.hidden = false;
  startRound();
}

function showMenu() {
  state.paused = false;
  state.keys.clear();
  menuScreen.hidden = false;
  gameScreen.hidden = true;
  summaryScreen.hidden = true;
}

function showRoundSummary() {
  const recipe = getCurrentRecipe();
  const recipeName = getRecipeName(recipe);
  summaryTitle.textContent = t('completedTitle');
  state.finalSummary = false;
  summaryMessage.textContent = t('completedMessage', { recipe: recipeName });
  summaryRecipe.textContent = buildSummaryLine(recipe);
  nextButton.textContent = state.roundIndex >= RECIPES.length - 1 ? t('playAgain') : t('next');
  replayButton.textContent = t('backToMenu');
  gameScreen.hidden = true;
  summaryScreen.hidden = false;
  speak(summaryMessage.textContent);
}

function showFinalSummary() {
  summaryTitle.textContent = t('finalTitle');
  state.finalSummary = true;
  summaryMessage.textContent = t('finalMessage');
  summaryRecipe.textContent = `${t('score')}: ${state.stars} ⭐`;
  nextButton.textContent = t('playAgain');
  replayButton.textContent = t('backToMenu');
  state.roundIndex = 0;
  gameScreen.hidden = true;
  summaryScreen.hidden = false;
  speak(summaryMessage.textContent);
}

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = BASE_WIDTH * ratio;
  canvas.height = BASE_HEIGHT * ratio;
  canvas.style.aspectRatio = `${BASE_WIDTH} / ${BASE_HEIGHT}`;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function loop(time) {
  const delta = Math.min((time - state.lastTime) / 1000 || 0, 0.033);
  state.lastTime = time;

  if (!state.paused && !state.completed && !gameScreen.hidden) {
    updatePlayer(delta);
    updateItems(time);
    updateParticles(delta);
    checkCollections(time);
  }

  draw(time);
  requestAnimationFrame(loop);
}

function updatePlayer(delta) {
  const up = state.keys.has('arrowup') || state.keys.has('w') || state.keys.has('up');
  const down = state.keys.has('arrowdown') || state.keys.has('s') || state.keys.has('down');
  const left = state.keys.has('arrowleft') || state.keys.has('a') || state.keys.has('left');
  const right = state.keys.has('arrowright') || state.keys.has('d') || state.keys.has('right');
  const speed = 265;

  state.player.vx = (right ? 1 : 0) - (left ? 1 : 0);
  state.player.vy = (down ? 1 : 0) - (up ? 1 : 0);

  if (state.player.vx !== 0 || state.player.vy !== 0) {
    const length = Math.hypot(state.player.vx, state.player.vy) || 1;
    state.player.vx /= length;
    state.player.vy /= length;
  }

  if (state.player.vx !== 0) state.player.face = Math.sign(state.player.vx);

  state.player.x = clamp(state.player.x + state.player.vx * speed * delta, 70, BASE_WIDTH - 70);
  state.player.y = clamp(state.player.y + state.player.vy * speed * delta, 95, BASE_HEIGHT - 80);
}

function updateItems(time) {
  state.items.forEach((item, index) => {
    item.float = Math.sin(time / 420 + index) * 6;
    item.rotation = Math.sin(time / 800 + index) * 0.08;
  });
}

function updateParticles(delta) {
  state.particles.forEach((particle) => {
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vy += 180 * delta;
    particle.life -= delta;
  });
  state.particles = state.particles.filter((particle) => particle.life > 0);
}

function checkCollections(time) {
  for (const item of state.items) {
    if (item.collected) continue;

    const distance = Math.hypot(item.x - state.player.x, item.y - state.player.y);
    if (distance > PLAYER_RADIUS + ITEM_RADIUS) continue;

    collectItem(item, time);
    break;
  }
}

function collectItem(item, time) {
  const expected = getExpectedTarget();
  const correct = isCorrectItem(item, expected);

  if (!correct) {
    const message = pickMessage('wrongMessages', { target: expected.label });
    showFeedback(message, time);
    playTone(180, 0.12, 'triangle');
    speak(message);
    bounceItem(item);
    return;
  }

  item.collected = true;
  state.collectedCount += 1;

  if (state.mode === 'word') state.expectedIndex += 1;

  spawnSparkles(item.x, item.y, expected.color);
  const message = pickMessage('correctMessages');
  showFeedback(message, time);
  playTone(620 + state.collectedCount * 40, 0.16, 'sine');

  if (isRoundComplete()) {
    completeRound();
    return;
  }

  updateHud();
  speakCurrentInstruction();
}

function completeRound() {
  state.completed = true;
  state.stars += 3;
  playSuccessMelody();
  setTimeout(showRoundSummary, 700);
}

function createRoundItems(recipe) {
  const positions = [
    { x: 150, y: 160 },
    { x: 315, y: 125 },
    { x: 500, y: 165 },
    { x: 690, y: 125 },
    { x: 825, y: 220 },
    { x: 160, y: 360 },
    { x: 330, y: 430 },
    { x: 535, y: 385 },
    { x: 730, y: 440 },
    { x: 840, y: 350 }
  ];

  const pool = [...INGREDIENTS];
  const required = getRequiredItems(recipe);

  required.forEach((requiredItem) => {
    if (!pool.some((item) => item.id === requiredItem.id)) pool.push(requiredItem);
  });

  const shuffled = shuffle([...required, ...shuffle(pool).slice(0, 10 - required.length)]).slice(0, 10);

  return shuffled.map((ingredient, index) => ({
    ...ingredient,
    x: positions[index].x,
    y: positions[index].y,
    collected: false,
    float: 0,
    rotation: 0,
    bump: 0
  }));
}

function getRequiredItems(recipe) {
  if (state.mode === 'word') {
    return recipe.word.split('').map((letter, index) => ({
      id: `letter-${letter}-${index}`,
      emoji: letter,
      color: recipe.ingredients[index % recipe.ingredients.length] ? getIngredient(recipe.ingredients[index % recipe.ingredients.length]).color : 'blue',
      letter
    }));
  }

  if (state.mode === 'count') {
    return Array.from({ length: recipe.count }, () => getIngredient(recipe.countIngredient));
  }

  const colorItems = INGREDIENTS.filter((ingredient) => ingredient.color === recipe.color);
  return Array.from({ length: recipe.colorCount }, (_, index) => colorItems[index % colorItems.length]);
}

function getExpectedTarget() {
  const recipe = getCurrentRecipe();

  if (state.mode === 'word') {
    const letter = recipe.word[state.expectedIndex];
    return { type: 'letter', value: letter, label: letter, color: COLORS.blue };
  }

  if (state.mode === 'count') {
    const ingredient = getIngredient(recipe.countIngredient);
    return {
      type: 'ingredient',
      value: ingredient.id,
      label: `${ingredient.emoji} ${getItemName(ingredient.id)}`,
      color: COLORS[ingredient.color]
    };
  }

  return {
    type: 'color',
    value: recipe.color,
    label: getColorName(recipe.color),
    color: COLORS[recipe.color]
  };
}

function isCorrectItem(item, expected) {
  if (expected.type === 'letter') return item.letter === expected.value;
  if (expected.type === 'ingredient') return item.id === expected.value;
  return item.color === expected.value;
}

function isRoundComplete() {
  const recipe = getCurrentRecipe();
  if (state.mode === 'word') return state.expectedIndex >= recipe.word.length;
  if (state.mode === 'count') return state.collectedCount >= recipe.count;
  return state.collectedCount >= recipe.colorCount;
}

function updateHud() {
  const recipe = getCurrentRecipe();
  roundLabel.textContent = `${t('round')} ${state.roundIndex + 1}/${RECIPES.length}: ${getRecipeName(recipe)}`;
  scoreLabel.textContent = `${t('score')}: ${state.stars} ⭐`;
  instructionLabel.textContent = getInstructionText();
  progressLabel.textContent = buildProgressText(recipe);
}

function getInstructionText() {
  const recipe = getCurrentRecipe();

  if (state.mode === 'word') {
    return t('wordInstruction', {
      word: recipe.word,
      target: recipe.word[state.expectedIndex] || recipe.word.at(-1)
    });
  }

  if (state.mode === 'count') {
    return t('countInstruction', {
      count: recipe.count,
      ingredient: getItemName(recipe.countIngredient),
      current: state.collectedCount
    });
  }

  return t('colorInstruction', {
    color: getColorName(recipe.color),
    current: state.collectedCount,
    count: recipe.colorCount
  });
}

function buildProgressText(recipe) {
  if (state.mode === 'word') {
    const done = recipe.word.slice(0, state.expectedIndex).split('').join(' ');
    const pending = recipe.word.slice(state.expectedIndex).replace(/./g, '_').split('').join(' ');
    return `${t('target')}: ${done} ${pending}`.trim();
  }

  const target = state.mode === 'count' ? recipe.count : recipe.colorCount;
  return `${t('target')}: ${state.collectedCount}/${target}`;
}

function buildSummaryLine(recipe) {
  if (state.mode === 'word') return recipe.word;
  if (state.mode === 'count') return `${recipe.count} ${getItemName(recipe.countIngredient)}`;
  return getColorName(recipe.color);
}

function showFeedback(message, time) {
  state.feedback = message;
  state.feedbackUntil = time + 1500;
  feedbackLabel.textContent = message;
}

function pickMessage(key, replacements = {}) {
  const messages = translate(state.locale, key);
  const selected = messages[Math.floor(Math.random() * messages.length)];
  return selected.replace(/\{(\w+)\}/g, (_, name) => replacements[name] ?? '');
}

function bounceItem(item) {
  item.bump = 1;
  setTimeout(() => {
    item.bump = 0;
  }, 180);
}

function spawnSparkles(x, y, color) {
  for (let index = 0; index < 14; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 130;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 60,
      color,
      life: 0.55 + Math.random() * 0.35
    });
  }
}

function draw(time) {
  context.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
  drawKitchen();
  drawPot(time);
  state.items.forEach(drawItem);
  drawPlayer(time);
  drawParticles();

  if (state.paused) drawPauseOverlay();
}

function drawKitchen() {
  const gradient = context.createLinearGradient(0, 0, 0, BASE_HEIGHT);
  gradient.addColorStop(0, '#fff7ed');
  gradient.addColorStop(1, '#fed7aa');
  context.fillStyle = gradient;
  context.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

  context.fillStyle = '#fdba74';
  for (let x = 0; x < BASE_WIDTH; x += TILE_SIZE) {
    for (let y = 0; y < BASE_HEIGHT; y += TILE_SIZE) {
      if ((x / TILE_SIZE + y / TILE_SIZE) % 2 === 0) {
        context.globalAlpha = 0.25;
        roundRect(x, y, TILE_SIZE, TILE_SIZE, 10);
        context.fill();
        context.globalAlpha = 1;
      }
    }
  }

  drawCounter(80, 70, 800, 70);
  drawCounter(70, 305, 185, 95);
  drawCounter(700, 305, 190, 95);
  drawWindow();
}

function drawCounter(x, y, width, height) {
  context.fillStyle = '#f97316';
  roundRect(x, y, width, height, 22);
  context.fill();
  context.fillStyle = '#ffedd5';
  roundRect(x + 14, y + 12, width - 28, height - 24, 16);
  context.fill();
}

function drawWindow() {
  context.fillStyle = '#bae6fd';
  roundRect(405, 245, 150, 95, 20);
  context.fill();
  context.strokeStyle = '#0ea5e9';
  context.lineWidth = 6;
  context.stroke();
  context.beginPath();
  context.moveTo(480, 248);
  context.lineTo(480, 338);
  context.moveTo(408, 292);
  context.lineTo(552, 292);
  context.stroke();
}

function drawPot(time) {
  const x = BASE_WIDTH / 2;
  const y = BASE_HEIGHT - 92;
  const bubble = Math.sin(time / 220) * 4;

  context.fillStyle = '#64748b';
  roundRect(x - 105, y - 52, 210, 82, 24);
  context.fill();
  context.fillStyle = '#334155';
  roundRect(x - 120, y - 62, 240, 30, 16);
  context.fill();
  context.fillStyle = '#fef3c7';
  context.beginPath();
  context.ellipse(x, y - 48 + bubble, 82, 20, 0, 0, Math.PI * 2);
  context.fill();
  context.font = '34px system-ui';
  context.textAlign = 'center';
  context.fillText('🍲', x, y - 44 + bubble);
}

function drawPlayer(time) {
  const { x, y, face } = state.player;
  const bob = Math.sin(time / 130) * (state.player.vx || state.player.vy ? 4 : 1.5);

  context.save();
  context.translate(x, y + bob);
  context.scale(face, 1);

  context.fillStyle = 'rgba(15, 23, 42, 0.18)';
  context.beginPath();
  context.ellipse(0, 28, 28, 9, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#38bdf8';
  roundRect(-19, -5, 38, 43, 14);
  context.fill();
  context.fillStyle = '#f8fafc';
  roundRect(-23, -38, 46, 24, 12);
  context.fill();
  context.fillStyle = '#fed7aa';
  context.beginPath();
  context.arc(0, -16, 20, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#0f172a';
  context.beginPath();
  context.arc(-7, -18, 2.5, 0, Math.PI * 2);
  context.arc(8, -18, 2.5, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = '#0f172a';
  context.lineWidth = 2;
  context.beginPath();
  context.arc(1, -12, 8, 0.2, Math.PI - 0.2);
  context.stroke();
  context.restore();
}

function drawItem(item) {
  if (item.collected) return;

  const y = item.y + item.float - item.bump * 12;
  const color = COLORS[item.color] || '#38bdf8';

  context.save();
  context.translate(item.x, y);
  context.rotate(item.rotation);

  context.fillStyle = 'rgba(15, 23, 42, 0.16)';
  context.beginPath();
  context.ellipse(0, 30, 30, 9, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#ffffff';
  context.strokeStyle = color;
  context.lineWidth = 5;
  roundRect(-35, -35, 70, 70, 22);
  context.fill();
  context.stroke();

  context.font = item.letter ? '800 34px Nunito, system-ui' : '34px system-ui';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = item.letter ? color : '#111827';
  context.fillText(item.emoji, 0, 2);
  context.restore();
}

function drawParticles() {
  state.particles.forEach((particle) => {
    context.globalAlpha = Math.max(particle.life, 0);
    context.fillStyle = particle.color;
    context.beginPath();
    context.arc(particle.x, particle.y, 5, 0, Math.PI * 2);
    context.fill();
  });
  context.globalAlpha = 1;
}

function drawPauseOverlay() {
  context.fillStyle = 'rgba(15, 23, 42, 0.55)';
  context.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
  context.fillStyle = '#ffffff';
  context.textAlign = 'center';
  context.font = '800 56px Nunito, system-ui';
  context.fillText(t('pause'), BASE_WIDTH / 2, BASE_HEIGHT / 2);
}

function roundRect(x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

function speakCurrentInstruction() {
  speak(getInstructionText());
}

function speak(message) {
  if (!state.soundEnabled || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = state.locale === 'es' ? 'es-ES' : 'en-US';
  utterance.rate = 0.92;
  utterance.pitch = 1.08;
  window.speechSynthesis.speak(utterance);
}

function playTone(frequency, duration, type) {
  if (!state.soundEnabled) return;

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  const audioContext = new AudioContext();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
  oscillator.addEventListener('ended', () => audioContext.close());
}

function playSuccessMelody() {
  [520, 660, 780, 1040].forEach((frequency, index) => {
    setTimeout(() => playTone(frequency, 0.12, 'sine'), index * 120);
  });
}

function updateSoundButton() {
  soundButton.textContent = state.soundEnabled ? t('soundOn') : t('soundOff');
}

function getCurrentRecipe() {
  return RECIPES[state.roundIndex];
}

function getIngredient(id) {
  return INGREDIENTS.find((ingredient) => ingredient.id === id) || INGREDIENTS[0];
}

function getRecipeName(recipe) {
  return translate(state.locale, `recipeNames.${recipe.id}`);
}

function getItemName(id) {
  return translate(state.locale, `itemNames.${id}`);
}

function getColorName(color) {
  return translate(state.locale, `colorNames.${color}`);
}

function t(key, replacements) {
  return translate(state.locale, key, replacements);
}

function saveState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
    locale: state.locale,
    soundEnabled: state.soundEnabled
  }));
}

function loadSavedState() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function shuffle(values) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
  return values;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
