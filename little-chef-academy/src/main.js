import * as THREE from 'three';
import { translate } from './locales.js';
import { COLORS, INGREDIENTS, RECIPES } from './recipes.js';

const STORAGE_KEY = 'littleChefAcademyState';
const WORLD_LIMIT_X = 14.0;
const WORLD_LIMIT_Z = 9.5;
const PLAYER_RADIUS = 0.42;
const ITEM_RADIUS = 0.72;

const canvas = document.getElementById('game-canvas');
const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');
const summaryScreen = document.getElementById('summary-screen');
const languageSelect = document.getElementById('language-select');
const modeCards = document.querySelectorAll('[data-mode]');
const characterButtons = document.querySelectorAll('[data-character]');
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
const clock = new THREE.Clock();
const obstacleBoxes = [];

const CHARACTER_OPTIONS = {
  pepper: {
    shirt: 0xf97316,
    overalls: 0x0ea5e9,
    cap: 0x22c55e,
    scarf: 0x8b5cf6,
    shoes: 0x7c2d12,
    badge: 0xfacc15,
    scale: 1
  },
  mint: {
    shirt: 0x22c55e,
    overalls: 0x2563eb,
    cap: 0x0ea5e9,
    scarf: 0xf97316,
    shoes: 0x164e63,
    badge: 0xfef08a,
    scale: 1.03
  },
  berry: {
    shirt: 0xec4899,
    overalls: 0x7c3aed,
    cap: 0xa855f7,
    scarf: 0x22c55e,
    shoes: 0x701a75,
    badge: 0xfde047,
    scale: 0.97
  }
};

const state = {
  locale: savedState.locale || 'es',
  mode: 'word',
  roundIndex: 0,
  stars: 0,
  collectedCount: 0,
  expectedIndex: 0,
  paused: false,
  completed: false,
  finalSummary: false,
  soundEnabled: savedState.soundEnabled ?? true,
  selectedCharacter: CHARACTER_OPTIONS[savedState.selectedCharacter] ? savedState.selectedCharacter : 'pepper',
  keys: new Set(),
  player: { x: 0, z: 4.9, face: 0 },
  items: [],
  itemMeshes: [],
  particles: [],
  tosses: [],
  collectionCooldown: 0,
  collectedIngredientIds: new Set(),
  feedback: ''
};

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfff1d6);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
camera.position.set(0, 9.0, 13.0);
camera.lookAt(0, 0.5, 0);

const world = new THREE.Group();
const itemLayer = new THREE.Group();
const particleLayer = new THREE.Group();
scene.add(world, itemLayer, particleLayer);

const materials = createMaterials();
let chef = createChef();
const pot = createCookingPot();
const steam = createSteamParticles();
world.add(chef, pot, steam);

buildKitchen();
buildDecorations();
buildLighting();

languageSelect.value = state.locale;
applyTranslations();
bindEvents();
updateCharacterSelection();
resizeRenderer();
renderer.setAnimationLoop(loop);

function bindEvents() {
  window.addEventListener('resize', resizeRenderer);

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

  window.addEventListener('keyup', (event) => state.keys.delete(event.key.toLowerCase()));

  languageSelect.addEventListener('change', () => {
    state.locale = languageSelect.value;
    saveState();
    applyTranslations();
    updateHud();
    rebuildItemLabels();
    speakCurrentInstruction();
  });

  modeCards.forEach((card) => card.addEventListener('click', () => startMode(card.dataset.mode)));

  characterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedCharacter = button.dataset.character;
      saveState();
      updateCharacterSelection();
      rebuildChef();
    });
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
  replayButton.addEventListener('click', showMenu);
  nextButton.addEventListener('click', () => state.finalSummary ? startMode(state.mode) : startNextRound());

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

function startMode(mode) {
  state.mode = mode;
  state.roundIndex = 0;
  state.stars = 0;
  state.paused = false;
  state.finalSummary = false;
  menuScreen.hidden = true;
  summaryScreen.hidden = true;
  gameScreen.hidden = false;
  startRound();
}

function updateCharacterSelection() {
  characterButtons.forEach((button) => {
    button.classList.toggle('is-selected', button.dataset.character === state.selectedCharacter);
  });
}

function rebuildChef() {
  const x = state.player.x;
  const z = state.player.z;
  const rotation = chef.rotation.y;
  world.remove(chef);
  chef = createChef();
  chef.position.set(x, 0, z);
  chef.rotation.y = rotation;
  world.add(chef);
}

function startRound() {
  state.completed = false;
  state.collectedCount = 0;
  state.expectedIndex = 0;
  state.collectedIngredientIds = new Set();
  state.feedback = '';
  state.player.x = 0;
  state.player.z = 8.5;
  clearItems();
  state.items = createRoundItems(getCurrentRecipe());
  createItemMeshes();
  updateHud();
  speakCurrentInstruction();
}

