# Multijugador infantil en AWS — propuesta, no implementación

Fecha de investigación: 2026-09-25.

## Estado y límites

Este documento compara alternativas para una futura ampliación multijugador. **No aprueba ni selecciona una arquitectura, región, proveedor de identidad, política de datos o presupuesto.** No se han creado recursos AWS, cuentas, permisos, despliegues ni costes de infraestructura. Tampoco se ha migrado progreso, publicado información infantil ni modificado los juegos para conectarlos a AWS.

La adaptación actual de los juegos a tablets y al reto educativo es independiente de esta propuesta. Añadir multijugador requiere una decisión posterior sobre el juego concreto, su interacción, los dispositivos y la operación del servicio.

## Dos alternativas viables

| Aspecto | API Gateway WebSocket + Lambda + DynamoDB | Servidor persistente con Amazon GameLift Servers |
| --- | --- | --- |
| Interacción candidata | Turnos, preguntas compartidas, acciones discretas o cooperación de baja frecuencia. | Simulación continua y autoritativa, por ejemplo carreras con colisiones compartidas. |
| Estado | Lambda valida cada acción; DynamoDB conserva sala, participantes, versión y estado persistente. | El proceso del servidor mantiene la simulación en memoria; persistencia separada si se acuerda. |
| Sincronización | Mensajes de acciones y cambios de estado a conexiones autorizadas. | Actualizaciones del servidor a clientes, interpolación y recuperación de instantáneas. |
| Complejidad | Menos administración de servidores; hay que diseñar orden, concurrencia e idempotencia de acciones. | Servidor de juego, protocolo, despliegues, capacidad, ubicación de sesiones y supervisión. |
| Riesgo de coste | Minutos conectados, mensajes y difusión a cada destinatario, Lambda, lecturas/escrituras y registros. | Capacidad y tiempo de ejecución de servidores, transferencia y servicios auxiliares. |
| Encaje a demostrar | Una sala pequeña que no necesite un bucle de física de alta frecuencia. | Necesidad real de física continua que la primera opción no satisfaga. |

No se propone ejecutar un bucle de física permanente dentro de Lambda. Tampoco guardar cada fotograma en DynamoDB. GameLift no convierte automáticamente un juego local en multijugador ni elimina la necesidad de escribir un servidor compatible con el navegador.

**Hipótesis para una prueba futura, pendiente de aprobación:** comparar primero una interacción discreta con la opción WebSocket/Lambda; evaluar servidor persistente si se acuerdan carreras o físicas compartidas. No adoptar servicios basándose únicamente en esta hipótesis.

## Contrato mínimo que habría que diseñar

- Creación y entrada a sala, salida explícita y reconexión.
- Versión de protocolo y del estado; identificación de cada acción para evitar duplicados.
- Validación del servidor: sala, pertenencia, acción permitida, límites de frecuencia y tamaño.
- Recuperación de una instantánea completa después de perder mensajes o suspender la tablet.
- Autoridad del servidor sobre puntuación compartida, turnos y colisiones; no confiar en valores enviados por el cliente.
- Límite confirmado de participantes y de salas simultáneas, con comportamiento visible cuando se alcance.
- Si caduca o se cierra una sala, salida comprensible sin borrar el progreso local existente.

API Gateway admite rutas de conexión, desconexión y mensajes. El autorizador Lambda se aplica únicamente a `$connect`: autorizar la conexión **no sustituye** verificar la pertenencia y permisos en cada acción posterior. La retirada de un participante debe impedir nuevas acciones aunque conserve el socket abierto.

## Tablets antiguas y reto educativo

Objetivo a validar: Chrome 95 y el dispositivo Android antiguo indicado por la familia, además de navegadores actuales. La API WebSocket estándar no demuestra por sí sola compatibilidad completa: deben probarse TLS/certificados, suspensión de Android, memoria, red y renderizado en el dispositivo físico.

Se propone mantener el juego cliente independiente de SDK pesados y utilizar un protocolo pequeño sobre `wss://`, con controles táctiles y recursos locales compatibles. La elección de formatos y dependencias necesita una prueba reproducible, no solo una comprobación de sintaxis.

Límites oficiales de API Gateway relevantes:

- Duración máxima de una conexión: dos horas.
- Cierre por inactividad: diez minutos.
- Tamaño máximo de trama: 32 KB; tamaño máximo de mensaje: 128 KB.

Por ello hay que implementar reconexión con espera progresiva, recuperar estado y evitar reenvíos duplicados. No suponer que una conexión dura toda la sesión ni que un mensaje grande se fragmentará correctamente sin comprobarlo.

El reto educativo cada diez minutos puede coincidir con esos cierres. **Falta decidir** si el participante sale temporalmente de la sala, queda ausente mientras los demás continúan o pausa una sala privada completa. Ninguna opción está aprobada. En todas ellas el cliente debe bloquear controles y el servidor impedir acciones del participante bloqueado; la reconexión no debe saltarse el reto. No se propone transmitir al servidor trazos infantiles ni respuestas educativas para lograr esta coordinación.

El multijugador requiere conexión. También falta decidir qué modos seguirán disponibles sin red; no se debe presentar una partida remota como funcional sin conexión ni alterar los modos locales existentes sin acuerdo.

## Seguridad y privacidad infantil: propuestas por confirmar

Posible punto de partida: identificadores aleatorios, avatares predefinidos y salas por invitación, sin directorio público, sin chat público, sin voz, fotos, nombres reales, localización, publicidad ni analítica de terceros. Son **propuestas**, no decisiones ya tomadas.

