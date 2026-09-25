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