function startNextRound() {
  if (state.roundIndex >= RECIPES.length - 1) {
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

function loop() {
  const delta = Math.min(clock.getDelta(), 0.033);
  const elapsed = clock.elapsedTime;

  if (!state.paused && !state.completed && !gameScreen.hidden) {
    state.collectionCooldown = Math.max(0, state.collectionCooldown - delta);
    updatePlayer(delta, elapsed);
    updateItems(elapsed);
    updateParticles(delta);
    updateTosses(delta);
    updateSteam(elapsed);
    checkCollections();
  } else {
    updateSteam(elapsed);
  }

  updateCamera(delta);
  renderer.render(scene, camera);
}

function resizeRenderer() {
  const width = canvas.clientWidth || 960;
  const height = canvas.clientHeight || 620;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function updatePlayer(delta, elapsed) {
  const up = hasInput('arrowup', 'w', 'up');
  const down = hasInput('arrowdown', 's', 'down');
  const left = hasInput('arrowleft', 'a', 'left');
  const right = hasInput('arrowright', 'd', 'right');
  const moveX = (right ? 1 : 0) - (left ? 1 : 0);
  const moveZ = (down ? 1 : 0) - (up ? 1 : 0);
  const length = Math.hypot(moveX, moveZ) || 1;
  const speed = 3.7;
  const velocityX = (moveX / length) * speed * delta;
  const velocityZ = (moveZ / length) * speed * delta;
  const nextX = clamp(state.player.x + velocityX, -WORLD_LIMIT_X, WORLD_LIMIT_X);
  const nextZ = clamp(state.player.z + velocityZ, -WORLD_LIMIT_Z, WORLD_LIMIT_Z);

  if (!isPositionBlocked(nextX, state.player.z)) state.player.x = nextX;
  if (!isPositionBlocked(state.player.x, nextZ)) state.player.z = nextZ;

  chef.position.set(state.player.x, 0, state.player.z);
  if (moveX !== 0 || moveZ !== 0) {
    state.player.face = Math.atan2(moveX, moveZ);
    chef.rotation.y = THREE.MathUtils.lerp(chef.rotation.y, state.player.face, 0.22);
    animateChefWalk(elapsed);
  } else {
    animateChefIdle(elapsed);
  }
}

function addObstacleBox(x, z, width, depth, padding = 0.06) {
  obstacleBoxes.push({
    minX: x - width / 2 - padding,
    maxX: x + width / 2 + padding,
    minZ: z - depth / 2 - padding,
    maxZ: z + depth / 2 + padding
  });
}

function isPositionBlocked(x, z) {
  return obstacleBoxes.some((box) => (
    x + PLAYER_RADIUS > box.minX
    && x - PLAYER_RADIUS < box.maxX
    && z + PLAYER_RADIUS > box.minZ
    && z - PLAYER_RADIUS < box.maxZ
  ));
}

function updateItems(elapsed) {
  state.itemMeshes.forEach((entry, index) => {
    if (entry.item.collected) return;
    const bob = Math.sin(elapsed * 2.4 + index) * 0.12;
    entry.group.position.y = entry.baseY + bob;
    entry.group.rotation.y += 0.012;
    entry.ring.rotation.z -= 0.028;
    entry.beam.material.opacity = 0.2 + Math.sin(elapsed * 4 + index) * 0.08;
    entry.arrow.position.y = 1.55 + Math.sin(elapsed * 3.2 + index) * 0.16;
    entry.arrow.material.opacity = 0.82 + Math.sin(elapsed * 5 + index) * 0.12;
  });
}

function updateParticles(delta) {
  for (const particle of state.particles) {
    particle.life -= delta;
    particle.mesh.position.addScaledVector(particle.velocity, delta);
    particle.velocity.y -= delta * 1.5;
    particle.mesh.material.opacity = Math.max(particle.life * 1.8, 0);
    particle.mesh.scale.multiplyScalar(0.992);
  }
  state.particles = state.particles.filter((particle) => {
    if (particle.life > 0) return true;
    particleLayer.remove(particle.mesh);
    particle.mesh.geometry.dispose();
    particle.mesh.material.dispose();
    return false;
  });
}

function updateTosses(delta) {
  for (const toss of state.tosses) {
    toss.progress = Math.min(toss.progress + delta * 2.8, 1);
    const curved = toss.start.clone().lerp(toss.target, toss.progress);
    curved.y += Math.sin(toss.progress * Math.PI) * 1.3;
    toss.mesh.position.copy(curved);
    toss.mesh.rotation.y += delta * 8;
    toss.mesh.material.opacity = 0.85 * (1 - Math.max(0, toss.progress - 0.72) / 0.28);
  }

  state.tosses = state.tosses.filter((toss) => {
    if (toss.progress < 1) return true;
    particleLayer.remove(toss.mesh);
    toss.mesh.geometry.dispose();
    toss.mesh.material.dispose();
    return false;
  });
}

function updateCamera(delta) {
  const target = new THREE.Vector3(state.player.x * 0.28, 8.5, state.player.z + 11.5);
  camera.position.lerp(target, Math.min(delta * 2.3, 1));
  camera.lookAt(state.player.x * 0.2, 0.5, state.player.z - 1.5);
}

function updateSteam(elapsed) {
  steam.children.forEach((puff, index) => {
    puff.position.y = 1.25 + ((elapsed * 0.35 + index * 0.22) % 1.4);
    puff.position.x = Math.sin(elapsed + index) * 0.12;
    puff.position.z = -2.95 + Math.cos(elapsed * 0.8 + index) * 0.08;
    puff.material.opacity = 0.18 * (1 - (puff.position.y - 1.25) / 1.4);
  });
}

function checkCollections() {
  if (state.collectionCooldown > 0) return;

  for (const entry of state.itemMeshes) {
    if (entry.item.collected) continue;
    const distance = Math.hypot(entry.item.x - state.player.x, entry.item.z - state.player.z);
    if (distance <= PLAYER_RADIUS + ITEM_RADIUS) {
      collectItem(entry, entry.group.position.clone());
      break;
    }
  }
}

function collectItem(entry, position) {
  const { item } = entry;
  const expected = getExpectedTarget();
  const correct = isCorrectItem(item, expected);
  state.collectionCooldown = 0.22;

  if (!correct) {
    const message = pickMessage('wrongMessages', { target: expected.label });
    showFeedback(message, '#dc2626');
    playTone(160, 0.12, 'triangle');
    speak(message);
    pulseWrongItem(item);
    return;
  }

  item.collected = true;
  state.collectedCount += 1;
  if (state.mode === 'word') state.expectedIndex += 1;
  if (state.mode === 'recipe') state.collectedIngredientIds.add(item.id);
  hideItemMesh(item);
  spawnSparkles(position, expected.color);
  tossToPot(position, expected.color);
  showFeedback(pickMessage('correctMessages'), '#16a34a');
  playTone(620 + state.collectedCount * 45, 0.16, 'sine');

  if (isRoundComplete()) {
    completeRound();
    return;
  }

  updateHud();
}

function completeRound() {
  state.completed = true;
  state.stars += 3;
  playSuccessMelody();
  setTimeout(showRoundSummary, 800);
}

function showRoundSummary() {
  const recipe = getCurrentRecipe();
  summaryTitle.textContent = t('completedTitle');
  summaryMessage.textContent = t('completedMessage', { recipe: getRecipeName(recipe) });
  summaryRecipe.textContent = buildSummaryLine(recipe);
  nextButton.textContent = state.roundIndex >= RECIPES.length - 1 ? t('playAgain') : t('next');
  replayButton.textContent = t('backToMenu');
  state.finalSummary = false;
  gameScreen.hidden = true;
  summaryScreen.hidden = false;
  speak(summaryMessage.textContent);
}

function showFinalSummary() {
  summaryTitle.textContent = t('finalTitle');
  summaryMessage.textContent = t('finalMessage');
  summaryRecipe.textContent = `${t('score')}: ${state.stars} ⭐`;
  nextButton.textContent = t('playAgain');
  replayButton.textContent = t('backToMenu');
  state.roundIndex = 0;
  state.finalSummary = true;
  gameScreen.hidden = true;
  summaryScreen.hidden = false;
  speak(summaryMessage.textContent);
}

function createMaterials() {
  return {
    floorA: new THREE.MeshStandardMaterial({ color: 0xffd8a8, roughness: 0.72 }),
    floorB: new THREE.MeshStandardMaterial({ color: 0xfebf73, roughness: 0.72 }),
    wall: new THREE.MeshStandardMaterial({ color: 0xfff4df, roughness: 0.9 }),
    wood: new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.58 }),
    woodLight: new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.55 }),
    counter: new THREE.MeshStandardMaterial({ color: 0xffedd5, roughness: 0.38 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.35, roughness: 0.28 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xbae6fd, roughness: 0.05, transmission: 0.3, transparent: true, opacity: 0.62 }),
    chefBlue: new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.52 }),
    mascotShirt: new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.48 }),
    mascotCap: new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.5 }),
    mascotScarf: new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.5 }),
    mascotShoe: new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.5 }),
    mascotGold: new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.2, roughness: 0.3 }),
    chefSkin: new THREE.MeshStandardMaterial({ color: 0xf7c59f, roughness: 0.55 }),
    chefWhite: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6 })
  };
}

