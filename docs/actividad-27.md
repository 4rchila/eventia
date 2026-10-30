# Actividad 27 — Despliegue, persistencia y Docker

- **URL pública:** https://eventia-pied.vercel.app (API docs: https://eventia-pied.vercel.app/api/docs)
- **Repositorio:** https://github.com/4rchila/eventia

## Arquitectura

```
Producción (Vercel)
  Navegador ──HTTPS──▶ Vercel Function (NestJS: API /api/* + frontend estático public/)
                              │ DATABASE_URL (TLS)
                              ▼
                        Neon PostgreSQL (gestionado)

Local (Docker Compose)
  Navegador ──▶ localhost:3000 ──▶ contenedor app (node:20-slim, dist/ + public/)
                                          │ postgres://db:5432 (red interna de compose)
                                          ▼
                                   contenedor db (postgres:16-alpine)
                                          │
                                          ▼
                                   volumen pgdata (/var/lib/postgresql/data)
```

La app elige la base por entorno: con `DATABASE_URL` usa PostgreSQL; sin ella, SQLite en archivo (desarrollo y pruebas e2e).

## Comandos Docker

```bash
docker compose up -d --build   # construye la imagen y levanta app + db
docker compose ps              # estado de los contenedores
docker compose logs app        # logs de NestJS
docker compose down            # detiene y elimina contenedores; el volumen pgdata se conserva
docker compose down -v         # además borra el volumen (reinicia los datos)
```

## Evidencias

### Docker (comprobado el 2026-10-29, Podman 5 + docker compose)

```
$ docker compose up -d --build
 Container eventia-db-1 Healthy
 Container eventia-app-1 Started

$ docker compose ps
NAME            IMAGE                         COMMAND               STATUS          PORTS
eventia-app-1   eventia-app:latest            "node dist/main.js"   Up 16 seconds   0.0.0.0:3000->3000/tcp
eventia-db-1    postgres:16-alpine            "postgres"            Up 19 seconds   5432/tcp

$ curl localhost:3000/api/eventos        -> 200 (eventos de la semilla)
```

Persistencia (registrar → cerrar → volver a entrar → comprobar):

```
POST /api/usuarios {correo: docker@eventia.test}          -> 201
POST /api/auth/login                                      -> 200
POST /api/eventos/1/inscripciones {cantidad: 2}           -> 201 {"id":2,"eventoId":1,"usuarioId":5,"cantidad":2}

$ docker compose down        # elimina contenedores y red
$ docker volume ls           # local  eventia_pgdata  (se conserva)
$ docker compose up -d

POST /api/auth/login (mismo usuario)                      -> 200
GET  /api/inscripciones/mias                              -> 200 [{"id":2,"eventoId":1,"cantidad":2,"correo":"docker@eventia.test",...}]
```

Imagen resultante: `eventia-app:latest` 332 MB (multi-stage, solo dependencias de producción).

### Vercel + Neon

NEON_PENDIENTE

## Análisis técnico

**1. Plataforma elegida y por qué.** Vercel para la app y Neon para la base. Vercel detecta NestJS sin configuración, despliega en cada push a `main` desde GitHub, da HTTPS y una URL pública gratuita. Neon se integra desde Vercel → Storage e inyecta `DATABASE_URL` automáticamente; es PostgreSQL serverless, compatible con el modelo de funciones de Vercel.

**2. Componentes desplegados y dónde.**

| Componente | Producción | Local |
| --- | --- | --- |
| API NestJS (auth JWT, usuarios, eventos, inscripciones) | Vercel Function | contenedor `app` |
| Frontend estático (`public/`) | servido por la misma función | contenedor `app` |
| Swagger UI | `/api/docs`, assets desde cdnjs | `/api/docs` |
| Base de datos | Neon PostgreSQL | contenedor `db` + volumen `pgdata` |
| Secretos (`JWT_SECRET`) | variables de entorno de Vercel (sensibles) | variable de entorno de compose |

**3. Dificultades.**
- El sistema de archivos de Vercel es efímero: SQLite en `/tmp` se perdía en cada arranque en frío. Se resolvió con PostgreSQL vía `DATABASE_URL`, manteniendo SQLite para desarrollo.
- Los assets de Swagger (`swagger-ui-dist`) no se empaquetan en la función y devolvían 404; se sirven desde CDN.
- Con PostgreSQL varias instancias pueden inscribir a la vez; se añadió bloqueo de fila (`pessimistic_write`) sobre el evento para no sobrepasar el cupo.
- En la máquina de desarrollo el daemon de Docker requería sudo; se usó Podman sin root con `docker compose` apuntando a su socket.

**4. Ventajas de Docker.**
- Entorno reproducible: misma versión de Node y PostgreSQL en cualquier máquina, sin instalar nada salvo Docker.
- Arranque de todo el sistema (app + base) con un comando.
- Imagen multi-stage: la imagen final solo lleva dependencias de producción y `dist/`.
- El volumen separa los datos del ciclo de vida del contenedor: se puede reconstruir la app sin perder información.
- La misma imagen puede desplegarse en cualquier plataforma de contenedores (Render, Fly.io, Cloud Run, etc.).

**5. Mejoras antes de producción real.**
- Reemplazar `synchronize: true` por migraciones de TypeORM versionadas.
- Refresh tokens y cookies HttpOnly en lugar de `localStorage` (tal como plantea el informe de la Actividad 24).
- Rate limiting distribuido (el limitador de login actual es en memoria, por instancia).
- Desactivar la semilla con usuarios de prueba y contraseñas conocidas.
- CORS restringido, cabeceras de seguridad (helmet), logs estructurados y monitoreo de errores.
- CI con pruebas e2e contra PostgreSQL antes de cada despliegue, y copias de seguridad de la base.
