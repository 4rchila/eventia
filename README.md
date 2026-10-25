# Eventia

Plataforma web para publicar eventos, buscar actividades e inscribirse. Actividad de Programación Web (URL).

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