function buildKitchen() {
  const floor = new THREE.Group();
  for (let x = -15; x < 15; x += 1) {
    for (let z = -11; z < 11; z += 1) {
      const tile = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.04, 0.98), (x + z) % 2 === 0 ? materials.floorA : materials.floorB);
      tile.position.set(x + 0.5, -0.02, z + 0.5);
      tile.receiveShadow = true;
      floor.add(tile);
    }
  }
  world.add(floor);

  // Back wall
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(30, 5.5, 0.25), materials.wall);
  backWall.position.set(0, 2.75, -10.15);
  backWall.receiveShadow = true;
  world.add(backWall);
  addObstacleBox(0, -10.15, 30, 0.3, 0.12);

  // Left wall
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.25, 5.5, 22), materials.wall);
  leftWall.position.set(-14.15, 2.75, 0);
  leftWall.receiveShadow = true;
  world.add(leftWall);
  addObstacleBox(-14.15, 0, 0.3, 22, 0.12);

  // Right wall
  const rightWall = leftWall.clone();
  rightWall.position.x = 14.15;
  world.add(rightWall);
  addObstacleBox(14.15, 0, 0.3, 22, 0.12);

  // Back wall counter (full width)
  createCounter(0, -9.15, 26, 1.0);

  // Left side counter
  createCounter(-12.4, -2.5, 1.0, 13);

  // Right side counter
  createCounter(12.4, -2.5, 1.0, 13);

  // Pantry divider — creates a sheltered alcove on the back left
  const pantryDiv = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.4, 0.3), materials.wood);
  pantryDiv.position.set(-9.8, 1.2, -5.5);
  pantryDiv.castShadow = true;
  world.add(pantryDiv);
  addObstacleBox(-9.8, -5.5, 4.8, 0.4, 0.18);

  // Prep area divider — symmetrical on the right
  const prepDiv = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.4, 0.3), materials.wood);
  prepDiv.position.set(9.8, 1.2, -5.5);
  prepDiv.castShadow = true;
  world.add(prepDiv);
  addObstacleBox(9.8, -5.5, 4.8, 0.4, 0.18);

  // Main central island (larger)
  createIsland(0, -1.5);

  // Second island (upper area)
  createIsland(0, -6.5);

  // Small side prep stations
  createSmallIsland(-5.5, 3.8);
  createSmallIsland(5.5, 3.8);
}

function createSmallIsland(x, z) {
  const island = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 1.4), materials.woodLight);
  island.position.set(x, 0.45, z);
  island.castShadow = true;
  island.receiveShadow = true;
  world.add(island);

  const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 1.6), materials.counter);
  top.position.set(x, 1.0, z);
  top.castShadow = true;
  world.add(top);

  addObstacleBox(x, z, 2.4, 1.6, 0.18);
}

