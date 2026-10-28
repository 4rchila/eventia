import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { AuthModule } from './auth/auth.module';
import { Evento } from './events/evento.entity';
import { EventsModule } from './events/events.module';
import { Inscripcion } from './inscriptions/inscripcion.entity';
import { InscriptionsModule } from './inscriptions/inscriptions.module';
import { SeedModule } from './seed/seed.module';
import { User } from './users/user.entity';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const entities = [User, Evento, Inscripcion];
        const url = config.get<string>('DATABASE_URL');
        if (url) {
          // PostgreSQL (Neon/Docker). ssl salvo que la URL lo desactive (sslmode=disable).
          return {
            type: 'postgres',
            url,
            ssl: url.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
            entities,
            synchronize: true,
          };
        }
        const database =
          config.get<string>('DATABASE_PATH') ??
          join(process.cwd(), 'data', 'eventia.sqlite');
        mkdirSync(dirname(database), { recursive: true });
        return {
          type: 'sqlite',
          database,
          entities,
          synchronize: true,
        };
      },
    }),
    UsersModule,
    AuthModule,
    EventsModule,
    InscriptionsModule,
    SeedModule,
  ],
})
export class AppModule {}
