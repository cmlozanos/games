# Games

Catálogo infantil: <https://cmlozanos.github.io/games/>. Solo enlaza videojuegos,
en la misma pestaña. Los juegos conservan sus URL públicas; los que viven bajo
`home/` son estáticos y no dependen del catálogo general ni de Ubuntu.

La adaptación del 25-09-2026 incorpora los retos educativos de entrada y cada
diez minutos a los juegos antiguos, con pausas efectivas y regreso a este catálogo.
El Quiz de Animales se sirve también como PWA estática, sin Flask/Mongo ni túnel.
El usuario confirmó el 25-09-2026 que sus perfiles genéricos y progreso se guardan
solo en cada dispositivo: sin sincronizar tablets ni migrar datos antiguos.
La base de datos y el repositorio privados antiguos permanecen intactos.

## Perfiles y retos

El botón «Perfiles y retos» permite configurar este navegador, sin cuentas,
nombres ni detección del modelo de tablet. Aprendiz propone los retos mínimos;
Avanzado añade lectura. La lectura se puede seleccionar en ambos perfiles y
nunca elimina sumas, restas o trazos. Se guarda solo al pulsar «Guardar en esta
tablet», con una cookie de un año compartida por los juegos de este mismo sitio.
Si falta la cookie, es inválida o ha caducado, se mantienen los retos mínimos.
La interfaz avisa si el navegador bloquea su escritura. «Borrar perfil» vuelve
a los mínimos sin borrar el progreso de los juegos.

Para la Lenovo hay que configurarlo una vez desde su navegador. El perfil no
se sincroniza con otros dispositivos ni equivale a una cuenta de niño. No es un
control parental: el catálogo permanece accesible y no se añade contraseña.
El usuario confirmó este alcance y la selección de un único reto aleatorio
entre los habilitados antes de implementar esta ampliación.

`make test-profiles` comprueba los controles, persistencia, mínimos obligatorios
y cookies ausentes, malformadas, caducadas o bloqueadas. Admite `CHROME95_PATH`;
los mismos casos se pueden ejecutar en WebKit con
`npx --no-install playwright test tests/profile-settings.spec.cjs --browser=webkit`.

## Burbujas

[Jugar a Burbujas](https://cmlozanos.github.io/games/burbujas/): adaptación autorizada
de una base MIT, con gráficos propios, rebotes, grupos de tres, caída de grupos
sin apoyo y techo descendente. Incluye retos educativos, sonido inicial apagado,
modo ligero predeterminado e instalación PWA. [Código y pruebas](burbujas/README.md).

## Buscaminas

[Jugar a Buscaminas](https://cmlozanos.github.io/games/buscaminas/): adaptación
MIT de Emoji Minesweeper, con créditos y gráficos propios. Incluye tableros
6×6/5 minas y 8×8/10 minas, primer toque y vecinos seguros, botones para
descubrir/banderas, perfiles y retos cada diez minutos, sonido inicialmente
apagado y PWA offline. Sin analítica ni recursos remotos durante el juego.
[Alcance aprobado, licencias y pruebas](buscaminas/README.md).
Sus herramientas son autónomas: `make -C buscaminas check test-browser`;
`CHROME95_PATH=/ruta/al/Chromium95 make -C buscaminas test-browser` selecciona
el motor antiguo. `make -C buscaminas test-published` valida la URL desplegada.

## Desarrollo

La corrección solicitada el 27-09-2026 evita menús de pulsación larga y selección
accidental en el catálogo, Little Chef y Burbujas. Conserva la edición de los
campos y no cancela globalmente los gestos táctiles. `make test-touch` verifica
la protección y las excepciones; admite `CHROME95_PATH`. Los recursos y sus
cachés se publican con la versión `20260927-2`.

`make install-tests` instala únicamente dependencias de desarrollo.
`make check` valida Little Chef, Burbujas, Buscaminas y los tests del catálogo; `make test` ejecuta
la prueba de navegador. `CHROME95_PATH=/ruta/al/Chromium95 make test` permite
repetirla con el motor antiguo. Little Chef tiene sus comandos específicos en
su propio Makefile, incluidos `check`, `serve` e `icons`.
Las pruebas de Burbujas se ejecutan con `make -C burbujas test-browser`.

Los otros cuatro directorios de juegos son submódulos y tienen tooling propio.
`make init` los obtiene; `make update` cambia sus revisiones y no debe ejecutarse
como un paso de validación de solo lectura.

Las pruebas de escritorio con Chromium 95 no sustituyen la comprobación final
en la Samsung SM-T530NU (Android 5.0.2), especialmente para WebGL.

## Próxima fase

[Propuesta AWS multijugador](docs/multiplayer-aws-proposal.md): alternativas,
restricciones de navegador, privacidad y plan de prueba. No se ha seleccionado
arquitectura ni aprovisionado infraestructura o costes.

[Alcance de esta adaptación](docs/legacy-adaptation.md).

[Optimización para tablets antiguas y criterios para próximos juegos](docs/tablet-performance.md).