function createCounter(x, z, width, depth) {
  const base = new THREE.Mesh(new THREE.BoxGeometry(width, 0.95, depth), materials.wood);
  base.position.set(x, 0.46, z);
  base.castShadow = true;
  base.receiveShadow = true;
  world.add(base);
  addObstacleBox(x, z, width, depth, 0.16);

  const top = new THREE.Mesh(new THREE.BoxGeometry(width + 0.18, 0.16, depth + 0.18), materials.counter);
  top.position.set(x, 1.02, z);
  top.castShadow = true;
  top.receiveShadow = true;
  world.add(top);

  const drawerCount = Math.max(2, Math.floor(width / 1.4));
  for (let i = 0; i < drawerCount; i += 1) {
    const drawer = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.32, 0.05), materials.woodLight);
    drawer.position.set(x - width / 2 + 0.7 + i * (width - 1.4) / Math.max(drawerCount - 1, 1), 0.62, z + depth / 2 + 0.03);
    drawer.castShadow = true;
    world.add(drawer);
  }
}

function createIsland(x, z) {
  const island = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.9, 1.8), materials.woodLight);
  island.position.set(x, 0.45, z);
  island.castShadow = true;
  island.receiveShadow = true;
  world.add(island);

  const top = new THREE.Mesh(new THREE.BoxGeometry(4.35, 0.18, 2.05), materials.counter);
  top.position.set(x, 1.0, z);
  top.castShadow = true;
  world.add(top);

  addObstacleBox(x, z, 4.35, 2.05, 0.18);

  ['🔪', '🥄', '🍽️'].forEach((emoji, index) => {
    const label = createTextSprite(emoji, 72, '#1f2937', 'rgba(255,255,255,0)');
    label.position.set(x - 1.15 + index * 1.15, 1.18, z + 0.15);
    label.scale.set(0.45, 0.45, 0.45);
    world.add(label);
  });
}

function buildDecorations() {
  createWindow(-6, -10.03);
  createWindow(6, -10.03);
  createShelf(-5.8, -9.98, ['🍎', '🍌', '🥕']);
  createShelf(5.8, -9.98, ['🥛', '🧀', '🍇']);
  createShelf(0, -9.98, ['🍅', '🫐', '🍊']);
  createHangingLamps();
  createRecipeBoard();
  createPlants();
}

function createWindow(x, z) {
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.65, 0.12), materials.woodLight);
  frame.position.set(x, 2.95, z);
  frame.castShadow = true;
  world.add(frame);

  const glass = new THREE.Mesh(new THREE.BoxGeometry(2.12, 1.36, 0.14), materials.glass);
  glass.position.set(x, 2.95, z + 0.03);
  world.add(glass);

  const sun = createTextSprite('☀️', 80, '#facc15', 'rgba(255,255,255,0)');
  sun.position.set(x + 0.55, 3.18, z + 0.11);
  sun.scale.set(0.55, 0.55, 0.55);
  world.add(sun);
}

function createShelf(x, z, emojis) {
  const plank = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.16, 0.42), materials.wood);
  plank.position.set(x, 2.45, z);
  plank.castShadow = true;
  world.add(plank);

  emojis.forEach((emoji, index) => {
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.42, 18), materials.glass);
    jar.position.set(x - 0.75 + index * 0.75, 2.78, z + 0.03);
    jar.castShadow = true;
    world.add(jar);
    const label = createTextSprite(emoji, 48, '#111827', 'rgba(255,255,255,0)');
    label.position.set(jar.position.x, 2.81, z + 0.28);
    label.scale.set(0.28, 0.28, 0.28);
    world.add(label);
  });
}

function createHangingLamps() {
  [-5.5, -1.5, 2.5, 6.5].forEach((x) => {
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 10), materials.dark);
    cable.position.set(x, 4.4, -2.5);
    world.add(cable);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.38, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.42 }));
    shade.position.set(x, 3.72, -2.5);
    shade.castShadow = true;
    world.add(shade);
  });
}

function createRecipeBoard() {
  const board = new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.25, 0.12), new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.7 }));
  board.position.set(-8.15, 2.8, -10.0);
  board.castShadow = true;
  world.add(board);
  const title = createTextSprite('ABC 123', 64, '#fef3c7', 'rgba(0,0,0,0)');
  title.position.set(-8.15, 2.86, -9.86);
  title.scale.set(0.72, 0.42, 0.42);
  world.add(title);
}

function createPlants() {
  [-13.2, 13.2].forEach((x) => {
    const potMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.26, 0.55, 18), new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.65 }));
    potMesh.position.set(x, 0.28, 9.2);
    potMesh.castShadow = true;
    world.add(potMesh);
    for (let i = 0; i < 7; i += 1) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.8 }));
      leaf.position.set(x + Math.sin(i) * 0.26, 0.68 + (i % 3) * 0.12, 9.2 + Math.cos(i) * 0.22);
      leaf.scale.set(1.1, 0.45, 0.72);
      leaf.castShadow = true;
      world.add(leaf);
    }
  });
}

