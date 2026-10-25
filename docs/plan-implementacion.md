# Plan de implementación — Eventia

Especificación para implementar Eventia. Actividad universitaria de Programación Web (URL, Ing. Manuel Rojas). Construir la versión **ya segura**. No implementar las APIs inseguras de la actividad 23 para luego parcharlas.

El repo parte de cero. Actividades de referencia: `docs/Actividad 22 P Web.pdf`, `docs/Actividad 23 P Web.pdf`, `docs/Actividad 24 P Web.pdf`.

## Fuera de este trabajo

No redactar la tarea escrita del grupo: inspección de certificados HTTPS, ensayos OWASP, matriz o diagrama para el docente, capturas de Postman, respuestas a las preguntas finales.

## Stack

- NestJS + TypeScript
- SQLite + TypeORM (`synchronize: true`, sin migraciones)
- JWT con Passport. Expira en 1 h. El cierre de sesión borra el token en el cliente. Un JWT sin estado no se revoca hasta que vence.
- bcrypt para contraseñas
- `ValidationPipe` global: `whitelist: true`, `forbidNonWhitelisted: true`
- Secretos solo en `.env`. Commitear `.env.example`. Ignorar `.env` y el archivo SQLite.
- Swagger en `/api/docs`
- Frontend: `public/index.html` + `public/app.js` servidos por Nest. Sin React, sin Angular, sin framework CSS.

Puerto 3000. Misma origen: no configurar CORS.

## Modelo de datos

`User`

- `id`
- `nombre`
- `correo` único
- `passwordHash` (nunca sale en JSON)
- `rol`: `usuario` | `organizador` | `administrador`
- `telefono` opcional

`Evento`

- `id`
- `titulo`
- `descripcion` opcional
- `fecha` (ISO)
- `cupo` entero
- `precio` número
- `organizadorId`
- `estado`: `abierto` | `cerrado`

`Inscripcion`

- `id`
- `eventoId`
- `usuarioId`
- `cantidad`
- única por (`eventoId`, `usuarioId`)

`disponibles` no es columna. Se calcula: `cupo - suma(cantidad)`.

## Autenticación y autorización

- `POST /api/usuarios` siempre crea `rol = usuario`. Si el cuerpo trae `rol`, `passwordHash`, `id` u otro campo no declarado, responder 400 (`forbidNonWhitelisted`).
- El `organizadorId` de un evento y el `usuarioId` de una inscripción salen del JWT, nunca del cuerpo.
- El guard comprueba autenticación y rol. El servicio comprueba el dueño del recurso. Tener el rol no autoriza a operar sobre un recurso ajeno. El administrador no salta la comprobación de dueño en eventos ni inscripciones.
- Contraseña mínima: 6 caracteres.
- Login: el mismo mensaje si el correo no existe o la clave falla — `Credenciales inválidas` — y 401.
- Tope de login: 5 intentos por correo en 15 minutos, en un `Map` en memoria; al sexto, 429. Dejar en código el comentario `ponytail: mapa en memoria, por proceso; si hay más de una instancia, pasar a un almacén compartido`.
- Errores al cliente sin stack ni SQL. Un filtro convierte lo no controlado en 500 con `Error interno`.
- Token ausente, inválido o vencido: 401. El guard de Passport ya rechaza el vencido; no hace falta otro mecanismo.

Semilla al arrancar, solo si no hay usuarios:

| correo | clave | rol |
| --- | --- | --- |
| admin@eventia.test | admin123 | administrador |
| organizador@eventia.test | organizador123 | organizador |
| organizador2@eventia.test | organizador123 | organizador |
| usuario@eventia.test | usuario123 | usuario |

Datos de semilla: un evento abierto del primer organizador (cupo 10), un evento cerrado del mismo, una inscripción del usuario en el evento abierto (cantidad 1). Sirve para probar dueño ajeno sin crear datos a mano.

## Reglas de negocio

- Título no vacío. Cupo entero > 0. Precio >= 0. Cantidad entera de 1 a 5.
- No se puede inscribir si el evento está cerrado, si ya existe inscripción de ese usuario, o si `suma + cantidad` pasa el cupo. Esas tres: 409.
- La suma se recalcula dentro de una transacción al inscribir. Comentario en código: `ponytail: SQLite serializa escrituras; la transacción basta aquí. Con Postgres, bloquear la fila del evento`.
- Evento cerrado: cualquier `PUT` posterior responde 409, incluido reabrirlo. Cerrarlo es un `PUT` mientras sigue abierto, con `estado: cerrado`.
- `GET` de usuario no incluye `passwordHash`.

## Permisos

| Operación | visitante | usuario | organizador | administrador |
| --- | --- | --- | --- | --- |
| Ver eventos | sí | sí | sí | sí |
| Registrarse, login | sí | sí | sí | sí |
| Inscribirse | no | sí | sí | sí |
| Ver sus inscripciones | no | solo las suyas | solo las suyas | solo las suyas |
| Ver una inscripción por id | no | solo si es suya | solo si es suya | solo si es suya |
| Crear evento | no | no | sí | no |
| Editar evento | no | no | solo el suyo y solo si está abierto | no |
| Ver participantes de un evento | no | no | solo si el evento es suyo | no |
| Listar usuarios y cambiar rol | no | no | no | sí |
| Ver un usuario por id | no | solo el propio | solo el propio | cualquiera |

Editar un evento ajeno: nadie. 403. Ser organizador no alcanza.

Si el recurso no existe: 404. Si existe y no es suyo: 403. Ese 403 revela que el id existe; es aceptable en esta actividad.

## Endpoints

Prefijo `/api`. Respuestas de usuario: `{ id, nombre, correo, telefono, rol }`.

### POST /api/usuarios

Registro. Público.

