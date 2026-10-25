import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inscripcion } from '../inscriptions/inscripcion.entity';
import { InscriptionsModule } from '../inscriptions/inscriptions.module';
import { Evento } from './evento.entity';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Evento, Inscripcion]),
    forwardRef(() => InscriptionsModule),
  ],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