function buildLighting() {
  scene.add(new THREE.HemisphereLight(0xfff7ed, 0xf97316, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 2.3);
  key.position.set(-4, 8, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 30;
  key.shadow.camera.left = -16;
  key.shadow.camera.right = 16;
  key.shadow.camera.top = 16;
  key.shadow.camera.bottom = -16;
  scene.add(key);

  const warm = new THREE.PointLight(0xffb86b, 65, 12, 2);
  warm.position.set(0, 3.3, -0.7);
  warm.castShadow = true;
  scene.add(warm);
}

function createChef() {
  const group = new THREE.Group();
  const palette = CHARACTER_OPTIONS[state.selectedCharacter] || CHARACTER_OPTIONS.pepper;
  const skin = materials.chefSkin;
  const white = materials.chefWhite;
  const overalls = createCharacterMaterial(palette.overalls);
  const shirt = createCharacterMaterial(palette.shirt);
  const cap = createCharacterMaterial(palette.cap);
  const scarf = createCharacterMaterial(palette.scarf);
  const shoes = createCharacterMaterial(palette.shoes);
  const gold = new THREE.MeshStandardMaterial({ color: palette.badge, metalness: 0.22, roughness: 0.28 });
  const dark = materials.dark;

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.7, 10, 18), shirt);
  torso.position.y = 0.82;
  torso.scale.set(1.12, 1, 0.86);
  torso.castShadow = true;
  group.add(torso);

  const overallsPanel = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.62, 0.055), overalls);
  overallsPanel.position.set(0, 0.78, 0.3);
  overallsPanel.castShadow = true;
  group.add(overallsPanel);

  const leftStrap = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.54, 0.06), overalls);
  leftStrap.position.set(-0.18, 1.08, 0.31);
  leftStrap.rotation.z = -0.22;
  const rightStrap = leftStrap.clone();
  rightStrap.position.x = 0.18;
  rightStrap.rotation.z = 0.22;
  group.add(leftStrap, rightStrap);

  const leftButton = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), gold);
  leftButton.position.set(-0.17, 1.02, 0.35);
  const rightButton = leftButton.clone();
  rightButton.position.x = 0.17;
  group.add(leftButton, rightButton);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 24, 18), skin);
  head.position.y = 1.52;
  head.scale.set(1.05, 1.0, 1.06);
  head.castShadow = true;
  group.add(head);

  // Ears
  const leftEar = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), skin);
  leftEar.position.set(-0.37, 1.52, 0);
  leftEar.scale.set(0.58, 0.85, 0.5);
  leftEar.castShadow = true;
  group.add(leftEar);
  const rightEar = leftEar.clone();
  rightEar.position.x = 0.37;
  group.add(rightEar);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), skin);
  nose.position.set(0, 1.50, 0.38);
  nose.scale.set(1.1, 0.9, 1.2);
  nose.castShadow = true;
  group.add(nose);

  const capBase = new THREE.Mesh(new THREE.SphereGeometry(0.40, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), cap);
  capBase.position.y = 1.78;
  capBase.scale.set(1.1, 0.65, 1.04);
  capBase.castShadow = true;
  group.add(capBase);

  const capBand = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.41, 0.1, 28), cap);
  capBand.position.y = 1.74;
  capBand.scale.z = 0.92;
  capBand.castShadow = true;
  group.add(capBand);

  const capBrim = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.08, 0.36), cap);
  capBrim.position.set(0, 1.68, 0.40);
  capBrim.rotation.x = -0.12;
  capBrim.castShadow = true;
  group.add(capBrim);

  const capBadge = createTextSprite('★', 80, '#facc15', 'rgba(255,255,255,0.95)');
  capBadge.position.set(0, 1.82, 0.43);
  capBadge.scale.set(0.24, 0.24, 0.24);
  group.add(capBadge);

  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), dark);
  leftEye.position.set(-0.12, 1.56, 0.33);
  const rightEye = leftEye.clone();
  rightEye.position.x = 0.12;
  group.add(leftEye, rightEye);

  const leftBrow = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.03), dark);
  leftBrow.position.set(-0.12, 1.64, 0.35);
  leftBrow.rotation.z = 0.16;
  const rightBrow = leftBrow.clone();
  rightBrow.position.x = 0.12;
  rightBrow.rotation.z = -0.16;
  group.add(leftBrow, rightBrow);

  // Big bushy mustache
  const mustacheLeft = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.028, 10, 20, Math.PI), dark);
  mustacheLeft.position.set(-0.072, 1.40, 0.37);
  mustacheLeft.rotation.set(Math.PI, 0.05, -0.2);
  const mustacheRight = mustacheLeft.clone();
  mustacheRight.position.x = 0.072;
  mustacheRight.rotation.z = 0.2;
  group.add(mustacheLeft, mustacheRight);

  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 8, 24, Math.PI), dark);
  smile.position.set(0, 1.34, 0.34);
  smile.rotation.z = Math.PI;
  group.add(smile);

  const scarfBand = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.035, 10, 28), scarf);
  scarfBand.position.y = 1.2;
  scarfBand.rotation.x = Math.PI / 2;
  scarfBand.scale.z = 0.55;
  scarfBand.castShadow = true;
  group.add(scarfBand);

  const scarfTail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.35, 0.08), scarf);
  scarfTail.position.set(0.28, 1.08, 0.18);
  scarfTail.rotation.z = -0.42;
  scarfTail.castShadow = true;
  group.add(scarfTail);

  const apronPocket = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.06), white);
  apronPocket.position.set(0, 0.72, 0.34);
  apronPocket.castShadow = true;
  group.add(apronPocket);

  const star = createTextSprite('★', 58, '#facc15', 'rgba(255,255,255,0)');
  star.position.set(0, 0.75, 0.39);
  star.scale.set(0.16, 0.16, 0.16);
  group.add(star);

  group.userData.leftArm = createArmGroup(group, -0.48, 1.14, 0.06, shirt);
  group.userData.rightArm = createArmGroup(group, 0.48, 1.14, 0.06, shirt);
  group.userData.leftLeg = createLegGroup(group, -0.19, 0.72, 0, overalls, shoes);
  group.userData.rightLeg = createLegGroup(group, 0.19, 0.72, 0, overalls, shoes);

  group.position.set(0, 0, 8.5);
  group.scale.setScalar(palette.scale);
  return group;
}