Cuerpo: `nombre`, `correo`, `password`, `telefono` opcional.

- 201 usuario sin `passwordHash` y sin token
- 400 datos inválidos o campos de más
- 409 correo ya registrado

### POST /api/auth/login

Público. Cuerpo: `correo`, `password`.

- 200 `{ accessToken }`
- 401 `Credenciales inválidas`
- 429 demasiados intentos

### GET /api/eventos

Público. Query opcional `q`: el título contiene ese texto, sin distinguir mayúsculas.

Cada ítem: `id`, `titulo`, `descripcion`, `fecha`, `cupo`, `precio`, `estado`, `organizadorId`, `disponibles`.

### GET /api/eventos/:id

Público. Misma forma que un ítem de la lista. 404 si no existe.

### POST /api/eventos

Rol `organizador`.

Cuerpo: `titulo`, `fecha`, `cupo`, `precio`, `descripcion` opcional. `estado` no se envía: nace `abierto`. `organizadorId` lo pone el servidor.

- 201 evento creado
- 400 datos inválidos (cupo <= 0, precio < 0, título vacío, campos de más)
- 401 sin token válido
- 403 rol distinto de organizador

### PUT /api/eventos/:id

Rol `organizador` y dueño del evento. Mismos campos editables que el alta, más `estado` (`abierto` no aplica si ya está cerrado; solo se acepta pasar a `cerrado` mientras está abierto).

- 200 evento actualizado
- 400 datos inválidos
- 401 sin token válido
- 403 no es el dueño, o el rol no es organizador
- 404 no existe
- 409 el evento ya está cerrado

### POST /api/eventos/:id/inscripciones

Cualquier usuario autenticado. Cuerpo: `cantidad`.

- 201 `{ id, eventoId, usuarioId, cantidad }`
- 400 cantidad fuera de 1..5
- 401 sin token
- 404 evento inexistente
- 409 cerrado, cupo insuficiente o el usuario ya está inscrito

### GET /api/inscripciones/mias

Autenticado. Solo las del JWT. Registrar esta ruta antes de `GET /api/inscripciones/:id`.

### GET /api/inscripciones/:id

Autenticado. Solo si `usuarioId` es el del JWT.

Respuesta: `id`, `eventoId`, `usuarioId`, `cantidad`, `nombre`, `correo` del inscrito.

- 401, 403 si es de otro, 404 si no existe

### GET /api/eventos/:id/participantes

Rol `organizador` y dueño del evento.

Cada ítem: `id` de la inscripción, `usuarioId`, `nombre`, `correo`, `cantidad`. Sin teléfono ni hash.

- 401, 403 si no es el dueño, 404 si el evento no existe

### GET /api/usuarios/:id

El propio usuario, o cualquiera si el rol es administrador.

- 401, 403, 404

### GET /api/usuarios

Solo administrador. Lista sin `passwordHash`.

### PATCH /api/usuarios/:id/rol

Solo administrador. Cuerpo: `{ rol }` con uno de los tres valores.

- 200 usuario actualizado
- 400 rol inválido
- 401, 403, 404

No hay `DELETE`. No hay refresh token.

## Situaciones de la actividad 24

- A. Un organizador modifica un evento de otro: rechazar. Comprobar JWT, rol organizador y `organizadorId === usuario del token`. 403.
- B. Un usuario consulta una inscripción de otra persona: rechazar. Comprobar JWT y `inscripcion.usuarioId === usuario del token`. 403.
- C. Un administrador opera con token vencido o inválido: rechazar antes de mirar el rol. 401.
- D. Un organizador modifica un evento propio ya cerrado: rechazar. Dueño válido, estado `cerrado`. 409.

El control de acceso es RBAC (rol en el guard) más la relación con el recurso (dueño en el servicio). No implementar ABAC ni ReBAC como frameworks.

## Estructura

```
src/
  main.ts
  app.module.ts
  auth/
  users/
  events/
  inscriptions/
public/
  index.html
  app.js
test/
  eventia.e2e-spec.ts
.env.example
```

`main.ts`: pipe de validación, filtro de errores, Swagger, archivos estáticos de `public/`.

`.env.example`:

```
JWT_SECRET=cambia-esto
JWT_EXPIRES=1h
```

Base de datos en `data/eventia.sqlite` (gitignored).

## Frontend

Una página. Token en `localStorage` con la clave `eventia_token`. `fetch` con `Authorization: Bearer`.

Formularios: registro, login, búsqueda de eventos, crear evento, inscribirse (id de evento + cantidad), botón de salir que borra la clave. Mostrar el status y el cuerpo de error en un `div`. Nada más.

## Orden de trabajo

1. Proyecto Nest, TypeORM SQLite, pipe, filtro, `.env.example`, `.gitignore`.
2. Entidades y semilla.
3. Registro y login.
4. Eventos: listado, alta, edición con dueño y evento cerrado.
5. Inscripciones con transacción y cupo. Participantes.
6. Usuarios: lectura sin hash, cambio de rol.
7. HTML.
8. El test de abajo.
9. README corto: instalar, copiar `.env`, `npm run start:dev`, credenciales de semilla, `npm run test:e2e`.

## Prueba

Un solo archivo e2e con supertest. Afirmar códigos HTTP, no el texto del mensaje (salvo el login, que debe ser el mismo en correo inexistente y clave mala).

- Crear evento con cupo negativo: 400.
- Inscripción que supera el cupo: 409.
- Organizador edita evento de otro organizador: 403.
- Usuario lee inscripción de otro: 403.
- Ruta privada con token inválido: 401.

## No construir

Microservicios, Docker, refresh tokens, OAuth u OpenID, rate limit distribuido, UI pulida, más tests que el archivo de arriba. Agregar eso solo si la clase lo pide después.