Una identidad seudónima no equivale a ausencia de datos personales: IP, identificadores persistentes y registros de conexión pueden seguir requiriendo tratamiento de privacidad. Antes de publicar deben confirmarse público, jurisdicciones, responsable del tratamiento, consentimiento o intervención parental cuando corresponda, retención y mecanismos de borrado. Este documento no certifica cumplimiento legal.

Para las invitaciones habría que definir expiración, entropía suficiente, límite de intentos y revocación. Un código breve legible no debería ser por sí solo una autorización permanente. El mecanismo de sesión debe probarse en Chrome 95 y evitar credenciales duraderas en URLs, registros, código público o almacenamiento accesible innecesariamente.

La región AWS, acceso administrativo, cifrado, copias de seguridad y conservación de registros también necesitan confirmación. Se propone mínimo privilegio por servicio y exclusión de tokens, invitaciones, contenido educativo y datos infantiles de los logs.

DynamoDB TTL puede ayudar a limpiar salas caducadas, pero AWS indica que la eliminación puede tardar varios días. **No es un control inmediato de autorización ni una garantía de borrado a una hora exacta.** El servidor debe rechazar el acceso según la fecha de caducidad aun si el registro continúa almacenado. Cualquier compromiso de borrado debe cubrir además copias y logs.

El código o los perfiles privados del antiguo Quiz no se publican ni se exportan por describir estas alternativas. Una eventual migración necesita autorización y un diseño aparte.

## Costes y control operativo

No se incluye una cifra mensual: no se han elegido región, tráfico, concurrencia ni retención. Tampoco se presupone que Free Tier sea aplicable o suficiente.

Para comparar presupuestos en AWS Pricing Calculator se necesitan estos datos aprobados:

| Entrada | Impacto que debe estimarse |
| --- | --- |
| Participantes simultáneos y minutos conectados | Capacidad, minutos WebSocket o tiempo de servidores. |
| Acciones por segundo y receptores por acción | Mensajes entrantes y salientes; la difusión multiplica entregas. |
| Tamaño del mensaje y transferencia | Unidades facturables y tráfico de salida según las tarifas vigentes. |
| Duración y memoria de funciones | Solicitudes y cómputo Lambda. |
| Estado, frecuencia de acceso y retención | Operaciones y almacenamiento DynamoDB, copias si se acuerdan. |
| Frecuencia y retención de logs y métricas | CloudWatch y otros costes de observabilidad. |
| Región y disponibilidad requerida | Tarifas regionales y capacidad mínima de la alternativa persistente. |

AWS Budgets proporciona seguimiento y alertas; no debe presentarse como un tope instantáneo de gasto. La documentación indica que las actualizaciones no son en tiempo real. Antes de una prueba con recursos se necesitan importe máximo aprobado, responsables y destinatarios de avisos, límites técnicos, duración de la prueba y procedimiento confirmado de parada/eliminación. Ninguno se ha configurado.

El alojamiento web puede permanecer en GitHub Pages si se acuerda, consumiendo un backend AWS separado. Si se valora alojarlo en S3, el endpoint de sitio web de S3 no ofrece HTTPS; habría que evaluar una capa HTTPS adicional y sus costes. No se propone cambiar el alojamiento actual en este documento.

## Prueba de concepto futura y criterios de salida

Antes de crear recursos: confirmar un juego, una mecánica, participantes, política de salas/retos, datos, región, presupuesto, cuenta AWS y permiso de despliegue de prueba.

La prueba deberá aportar evidencias reproducibles de:

1. Dos dispositivos reales compartiendo una sala con estado coherente, incluida la tablet antigua.
2. Pérdida de red, suspensión, reconexión, conexión expirada y mensajes duplicados sin acciones o premios repetidos.
3. Reto educativo vencido durante la partida sin filtración de controles ni elusión mediante reconexión.
4. Rechazo de acceso a sala ajena, invitación caducada, mensajes inválidos y exceso de intentos.
5. Latencia, frecuencia de actualización, CPU, memoria y batería observadas en el dispositivo objetivo; los umbrales de aceptación se acordarán según la mecánica.
6. Consumo y coste observado de la prueba comparados con una estimación documentada, sin extrapolar una prueba pequeña como garantía de producción.
7. Borrado/caducidad y comprobación de que los logs no incluyen secretos ni datos infantiles no aprobados.
8. Regresión: el juego individual y su progreso siguen funcionando igual.

Solo después de evaluar estas evidencias se propondría una arquitectura y un plan de publicación. La implementación y el despliegue requieren una aprobación posterior.

## Fuentes consultadas

Consultadas por HTTPS el 2026-09-25. Las páginas de precios son referencias vivas, no cotizaciones ni compromiso de tarifas.

- [API Gateway: funcionamiento de WebSocket](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api-overview.html).
- [API Gateway: cuotas y límites WebSocket](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-execution-service-websocket-limits-table.html).
- [API Gateway: autorización Lambda en WebSocket](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api-lambda-auth.html).
- [Amazon GameLift Servers: introducción](https://docs.aws.amazon.com/gameliftservers/latest/developerguide/gamelift-intro.html).
- [Precios de API Gateway](https://aws.amazon.com/api-gateway/pricing/), [Lambda](https://aws.amazon.com/lambda/pricing/), [DynamoDB](https://aws.amazon.com/dynamodb/pricing/), [GameLift Servers](https://aws.amazon.com/gamelift/servers/pricing/) y [CloudWatch](https://aws.amazon.com/cloudwatch/pricing/).
- [AWS Pricing Calculator](https://calculator.aws/).
- [AWS Budgets: seguimiento de costes](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html).
- [DynamoDB: comportamiento de TTL](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html).
- [S3: endpoints de sitios web y ausencia de HTTPS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteEndpoints.html).
- [MDN: WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) y [constructor](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/WebSocket), documentación de navegador complementaria a las fuentes AWS.
