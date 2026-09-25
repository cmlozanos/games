# Burbujas: alcance, procedencia y evidencia

## Confirmación

El usuario aprobó adaptar **ssrtist/bubble-shooter (MIT)** dentro de `games`, con
nombre Burbujas, gráficos propios, retos educativos, PWA y compatibilidad Chrome95.
Confirmó que debe conservar las funcionalidades y el objetivo, y tener un acabado
cuidado. También aprobó el modo ligero predeterminado en los juegos optimizados y
su publicación una vez completados. No se cambian elecciones de calidad guardadas,
progreso previo, infraestructura Ubuntu ni AWS.

## Bases examinadas

- `ssrtist/bubble-shooter`, revisión `c479d9fb3dd3cc427e41c814b35337afa2b859d0`:
  licencia MIT coherente, HTML/CSS/JS sin motor necesario, lógica de vecinos y
  conectividad reutilizable. Los tres archivos originales suman 23.053 bytes.
- `Rembound/Bubble-Shooter-HTML5`: descartado por diferencias entre la licencia
  de raíz y la cabecera GPL del código, que requieren aclaración antes de reutilizar.
- `Rajspeaks/bubble-shooter`: descartado por similitud con la anterior y dudas
  sobre la procedencia de código e imagen. No se han copiado sus recursos.

La referencia comercial orienta las reglas, no aporta imágenes, música ni marcas.
Se conserva el reconocimiento del autor MIT en el núcleo y en THIRD_PARTY.md.

## Prueba de la base y adaptación

La inspección y ejecución aislada de la base detectaron: movimiento por frame,
reinicios que suman cadenas de animación/listeners, victoria comprobada antes de
borrar el último grupo, soporte flotante retenido por burbujas ya eliminadas y
encaje en una casilla global lejana o sobre una ocupada. Se sustituyeron estos
comportamientos por un núcleo reproducible con reloj fijo, colisión barrida,
encaje vecino y resolución síncrona de grupos, conectividad y victoria.

Se conservan disparo, rebote, unión de al menos tres, caída de grupos desconectados,
puntuación y objetivo de vaciar el tablero. El techo desciende una fila cada cinco
disparos, con indicador visual y línea de peligro. Cada nivel es reproducible al
reiniciarlo. Las burbujas tienen símbolos además del color; no hace falta leer para
apuntar, jugar, pausar, reintentar o continuar.

Canvas2D con sprites precalculados y tablero estático cacheado evita crear
gradientes por burbuja y por frame. Una sola cadena de animación trabaja durante
el disparo, los efectos o las teclas de dirección. No hay frames continuos en
reposo, menú, pausa, pestaña oculta o reto. Ligero usa 500×724 píxeles y limita los
efectos, sin modificar física ni reglas. No hay bibliotecas ni fuentes remotas
necesarias para ejecutar el nuevo juego.

## Reproducir validación

Desde `burbujas`: `make install`, `make check` y `make test-browser`.
Para motor antiguo: `CHROME95_PATH=/ruta/a/Chromium make test-browser`.
Desde `games`: `make check` y `make test` para la integración del catálogo.
Todos los comandos quedan documentados en los Makefile de sus propios proyectos.

El núcleo supera pruebas a 10/15/30/60/120 FPS, un barrido de 25 tableros y una
partida ganadora reproducible del primer nivel: 49 disparos, 1.300 puntos y ninguna
burbuja restante tanto a 10 como a 60 FPS. Esta ruta verifica una partida real;
no se sustituye el tablero por un estado de victoria. Los tests de interfaz usan
además pequeñas respuestas HTTP de prueba para ejercitar los botones de victoria
y derrota sin añadir mecanismos de desbloqueo al código publicado.

Validación final local del 25-09-2026: `make check` verde; navegador actual y
Chromium 95 en 360×740, 1024×768 y 844×390 verdes. Se comprobaron entradas táctiles
y teclado, cachés de tablero/sprites, reposo sin frames, un único RAF tras reinicios,
audio real suspendido durante pausa/ocultación/reto, conservación de calidad,
recarga sin conexión, victoria, derrota y siguiente nivel. El catálogo mantiene
sus 16 enlaces anteriores y añade Burbujas: las dos pruebas de integración de
catálogo y Little Chef pasan también con Chromium 95.

Las pruebas de escritorio no equivalen a una medición física en la Samsung
SM-T530NU. Se comprueban APIs, reglas, pausa, caché, entrada táctil y distribución
de controles; FPS sostenidos y temperatura deben contrastarse en el dispositivo.
