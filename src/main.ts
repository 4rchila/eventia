import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';
import { configureApp } from './setup';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  configureApp(app);

  const swagger = new DocumentBuilder()
    .setTitle('Eventia')
    .setDescription('API de eventos universitarios')
    .addBearerAuth()
    .build();
  // Assets desde CDN: en Vercel swagger-ui-dist no se empaqueta en la función.
  const swaggerCdn = 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.18.2';
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger), {
    customCssUrl: `${swaggerCdn}/swagger-ui.min.css`,
    customJs: [`${swaggerCdn}/swagger-ui-bundle.min.js`, `${swaggerCdn}/swagger-ui-standalone-preset.min.js`],
  });

  app.useStaticAssets(join(__dirname, '..', 'public'));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
