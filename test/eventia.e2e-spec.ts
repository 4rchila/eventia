import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { rmSync } from 'fs';
import { join } from 'path';
import { sign } from 'jsonwebtoken';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/setup';

describe('Eventia (e2e)', () => {
  let app: INestApplication;

  async function login(correo: string, password: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ correo, password })
      .expect(200);
    return res.body.accessToken as string;
  }

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret';
    const dbPath = join(process.cwd(), 'data', 'eventia-e2e.sqlite');
    rmSync(dbPath, { force: true });
    process.env.DATABASE_PATH = dbPath;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('login: mismo mensaje si correo no existe o contraseña incorrecta', async () => {
    const badEmail = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ correo: 'noexiste@eventia.test', password: 'x' })
      .expect(401);
    const badPass = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ correo: 'usuario@eventia.test', password: 'mal' })
      .expect(401);
    expect(badEmail.body.message).toBe('Credenciales inválidas');
    expect(badPass.body.message).toBe('Credenciales inválidas');
  });

  it('rechaza evento con cupo negativo', async () => {
    const token = await login('organizador@eventia.test', 'organizador123');
    await request(app.getHttpServer())
      .post('/api/eventos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        titulo: 'Mal cupo',
        fecha: new Date().toISOString(),
        cupo: -5,
        precio: 0,
      })
      .expect(400);
  });

  it('rechaza inscripción que supera el cupo', async () => {
    const orgToken = await login('organizador2@eventia.test', 'organizador123');
    const create = await request(app.getHttpServer())
      .post('/api/eventos')
      .set('Authorization', `Bearer ${orgToken}`)
      .send({
        titulo: 'Cupo uno',
        fecha: new Date().toISOString(),
        cupo: 1,
        precio: 0,
      })
      .expect(201);
    const eventoId = create.body.id as number;

    const userToken = await login('usuario@eventia.test', 'usuario123');
    await request(app.getHttpServer())
      .post(`/api/eventos/${eventoId}/inscripciones`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ cantidad: 1 })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/eventos/${eventoId}/inscripciones`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ cantidad: 1 })
      .expect(409);
  });

  it('organizador no puede editar evento de otro', async () => {
    const org2 = await login('organizador2@eventia.test', 'organizador123');
    await request(app.getHttpServer())
      .put('/api/eventos/1')
      .set('Authorization', `Bearer ${org2}`)
      .send({ titulo: 'Robado' })
      .expect(403);
  });

  it('usuario no puede ver inscripción de otro', async () => {
    const org1 = await login('organizador@eventia.test', 'organizador123');
    const ins = await request(app.getHttpServer())
      .post('/api/eventos/1/inscripciones')
      .set('Authorization', `Bearer ${org1}`)
      .send({ cantidad: 1 })
      .expect(201);
    const inscripcionId = ins.body.id as number;

    const userToken = await login('usuario@eventia.test', 'usuario123');
    await request(app.getHttpServer())
      .get(`/api/inscripciones/${inscripcionId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });

  it('rechaza ruta privada con token inválido', async () => {
    await request(app.getHttpServer())
      .get('/api/inscripciones/mias')
      .set('Authorization', 'Bearer token-invalido')
      .expect(401);
  });

  it('rechaza ruta privada sin token', async () => {
    await request(app.getHttpServer()).get('/api/inscripciones/mias').expect(401);
  });

  it('permite ruta privada con token válido', async () => {
    const token = await login('usuario@eventia.test', 'usuario123');
    const res = await request(app.getHttpServer())
      .get('/api/inscripciones/mias')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('organizador edita su propio evento', async () => {
    const org1 = await login('organizador@eventia.test', 'organizador123');
    const res = await request(app.getHttpServer())
      .put('/api/eventos/1')
      .set('Authorization', `Bearer ${org1}`)
      .send({ titulo: 'Feria universitaria 2026' })
      .expect(200);
    expect(res.body.titulo).toBe('Feria universitaria 2026');
  });

  it('no permite editar un evento cerrado', async () => {
    const org1 = await login('organizador@eventia.test', 'organizador123');
    await request(app.getHttpServer())
      .put('/api/eventos/2')
      .set('Authorization', `Bearer ${org1}`)
      .send({ titulo: 'Reabierto' })
      .expect(409);
  });

  it('rechaza token vencido', async () => {
    const vencido = sign({ sub: 1, correo: 'admin@eventia.test', rol: 'admin' }, 'test-secret', {
      expiresIn: -10,
    });
    await request(app.getHttpServer())
      .get('/api/inscripciones/mias')
      .set('Authorization', `Bearer ${vencido}`)
      .expect(401);
  });

  it('registro público no acepta rol', async () => {
    await request(app.getHttpServer())
      .post('/api/usuarios')
      .send({ nombre: 'Intruso', correo: 'intruso@eventia.test', password: 'secreto123', rol: 'admin' })
      .expect(400);
  });
});