function createCharacterMaterial(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.48 });
}

// Arm group: pivot at shoulder, arm + glove hang down so they move together
function createArmGroup(parent, x, y, z, armMaterial) {
  const armGroup = new THREE.Group();
  armGroup.position.set(x, y, z);

  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.38, 6, 10), armMaterial);
  arm.position.y = -0.28;
  arm.castShadow = true;
  armGroup.add(arm);

  const glove = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 12), materials.chefWhite);
  glove.position.y = -0.56;
  glove.castShadow = true;
  armGroup.add(glove);

  parent.add(armGroup);
  return armGroup;
}

// Leg group: pivot at hip, leg + shoe hang down so they move together
function createLegGroup(parent, x, y, z, legMaterial, shoeMaterial) {
  const legGroup = new THREE.Group();
  legGroup.position.set(x, y, z);

  const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.38, 6, 10), legMaterial);
  leg.position.y = -0.28;
  leg.castShadow = true;
  legGroup.add(leg);

  const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.14, 0.46), shoeMaterial);
  shoe.position.set(0, -0.58, 0.07);
  shoe.castShadow = true;
  legGroup.add(shoe);

  parent.add(legGroup);
  return legGroup;
}

function animateChefWalk(elapsed) {
  const swing = Math.sin(elapsed * 9) * 0.55;
  chef.userData.leftArm.rotation.x = swing;
  chef.userData.rightArm.rotation.x = -swing;
  chef.userData.leftLeg.rotation.x = -swing * 0.65;
  chef.userData.rightLeg.rotation.x = swing * 0.65;
  chef.position.y = Math.abs(Math.sin(elapsed * 9)) * 0.035;
}

function animateChefIdle(elapsed) {
  chef.userData.leftArm.rotation.x = Math.sin(elapsed * 2) * 0.08;
  chef.userData.rightArm.rotation.x = -Math.sin(elapsed * 2) * 0.08;
  chef.userData.leftLeg.rotation.x = 0;
  chef.userData.rightLeg.rotation.x = 0;
  chef.position.y = Math.sin(elapsed * 2.2) * 0.018;
}

function createCookingPot() {
  const group = new THREE.Group();
  group.position.set(0, 0, -2.9);
  addObstacleBox(0, -2.9, 1.9, 1.35, 0.1);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.68, 0.72, 36), materials.metal);
  body.position.y = 0.52;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  const soup = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.05, 36), new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.4 }));
  soup.position.y = 0.9;
  group.add(soup);
  const leftHandle = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 8, 18), materials.metal);
  leftHandle.position.set(-0.83, 0.56, 0);
  leftHandle.rotation.y = Math.PI / 2;
  const rightHandle = leftHandle.clone();
  rightHandle.position.x = 0.83;
  group.add(leftHandle, rightHandle);
  return group;
}

function createSteamParticles() {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false });
  for (let i = 0; i < 8; i += 1) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.13 + i * 0.008, 12, 8), material.clone());
    group.add(puff);
  }
  return group;
}

function createRoundItems(recipe) {
  const positions = [
    // Back row (near back counter)
    [-10.5, -7.5], [-5.5, -8.0], [0, -8.0], [5.5, -8.0], [10.5, -7.5],
    // Upper mid (around second island)
    [-8.5, -5.0], [-3.5, -5.0], [3.5, -5.0], [8.5, -5.0],
    // Center (around main island, sides)
    [-11.5, -1.5], [-4.5, -2.5], [4.5, -2.5], [11.5, -1.5],
    // Lower mid (around small side stations)
    [-8.5, 3.5], [8.5, 3.5],
    // Near front
    [-4.0, 6.5], [4.0, 6.5], [0, 7.0]
  ];
  const required = getRequiredItems(recipe);
  let extras;
  if (state.mode === 'word') {
    const usedLetters = new Set(recipe.word.split(''));
    const alphabet = 'ABCDEFGHIJKLMNOPRSTUVZ'.split('').filter((l) => !usedLetters.has(l));
    extras = shuffle(alphabet).slice(0, Math.max(0, positions.length - required.length)).map((letter, i) => ({
      id: `decoy-${letter}-${i}`,
      emoji: letter,
      color: 'orange',
      letter
    }));
  } else {
    const requiredIds = new Set(required.map((r) => r.id));
    extras = shuffle([...INGREDIENTS]).filter((ing) => !requiredIds.has(ing.id)).slice(0, Math.max(0, positions.length - required.length));
  }
  const allItems = shuffle([...required, ...extras]).slice(0, positions.length);
  return allItems.map((ingredient, index) => ({
    ...ingredient,
    x: positions[index][0],
    z: positions[index][1],
    collected: false,
    meshId: crypto.randomUUID?.() || `${ingredient.id}-${index}-${Date.now()}`
  }));
}

function getRequiredItems(recipe) {
  if (state.mode === 'word') {
    return recipe.word.split('').map((letter, index) => ({
      id: `letter-${letter}-${index}`,
      emoji: letter,
      color: getIngredient(recipe.ingredients[index % recipe.ingredients.length]).color,
      letter
    }));
  }
  if (state.mode === 'count') {
    return Array.from({ length: recipe.count }, () => ({ ...getIngredient(recipe.countIngredient) }));
  }
  if (state.mode === 'color') {
    const colorItems = INGREDIENTS.filter((ingredient) => ingredient.color === recipe.color);
    return Array.from({ length: recipe.colorCount }, (_, index) => ({ ...colorItems[index % colorItems.length] }));
  }
  if (state.mode === 'recipe') {
    return recipe.ingredients.map((id) => ({ ...getIngredient(id) }));
  }
  if (state.mode === 'math') {
    const total = recipe.mathA + recipe.mathB;
    return Array.from({ length: total }, () => ({ ...getIngredient(recipe.countIngredient) }));
  }
  return [];
}

