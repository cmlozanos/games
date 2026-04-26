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

The game uses Three.js from a CDN import map. It builds the kitchen, chef, ingredients, lighting, shadows, particle effects, and UI labels procedurally, so no binary assets are required.
