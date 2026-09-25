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

## Burbujas

[Jugar a Burbujas](https://cmlozanos.github.io/games/burbujas/): adaptación autorizada
de una base MIT, con gráficos propios, rebotes, grupos de tres, caída de grupos
sin apoyo y techo descendente. Incluye retos educativos, sonido inicial apagado,
modo ligero predeterminado e instalación PWA. [Código y pruebas](burbujas/README.md).

## Desarrollo

`make install-tests` instala únicamente dependencias de desarrollo.
`make check` valida Little Chef, Burbujas y los tests del catálogo; `make test` ejecuta
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