function createItemMeshes() {
  clearItems();
  state.items.forEach((item) => {
    const group = new THREE.Group();
    group.position.set(item.x, 1.55, item.z);  // raise above counters (top ~1.02)
    group.userData.meshId = item.meshId;

    const color = new THREE.Color(COLORS[item.color] || '#38bdf8');
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52, 0.52, 1.8, 32, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide })
    );
    beam.position.y = 0.42;
    group.add(beam);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.04, 10, 56),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92 })
    );
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // Big emoji label — no background for food items, tile background for letters
    const isLetter = Boolean(item.letter);
    const label = createTextSprite(
      item.emoji,
      isLetter ? 260 : 300,
      isLetter ? '#1e3a8a' : '#111827',
      isLetter ? 'rgba(219,234,254,0.92)' : 'rgba(255,255,255,0)',
      512
    );
    label.position.y = 0.18;
    label.scale.set(1.9, 1.9, 1.9);
    label.material.depthTest = false;
    label.renderOrder = 10;
    group.add(label);

    const arrow = createTextSprite('↓', 96, COLORS[item.color] || '#111827', 'rgba(255,255,255,0)');
    arrow.position.y = 1.65;
    arrow.scale.set(0.45, 0.45, 0.45);
    arrow.material.depthTest = false;
    arrow.renderOrder = 10;
    group.add(arrow);

    const light = new THREE.PointLight(color, 1.3, 3.4, 2.2);
    light.position.y = 0.8;
    group.add(light);

    itemLayer.add(group);
    state.itemMeshes.push({ item, group, ring, beam, arrow, label, baseY: group.position.y });
  });
}

function rebuildItemLabels() {
  if (!state.items.length) return;
  createItemMeshes();
}

function clearItems() {
  for (const entry of state.itemMeshes) {
    disposeObject(entry.group);
    itemLayer.remove(entry.group);
  }
  state.itemMeshes = [];
}

function disposeObject(root) {
  root.traverse((object) => {
    if (object.geometry) object.geometry.dispose();
    const materialsToDispose = Array.isArray(object.material) ? object.material : [object.material];
    materialsToDispose.filter(Boolean).forEach((material) => {
      if (material.map) material.map.dispose();
      material.dispose();
    });
  });
}

function hideItemMesh(item) {
  const entry = state.itemMeshes.find((candidate) => candidate.item.meshId === item.meshId);
  if (!entry) return;
  entry.group.visible = false;
}

function pulseWrongItem(item) {
  const entry = state.itemMeshes.find((candidate) => candidate.item.meshId === item.meshId);
  if (!entry) return;
  entry.group.scale.set(1.25, 1.25, 1.25);
  setTimeout(() => entry.group.scale.set(1, 1, 1), 180);
}

function spawnSparkles(position, color) {
  for (let i = 0; i < 18; i += 1) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.045 + Math.random() * 0.035, 8, 6),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 })
    );
    mesh.position.copy(position);
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.2 + Math.random() * 2.4;
    const velocity = new THREE.Vector3(Math.cos(angle) * speed, 1.5 + Math.random() * 1.6, Math.sin(angle) * speed);
    particleLayer.add(mesh);
    state.particles.push({ mesh, velocity, life: 0.55 + Math.random() * 0.35 });
  }
}

function tossToPot(position, color) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 10, 8),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 })
  );
  mesh.position.copy(position);
  particleLayer.add(mesh);
  state.tosses.push({
    mesh,
    start: mesh.position.clone(),
    target: new THREE.Vector3(0, 1.2, -2.9),
    progress: 0
  });
}

function getExpectedTarget() {
  const recipe = getCurrentRecipe();
  if (state.mode === 'word') {
    const letter = recipe.word[state.expectedIndex];
    return { type: 'letter', value: letter, label: letter, color: COLORS.blue };
  }
  if (state.mode === 'count' || state.mode === 'math') {
    const ingredient = getIngredient(recipe.countIngredient);
    return { type: 'ingredient', value: ingredient.id, label: `${ingredient.emoji} ${getItemName(ingredient.id)}`, color: COLORS[ingredient.color] };
  }
  if (state.mode === 'color') {
    return { type: 'color', value: recipe.color, label: getColorName(recipe.color), color: COLORS[recipe.color] };
  }
  if (state.mode === 'recipe') {
    const uncollected = recipe.ingredients.filter((id) => !state.collectedIngredientIds.has(id));
    if (!uncollected.length) return null;
    const ingredient = getIngredient(uncollected[0]);
    return { type: 'any-ingredient', value: uncollected, label: uncollected.map((id) => getItemName(id)).join(', '), color: COLORS[ingredient.color] };
  }
  return null;
}

function isCorrectItem(item, expected) {
  if (!expected) return false;
  if (expected.type === 'letter') return item.letter === expected.value;
  if (expected.type === 'any-ingredient') return Array.isArray(expected.value) && expected.value.includes(item.id) && !state.collectedIngredientIds.has(item.id);
  if (expected.type === 'ingredient') return item.id === expected.value;
  return item.color === expected.value;
}

function isRoundComplete() {
  const recipe = getCurrentRecipe();
  if (state.mode === 'word') return state.expectedIndex >= recipe.word.length;
  if (state.mode === 'count') return state.collectedCount >= recipe.count;
  if (state.mode === 'color') return state.collectedCount >= recipe.colorCount;
  if (state.mode === 'recipe') return state.collectedIngredientIds.size >= recipe.ingredients.length;
  if (state.mode === 'math') return state.collectedCount >= recipe.mathA + recipe.mathB;
  return false;
}

