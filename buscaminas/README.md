# Buscaminas

Juego familiar estático: https://cmlozanos.github.io/games/buscaminas/

## Alcance aprobado — 28 de septiembre de 2026

El usuario confirmó adaptar la base MIT de Mu-An Chiou con gráficos propios,
créditos, tableros 6×6/5 minas y 8×8/10 minas, primer toque y vecinos seguros,
controles táctiles explícitos, separación inferior para gestos Android, retos
educativos, sonido inicial apagado, modo ligero y publicación en Games.
No se modifican los demás juegos, Ubuntu ni AWS.

La [procedencia y revisión exacta](THIRD_PARTY.md) y la [licencia MIT](LICENSE)
acompañan al núcleo adaptado. Los pictogramas de lectura mantienen su licencia
independiente [ARASAAC CC BY-NC-SA 4.0](READING_ASSETS.md), para uso no comercial.
No se copian la analítica, fuentes, CDN, imágenes ni página del proyecto original.

## Jugar

- Se empieza en 6×6. Toca el botón de la mano para descubrir; el de la bandera
  cambia a marcar/quitar banderas. Un toque sobre una bandera no descubre la casilla.
- Los números indican las minas de las ocho casillas vecinas. Un cero descubre
  el área vacía conectada. Se gana al descubrir todas las casillas sin minas;
  las banderas por sí solas no ganan. Una mina termina la partida sin animaciones
  estridentes. Se puede volver a intentar inmediatamente.
- El primer toque y sus vecinos nunca contienen minas. No hay solucionador:
  otras situaciones pueden requerir adivinar, como en el Buscaminas clásico.
- Ganar el tablero inicial ofrece directamente 8×8; ambos tamaños también se
  seleccionan con sus botones. Reiniciar crea otro tablero aleatorio.
- Con teclado, las flechas recorren celdas, Intro/espacio actúan y F cambia
  descubrir/bandera. Los nombres accesibles no revelan minas ocultas.
- Las casillas miden al menos 44 píxeles CSS. El tablero avanzado se desplaza
  dentro de su marco en teléfonos estrechos; el documento no desborda horizontalmente.
  Se reserva un margen inferior de 64 px más la zona segura informada por el navegador.
  En pantallas muy bajas puede ser necesario desplazarse verticalmente.

## Retos y privacidad

Se reutiliza el componente educativo sin modificarlo: un reto al entrar y cada
600.000 ms de reloj real, aunque se oculte la aplicación. En Games se eligen de uno
a cuatro tipos: sumas, restas, trazos y lectura de 100 palabras cortas. Solo se
proponen los seleccionados; sin cookie válida se usan sumas, restas y trazos.
Durante el reto no se puede
actuar sobre el tablero y se detiene el sonido. Al resolverlo se conservan las
casillas y el modo elegidos; si falta el componente, el juego queda bloqueado.

No hay cuentas, publicidad, telemetría, peticiones externas de juego ni progreso
remoto. Cada entrada inicia un tablero nuevo y el sonido está apagado. No se
añaden claves de almacenamiento ni cookies distintas del perfil educativo existente.
El enlace de casa vuelve a Games, no al catálogo general de aplicaciones.

## Rendimiento e instalación

El modo ligero es el único necesario: HTML/CSS/JS sin motor gráfico ni framework.
Se actualizan como máximo 64 casillas cuando ocurre una acción; no existe un
bucle de animación o simulación en reposo. Los efectos opcionales se sintetizan
con Web Audio y se detienen al ocultar, salir o bloquear el juego.

La PWA funciona con HTTPS y se instala con ámbito `./`. La primera carga debe
completarse con conexión; precarga el juego, los retos y los 100 PNG de lectura
(935.825 bytes). Los archivos de juego usan versión `20260928-3`; perfil y reto
usan `20260928-4`, y el banco de palabras conserva `20260928-1`. La caché del juego
se actualiza a `buscaminas-20260928-4` para aplicar las nuevas preferencias offline.

La caché conserva versiones exactas: no sirve un JS antiguo como uno nuevo ni
devuelve HTML para un script ausente. Una instalación incompleta no activa la
nueva versión. Solo limpia cachés con prefijo `buscaminas-`, nunca las de otros juegos.

## Herramientas propias

Node.js y Python 3 son herramientas de desarrollo, no requisitos de la tablet.
Las dependencias fijadas de npm son solo de pruebas y generación de iconos.

```sh
make install             # npm ci público, sin scripts de instalación
make icons               # icon.svg propio → PNG 192 y 512
make check               # núcleo, licencias, presupuesto, assets, PWA/caché
make test-browser        # navegador actual; servidor local efímero
make test-published      # mismo recorrido contra GitHub Pages
make serve               # localhost:8095
CHROME95_PATH=/ruta/Chromium make test-browser
BROWSER=webkit make test-browser
SCREENSHOT_DIR=/ruta/capturas make test-browser
```

`make sync-gates LEARNING_SOURCE=/ruta/canonica/learning-gate` copia explícitamente
el componente compartido y los pictogramas; ningún check depende de otro proyecto.
Cambiar el banco de imágenes también exige revisar la lista precargada de `sw.js`.

Las pruebas del núcleo cubren 4.000 tableros, rectángulos, conteos, primer área
segura, banderas, victoria/derrota, invariancia terminal y expansión sin recursión.
Las de navegador resuelven los retos mediante su UI y juegan partidas completas:
entrada bloqueada, banderas, teclado, rotación, victoria, siguiente tablero,
derrota/reintento, bloqueo exacto a diez minutos, conservación del estado, sonido,
reposo, recarga offline y lectura. También bloquean deliberadamente el script
educativo para comprobar que el juego no permite saltarse el reto.

En Chromium se simula el modo sin conexión del navegador. En WebKit se cortan
todas las respuestas del servidor local: su emulación offline devuelve un error
interno antes de la navegación del service worker. La recarga y los retos con el
servidor inaccesible sí se verifican. La prueba publicada requiere Chromium.

La compatibilidad objetivo incluye Chrome 95 y navegadores actuales. Las pruebas
de escritorio no certifican los gestos del sistema, instalación, temperatura o
rendimiento sostenido de la Lenovo ni de la Samsung SM-T530NU físicas.

Validación del 28-09-2026: `make check` del catálogo y sus 13 pruebas de navegador
pasaron con Chromium 95.0.4630.0. El recorrido propio completo pasó también con
Chromium 151.0.7922.34 y WebKit 26.5, en 1280×800, 800×1280, 320×640 y 740×360.
En tablet horizontal se comprobó que ambos tamaños de tablero caben sin scroll
vertical. HTML/CSS/JS de ejecución: 75.408 bytes, imágenes de lectura aparte.
