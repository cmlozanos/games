# Adaptación de videojuegos — 25-09-2026

## Alcance aprobado

El usuario solicita adaptar los juegos antiguos al reto educativo inicial y cada
diez minutos, hacerlos compatibles con tablets antiguas (Chrome 95), eliminar la
dependencia del servidor Ubuntu y dirigir las salidas de los juegos a
`https://cmlozanos.github.io/games/`. Se mantienen los selectores internos de
vehículo, circuito y modo; no son salidas al catálogo de aplicaciones.

El catálogo `games` conserva las URL públicas de los juegos existentes. Alojar
estáticos en `home` no implica visitar su catálogo de aplicaciones.

## Quiz: decisión pendiente

La versión anterior necesita Flask/Mongo y un túnel. Se ha propuesto una versión
estática con progreso local por dispositivo y perfiles sin datos personales.
No se exportará ni eliminará la base de datos antigua ni se publicará el repositorio
privado. La política de conservación/sincronización requiere confirmación.

## AWS futuro

La preparación multijugador es una propuesta de arquitectura, no infraestructura
desplegada. No se crean cuentas, recursos, permisos ni costes AWS en esta fase.

## Verificación

Las pruebas con Chromium 95 de escritorio comprueban el motor del navegador,
no la GPU, memoria ni teclado de la Samsung SM-T530NU. La prueba final en esa
tablet sigue siendo necesaria; no se presenta emulación como hardware real.
