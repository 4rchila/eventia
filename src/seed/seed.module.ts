import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Evento } from '../events/evento.entity';
import { InscriptionsModule } from '../inscriptions/inscriptions.module';
import { UsersModule } from '../users/users.module';
import { SeedService } from './seed.service';

@Module({
  imports: [
    UsersModule,
    InscriptionsModule,
    TypeOrmModule.forFeature([Evento]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
