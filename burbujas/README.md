# Burbujas

Juego familiar de burbujas para el catálogo personal: https://cmlozanos.github.io/games/burbujas/

El alcance aprobado es adaptar la base MIT **Neon Bubble Shooter, de ssrtist**, conservando sus mecánicas y creando una presentación pulida para tablet y teléfono. La procedencia, revisión exacta y licencias están en [THIRD_PARTY.md](THIRD_PARTY.md); no se presenta el trabajo original como creación propia.

## Jugar

Apunta con el dedo o el ratón y suelta para disparar. Las burbujas rebotan en las paredes; unir tres o más del mismo color elimina el grupo. Las burbujas que quedan desconectadas del techo caen. Vacía el tablero antes de que las burbujas alcancen la parte inferior.

Con teclado, las flechas izquierda/derecha apuntan, espacio dispara y Escape pausa.
El techo baja una fila cada cinco disparos; los cinco puntos del marcador avisan
del próximo descenso. Se obtienen 10 puntos por burbuja unida y 20 por caída.
Al ganar aparece directamente el botón del siguiente tablero; al perder se puede
repetir la misma distribución. El número de nivel se guarda solo en el dispositivo.

El modo ligero es el predeterminado; el botón de hoja permite cambiarlo y recuerda
la elección. Ambas calidades tienen exactamente las mismas reglas y física. Los
sprites y el tablero se precalculan y se reutilizan; el juego deja de dibujar en
reposo. Ocultar la pestaña o abrir un reto detiene simulación y sonido sin perder
el estado ni cancelar una pausa manual. La resolución ligera es 500×724 y los
efectos visuales simultáneos se limitan a 36.

El reto educativo local se exige al entrar y cada diez minutos: sumas/restas sencillas o trazado de letras. El juego debe permanecer bloqueado si el componente educativo no carga. El sonido empieza apagado y los controles utilizan iconos. No hay cuenta, publicidad ni dependencia de servicios remotos de juego.

## Instalación y funcionamiento sin conexión

La PWA utiliza `scope: ./` y `start_url: ./`, con iconos PNG de 192 y 512 píxeles, para instalarse desde `/games/burbujas/`. La primera carga necesita conexión; una vez instalado completamente el service worker, el juego y el reto se sirven desde sus recursos locales.

La navegación intenta la red y vuelve al índice precargado si no está disponible. Los recursos se identifican por su URL/version exacta: una versión nueva no recibe un recurso de una caché antigua. Si falta cualquier archivo obligatorio, la instalación de la nueva caché falla y no sustituye una versión completa anterior. Solo se eliminan cachés `burbujas-*`, nunca las de otros juegos. No se usa CDN en ejecución.

## Herramientas autónomas

Requisitos de desarrollo: Node.js compatible con las versiones fijadas de las dependencias y Python 3 para servir archivos localmente. Estas herramientas no se necesitan en la tablet.

```sh
make install       # npm ci público --ignore-scripts; dependencias locales de desarrollo
make icons         # regenera únicamente icons/icon-192.png e icon-512.png
make check         # núcleo, sintaxis, gate, manifiesto, PNG y caché aislada
make test-browser  # servidor efímero y pruebas reales de navegador
make test-published # mismas pruebas contra la URL de GitHub Pages ya publicada
make serve         # http://127.0.0.1:8094; Ctrl+C para terminar
```

Las pruebas usan el navegador local de Playwright. Si no está instalado, `make install-browser` lo prepara. `CHROME95_PATH=/ruta/a/Chromium make test-browser` permite usar Chrome 95. Los scripts, Makefile, dependencias y lockfile pertenecen a esta carpeta; no se utilizan los de otro juego.

El lockfile conserva versiones e integridades de npm público. `make install` selecciona explícitamente `https://registry.npmjs.org` y desactiva scripts de instalación; no modifica la configuración global ni requiere un registro corporativo. `make icons` usa exclusivamente el SVG local y las dependencias de desarrollo instaladas.

La compatibilidad objetivo incluye Android 5.0.2/Chrome 95 (Samsung SM-T530NU), además de navegadores actuales. Las pruebas de Chromium 95 de escritorio verifican comportamiento y APIs, pero no certifican los FPS, el consumo de memoria ni la instalación en el hardware físico. Esas comprobaciones requieren la tablet real. El service worker necesita HTTPS o localhost.
