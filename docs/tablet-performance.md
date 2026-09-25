# Rendimiento en tablets antiguas — 25-09-2026

## Alcance y autorización

La prioridad solicitada es la Samsung SM-T530NU, Android 5.0.2 y Chrome
95.0.4638.75. Se optimizan World of Joy, Fancy Jumping Car / Super Kart Racing,
Jump the Car y Turbo Loop Legends, conservando contenido, obstáculos, progreso,
retos educativos, sonido inicialmente apagado y salida a este catálogo.

Se aplica el modo ligero opcional acordado; no se cambia unilateralmente el
valor inicial de calidad normal. El selector recuerda la elección en el propio
dispositivo. No se modifican Ubuntu, servicios de datos ni infraestructura AWS.

## Causas corregidas

| Juego | Causa comprobada | Corrección |
| --- | --- | --- |
| World of Joy | El límite de 50 ms descartaba tiempo a menos de 20 FPS; miles de mallas independientes para objetos repetidos | Simulación fija, objetos agrupados, actualización limitada de interfaz y descarte de trabajo invisible |
| Fancy Jumping Car | Física dependiente de fotogramas, dos vistas WebGL activas aunque estuvieran ocultas y materiales de estrella marcados para recompilar cada vez | Simulación fija, detención de vistas ocultas, reutilización de materiales y menos escrituras de interfaz |
| Jump the Car | Un paso de física por fotograma y reconstrucción continua de fondos; movimiento a media velocidad a 30 FPS | Simulación fija, fondo e interfaz cacheados y una sola cadena de animación |
| Turbo Loop Legends | Tiempo recortado por la escena y suavizado del motor; geometría de toda la pista procesada cada fotograma | Reloj fijo sin suavizado temporal, descarte fuera de cámara, ruedas en texturas reutilizables y render suspendido en pausas |

Las simulaciones mantienen el comportamiento de referencia a 60 Hz entre
10 y 60 FPS. Eso evita la cámara lenta involuntaria, pero **no convierte diez
fotogramas dibujados en sesenta**. El trabajo de recuperación de bloqueos largos
está acotado para no provocar una espiral de carga. Jump permite ocho pasos por
fotograma; los otros tres, hasta quince. No se recupera el tiempo de una pausa.

## Evidencia reproducible

- World: 600 frutas pasan de 3.000 mallas a un máximo de 25 lotes; 80 botellas,
  de 480 mallas a seis; 30 gemas, de 270 a un máximo de 30. Se verifican
  cantidades, colisiones, recogida, ocultación y liberación de recursos.
- World, escena de exploración con generación aleatoria normal: las muestras de
  Chromium 95 registran entre 128 y 161 llamadas y unos 208.000–212.000 triángulos
  en la pasada principal.
  El diagnóstico anterior observó unas 767 llamadas y 215.000 triángulos en una
  escena comparable, no idéntica. `renderer.info` no contabiliza ahí la pasada
  de sombras: no es una comparación completa del coste GPU.
  Con DPR1, el modo ligero de World no reduce la resolución: ahorra sombras,
  luces puntuales y desenfoque. Los lotes benefician a ambas calidades.
- Fancy: modo ligero a escala 0,65, aproximadamente el 42,25 % de píxeles del
  modo normal. El HUD pasa de unas 180 escrituras de texto por segundo a 30;
  la animación de estrella no incrementa la versión de sus materiales.
- Jump: modo ligero de 800×400 frente a 1200×600, aproximadamente el 44,4 % de
  píxeles, conservando el mundo lógico. No reconstruye el cielo en 120 dibujos
  consecutivos. Se comparan 14 coches, 100 niveles y seis tipos de obstáculos.
- Turbo: modo ligero como máximo al 70 % de escala, con lado interno mayor
  acotado a 900 píxeles. Mantiene el campo de visión y las coordenadas físicas.
  La escena inicial a 1024×768 en Chromium 95 pasa de unas seis llamadas y
  9.608 triángulos a cinco llamadas y 2.757 triángulos por fotograma. Es una
  medición de esa escena, no una reducción garantizada en toda la pista.

Las pruebas de navegador usan Chromium actual y Chromium 95.0.4630.0 de
escritorio, con vistas de teléfono/tablet, controles reales, cambios de calidad,
pausas, retos y recarga offline. La GPU de las pruebas es SwiftShader por
software. Ni sus FPS ni una ralentización artificial de CPU equivalen a la GPU,
temperatura y memoria de la tablet física; esta última comprobación sigue siendo
necesaria para certificar rendimiento sostenido.

## Segunda revisión después de implementar

Se revisan de nuevo los cambios y se añaden regresiones para los defectos
encontrados: sombras congeladas al alternar calidad; audio habilitado en pestaña
oculta; reloj acumulado al volver; controles superpuestos; reanudación tras la
recomendación de coche; bordes de cámara con zoom; y desplazamiento del canvas al
rotar. Los cambios visuales del modo ligero no eliminan obstáculos o recogibles.

Cada repositorio conserva su propio tooling, sin depender de scripts de otro:

| Repositorio | Validación local |
| --- | --- |
| world-of-joy | `make check check-performance check-browser`; `make measure-render` para contadores de escena |
| fancy-jumping-car | `make check test` |
| jump-the-car | `make check test` |
| turbo-loop-legends | `make check test-e2e`; `make test-performance` para el subconjunto de rendimiento |

`CHROME95_PATH=/ruta/al/Chromium95` selecciona el ejecutable antiguo en las
pruebas de navegador. No hace falta ese navegador para las pruebas de física.

## Criterios propuestos para próximos juegos

Antes de elegir motor o multijugador, comprobar una escena representativa en la
tablet física y medir estabilidad, respuesta táctil, calentamiento y memoria
durante una partida prolongada. Treinta FPS estables pueden ser un objetivo más
realista que exigir sesenta a ese hardware.

Para puzles o juegos 2D sencillos, priorizar Canvas 2D y sprites reutilizados.
Para minikarts 3D, probar primero una escena low-poly con geometría agrupada,
pocas luces y sombras económicas. **Low-poly no garantiza por sí solo buen
rendimiento**: miles de objetos, transparencias, sombras y alta resolución
pueden ser más costosos que el número de polígonos.

El futuro multijugador deberá separar la frecuencia de red, la simulación y el
renderizado. Estas son recomendaciones para una prueba futura, no decisiones de
producto ni autorizaciones para crear servicios o costes.
