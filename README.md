# Eventia

Plataforma web para publicar eventos, buscar actividades e inscribirse. Actividad de Programación Web (URL).

**Demo:** https://eventia-pied.vercel.app · API docs: https://eventia-pied.vercel.app/api/docs

## Requisitos

- Node.js 18+
- npm

## Instalación

```bash
npm install
cp .env.example .env
```

Edite `.env` y cambie `JWT_SECRET`.

## Desarrollo

```bash
npm run start:dev
```

- API: http://localhost:3000/api
- Swagger: http://localhost:3000/api/docs
- Interfaz: http://localhost:3000/

## Usuarios de prueba (semilla)

| Correo | Contraseña | Rol |
| --- | --- | --- |
| admin@eventia.test | admin123 | administrador |
| organizador@eventia.test | organizador123 | organizador |
| organizador2@eventia.test | organizador123 | organizador |
| usuario@eventia.test | usuario123 | usuario |

## Pruebas e2e

```bash
npm run test:e2e
```

Usa la base `data/eventia-e2e.sqlite`.

Cubre (12 tests): login con mensaje genérico, token ausente/inválido/vencido (401), token válido (200), registro que intenta asignarse rol (400), cupo negativo (400), inscripción que supera el cupo, organizador que edita evento ajeno (403) o propio (200), evento cerrado (409) y usuario que consulta inscripción ajena.

## Despliegue (Vercel)

Vercel detecta NestJS sin configuración adicional. Variables necesarias:

| Variable | Valor |
| --- | --- |
| JWT_SECRET | secreto propio (no reutilizar el de `.env`) |
| JWT_EXPIRES | 1h |
| DATABASE_PATH | /tmp/eventia.sqlite |

Limitación: en serverless SQLite vive en `/tmp` y es efímero; los datos se reinician con la semilla en cada arranque en frío. Para persistencia real habría que usar una base gestionada (p. ej. Postgres).

## Nota para revisores

El informe (Actividad 24) menciona cookies HttpOnly y refresh tokens; la implementación sigue `docs/plan-implementacion.md`: JWT Bearer de 1 h guardado en `localStorage`, sin refresh token.