function updateHud() {
  if (!getCurrentRecipe()) return;
  const recipe = getCurrentRecipe();
  roundLabel.textContent = `${t('round')} ${state.roundIndex + 1}/${RECIPES.length}: ${getRecipeName(recipe)}`;
  scoreLabel.textContent = `${t('score')}: ${state.stars} ⭐`;
  instructionLabel.textContent = getInstructionText();
  progressLabel.textContent = buildProgressText(recipe);
}

function getInstructionText() {
  const recipe = getCurrentRecipe();
  if (!recipe) return '';
  if (state.mode === 'word') {
    return t('wordInstruction', { word: recipe.word, target: recipe.word[state.expectedIndex] || recipe.word.at(-1) });
  }
  if (state.mode === 'count') {
    return t('countInstruction', { count: recipe.count, ingredient: getItemName(recipe.countIngredient), current: state.collectedCount });
  }
  if (state.mode === 'color') {
    return t('colorInstruction', { color: getColorName(recipe.color), current: state.collectedCount, count: recipe.colorCount });
  }
  if (state.mode === 'recipe') {
    const remaining = recipe.ingredients
      .filter((id) => !state.collectedIngredientIds.has(id))
      .map((id) => `${getIngredient(id).emoji} ${getItemName(id)}`)
      .join(', ');
    return t('recipeInstruction', { name: getRecipeName(recipe), remaining });
  }
  if (state.mode === 'math') {
    return t('mathInstruction', { a: recipe.mathA, b: recipe.mathB, ingredient: getItemName(recipe.countIngredient), current: state.collectedCount, total: recipe.mathA + recipe.mathB });
  }
  return '';
}

function buildProgressText(recipe) {
  if (state.mode === 'word') {
    const done = recipe.word.slice(0, state.expectedIndex).split('').join(' ');
    const pending = recipe.word.slice(state.expectedIndex).replace(/./g, '_').split('').join(' ');
    return `${t('target')}: ${done} ${pending}`.trim();
  }
  if (state.mode === 'recipe') {
    const done = recipe.ingredients.filter((id) => state.collectedIngredientIds.has(id)).map((id) => getIngredient(id).emoji).join(' ');
    const todo = recipe.ingredients.filter((id) => !state.collectedIngredientIds.has(id)).map((id) => getIngredient(id).emoji).join(' ');
    return `${done ? `✅ ${done}  ` : ''}➜ ${todo}`;
  }
  if (state.mode === 'math') {
    return `${recipe.mathA} + ${recipe.mathB} = ${recipe.mathA + recipe.mathB}  ·  ${state.collectedCount}/${recipe.mathA + recipe.mathB}`;
  }
  const target = state.mode === 'count' ? recipe.count : recipe.colorCount;
  return `${t('target')}: ${state.collectedCount}/${target}`;
}

function buildSummaryLine(recipe) {
  if (state.mode === 'word') return recipe.word;
  if (state.mode === 'count') return `${recipe.count} ${getItemName(recipe.countIngredient)}`;
  if (state.mode === 'color') return getColorName(recipe.color);
  if (state.mode === 'recipe') return recipe.ingredients.map((id) => getIngredient(id).emoji).join(' + ');
  if (state.mode === 'math') return `${recipe.mathA} + ${recipe.mathB} = ${recipe.mathA + recipe.mathB}`;
  return '';
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.documentElement.lang = state.locale;
  updateSoundButton();
  pauseButton.textContent = state.paused ? t('resume') : t('pause');
}

function showFeedback(message, color) {
  state.feedback = message;
  feedbackLabel.textContent = message;
  feedbackLabel.style.color = color;
}

function pickMessage(key, replacements = {}) {
  const messages = translate(state.locale, key);
  const selected = Array.isArray(messages)
    ? messages[Math.floor(Math.random() * messages.length)]
    : String(messages);

  return selected.replace(/\{(\w+)\}/g, (_, name) => replacements[name] ?? '');
}

function createTextSprite(text, size = 64, color = '#111827', background = 'rgba(255,255,255,0.9)', canvasSize = 256) {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = canvasSize;
  textureCanvas.height = canvasSize;
  const ctx = textureCanvas.getContext('2d');
  ctx.clearRect(0, 0, canvasSize, canvasSize);
  if (background !== 'rgba(255,255,255,0)' && background !== 'transparent') {
    ctx.fillStyle = background;
    roundedRect(ctx, canvasSize * 0.07, canvasSize * 0.07, canvasSize * 0.86, canvasSize * 0.86, canvasSize * 0.188);
    ctx.fill();
  }
  ctx.fillStyle = color;
  ctx.font = `900 ${size}px Nunito, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvasSize / 2, canvasSize / 2 + canvasSize * 0.051);

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  return new THREE.Sprite(material);
}

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function speakCurrentInstruction() {
  speak(getInstructionText());
}

function speak(message) {
  if (!state.soundEnabled || !('speechSynthesis' in window) || !message) return;
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
  gain.gain.exponentialRampToValueAtTime(0.11, audioContext.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
  oscillator.addEventListener('ended', () => audioContext.close());
}

function playSuccessMelody() {
  [520, 660, 780, 1040].forEach((frequency, index) => setTimeout(() => playTone(frequency, 0.12, 'sine'), index * 120));
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

function hasInput(...keys) {
  return keys.some((key) => state.keys.has(key));
}

function saveState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
    locale: state.locale,
    soundEnabled: state.soundEnabled,
    selectedCharacter: state.selectedCharacter
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
