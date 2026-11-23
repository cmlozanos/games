# Versión 2.0.0

Base infantil común: letra ligada local, aspecto público, ajustes con multiplicación, puntos locales de sesión y medición de viewport antiguo. Se conservan los retos de entrada/cada diez minutos y datos previos. Sin audio automático. Nueva apertura con conexión actualiza PWA.

# Little Chef Academy

Educational 3D browser game for children. The implementation uses English names for code, files, and data structures, while all player-facing text is localized in Spanish and English.

## Run Locally

```bash
make serve
```

Then open `http://localhost:7777`.

## Modes

- Words: collect letters in order.
- Numbers: collect the requested quantity.
- Colors: collect ingredients by color.

## Controls

- Keyboard: `W/A/S/D` or arrow keys.
- Touch: on-screen direction buttons.
- Audio: the listen button uses browser speech synthesis in the selected language.

## Rendering

The game uses a local copy of Three.js r160 (MIT license in `vendor/`). It builds the kitchen, chef, ingredients, lighting, shadows, particle effects, and UI labels procedurally. Pixel ratio is limited to one to reduce GPU memory on older tablets. WebGL remains necessary for this 3D game.

The educational gate is local/offline, on entry and every ten minutes. Gameplay,
pending round transitions and input pause while solving; manual pause is preserved.
Sound starts off. The home link returns to the games-only catalogue.
Chrome 95 uses `vh` layout fallbacks and a game-state class instead of CSS `:has()`.

Run `make check` for syntax and offline asset checks; the parent repository's
`make test` runs browser integration checks.

V2 mechanics corrections: required item on an inaccessible rear position moved to side corridor; completion updates final HUD before summary, pending summaries cancel on Home, and retry restores chef position/feedback/cooldown/pause label. `make test-playability` passes40native rounds/five modes using real key-input simulation, without teleport or forcing victory. It is a simulation/DOM proof, not a physical child's usability assessment.
