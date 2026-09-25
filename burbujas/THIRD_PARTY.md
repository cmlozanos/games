# Créditos y licencias

## Base de juego: Neon Bubble Shooter

- Autor: **ssrtist**.
- Repositorio: https://github.com/ssrtist/bubble-shooter
- Revisión fijada: `c479d9fb3dd3cc427e41c814b35337afa2b859d0`.
- Código de referencia: https://github.com/ssrtist/bubble-shooter/tree/c479d9fb3dd3cc427e41c814b35337afa2b859d0
- Licencia original MIT: https://github.com/ssrtist/bubble-shooter/blob/c479d9fb3dd3cc427e41c814b35337afa2b859d0/LICENSE
- Copyright original: `Copyright (c) 2026 ssrtist`.

`src/core.js` adapta la red hexagonal y sus vecinos, la búsqueda de grupos del mismo color y la detección de burbujas desconectadas. Burbujas conserva las mecánicas de apuntar/disparar, rebote en paredes, grupos de tres o más y caída de los grupos flotantes. El código adaptado está identificado en su cabecera; la licencia MIT original completa se conserva allí y en `LICENSE`.

La presentación, los controles, la integración educativa, el icono y el empaquetado PWA de esta adaptación se desarrollan para Burbujas. El cambio de nombre o de estilo no elimina el crédito del proyecto de partida.

## Reto educativo compartido

`learning-gate.js` es una copia autónoma del componente educativo del repositorio familiar, tomada de `games/little-chef-academy/learning-gate.js`. No se carga ese otro juego ni se depende de su servidor. La copia proporciona sumas/restas y trazado de letras, con el bloqueo inicial y periódico.

## Herramientas de desarrollo, no dependencias del juego en ejecución

- `@playwright/test` 1.62.1: pruebas de navegador, licencia Apache-2.0, https://github.com/microsoft/playwright.
- `sharp` 0.35.4: conversión local del SVG propio a iconos PNG, licencia Apache-2.0, https://github.com/lovell/sharp. Sus binarios de desarrollo incorporan libvips y otras dependencias con sus respectivas licencias; se conservan en los paquetes instalados por npm.

Las dependencias de desarrollo y sus licencias se distribuyen a través de npm público y quedan fijadas, con sus integridades, en `package-lock.json`. El tooling no depende de un registro corporativo. `node_modules` no se publica. Los PNG generados no necesitan sharp, libvips, Playwright, un CDN ni un servidor de aplicaciones para funcionar.
