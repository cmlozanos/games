# Procedencia del núcleo de Buscaminas

`src/core.js` adapta partes de **emoji-minesweeper**, de Mu-An Chiou, bajo licencia MIT:

- Repositorio: https://github.com/muan/emoji-minesweeper
- Revisión fijada: `2187e371e9a0f87cf54a207031760fc33b858a9a` (20 de octubre de 2019).
- Código de referencia: https://github.com/muan/emoji-minesweeper/blob/2187e371e9a0f87cf54a207031760fc33b858a9a/game.js
- Licencia original: https://github.com/muan/emoji-minesweeper/blob/2187e371e9a0f87cf54a207031760fc33b858a9a/LICENSE
- Aviso preservado: `Copyright (c) 2019 Mu-An Chiou`. El texto MIT completo se distribuye en [LICENSE](LICENSE).

## Partes adaptadas y cambios

- `Game.prototype.shuffle` → `shuffle`: conserva el bucle Fisher–Yates; recibe una función aleatoria inyectable y comprueba su rango.
- `Game.prototype.bomb_array` y el cómputo de vecinos de `init` → `placeMines` y `neighbours`: colocan un número exacto de minas, separan datos de DOM y corrigen los límites de filas/columnas para tableros rectangulares.
- Primer clic de `bindEvents` → `reveal`/`placeMines`: en lugar de regenerar hasta evitar una mina, baraja únicamente posiciones fuera de la celda inicial y sus vecinos. La capacidad se valida al crear el tablero; no hay reintentos.
- `Game.prototype.revealNeighbors` → `reveal`: sustituye la recursión por una pila y mantiene la exclusión de celdas abanderadas.
- Alternancia de bandera de `bindEvents` → `toggleFlag`: conserva la alternancia sobre celdas ocultas, sin eventos ni dependencia de pulsación larga.
- `Game.prototype.game` → transiciones de `reveal`: gana al descubrir todas las celdas seguras y pierde al descubrir una mina. Las acciones posteriores a victoria/derrota no modifican el tablero.

No se incorporan la página, estilos, imágenes, iconos, marca, Twemoji, fuentes remotas, Google Analytics ni service worker originales. El núcleo no contiene DOM, temporizadores, eventos, red, almacenamiento, audio ni dependencias externas. No se incluye apertura por doble clic ni apertura automática alrededor de números.

## Contrato y límites

El módulo clásico exporta `window.MinesCore`; CommonJS exporta la misma API: `create(rows, cols, mineCount, random?)`, `reveal(board, index)`, `toggleFlag(board, index)` y `neighbours(board, index)`.

Los índices son lineales, desde cero y por filas. Los estados son `ready`, `playing`, `won` y `lost`; `explodedIndex` vale `-1` hasta perder. `revealedCount` cuenta las celdas efectivamente descubiertas, incluida la mina tocada en una derrota. Solo se revela esa mina en los datos; la interfaz puede mostrar las demás según el estado terminal.

Las banderas no generan minas, no alteran su distribución ni causan victoria por sí solas. Pueden superar el número de minas, igual que en el original. Un toque sobre una bandera no inicia la partida. El generador debe devolver números finitos en `[0, 1)`; si devuelve un valor inválido durante la colocación, el tablero permanece sin modificar. Se rechazan dimensiones/minas inválidas o densidades que no permitan garantizar el área inicial segura para cualquier primer toque.

La exclusión inicial no garantiza que el resto de la partida pueda resolverse sin adivinar: no se incorpora un solucionador. Las pruebas del núcleo no certifican por sí solas el funcionamiento táctil, Chrome 95 ni el modo sin conexión; esas comprobaciones corresponden a la integración.

## Verificación reproducible

Desde este directorio: `node tools/core-check.cjs`.

El script comprueba la exportación para navegador/CommonJS, 4.000 tableros deterministas (perfiles 6×6/5 y 8×8/10 y dos rectángulos), área inicial segura, minas exactas, vecinos y números, banderas, victoria/derrota, invariancia terminal, entradas inválidas y un revelado iterativo de 20.000 celdas. No instala paquetes ni consulta servicios externos.
