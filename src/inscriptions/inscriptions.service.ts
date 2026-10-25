import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EventoEstado } from '../common/enums/evento-estado.enum';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { EventsService } from '../events/events.service';
import { Evento } from '../events/evento.entity';
import { CreateInscripcionDto } from './dto/create-inscripcion.dto';
import { Inscripcion } from './inscripcion.entity';

export type InscripcionResponse = {
  id: number;
  eventoId: number;
  usuarioId: number;
  cantidad: number;
};

export type InscripcionDetalleResponse = InscripcionResponse & {
  nombre: string;
  correo: string;
};

export type ParticipanteResponse = {
  id: number;
  usuarioId: number;
  nombre: string;
  correo: string;
  cantidad: number;
};

@Injectable()
export class InscriptionsService {
  constructor(
    @InjectRepository(Inscripcion)
    private readonly inscripcionesRepo: Repository<Inscripcion>,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => EventsService))
    private readonly eventsService: EventsService,
  ) {}

  async create(
    eventoId: number,
    dto: CreateInscripcionDto,
    actor: JwtPayload,
  ): Promise<InscripcionResponse> {
    // ponytail: SQLite serializa escrituras; la transacción basta aquí. Con Postgres, bloquear la fila del evento
    return this.dataSource.transaction(async (manager) => {
      const evento = await manager.findOne(Evento, { where: { id: eventoId } });
      if (!evento) {
        throw new NotFoundException();
      }
      if (evento.estado === EventoEstado.Cerrado) {
        throw new ConflictException('Evento cerrado');
      }

      const existing = await manager.findOne(Inscripcion, {
        where: { eventoId, usuarioId: actor.sub },
      });
      if (existing) {
        throw new ConflictException('Ya inscrito');
      }

      const row = await manager
        .createQueryBuilder(Inscripcion, 'i')
        .select('COALESCE(SUM(i.cantidad), 0)', 'total')
        .where('i.eventoId = :eventoId', { eventoId })
        .getRawOne<{ total: number }>();
      const inscritos = Number(row?.total ?? 0);
      if (inscritos + dto.cantidad > evento.cupo) {
        throw new ConflictException('Cupo insuficiente');
      }

      const inscripcion = manager.create(Inscripcion, {
        eventoId,
        usuarioId: actor.sub,
        cantidad: dto.cantidad,
      });
      const saved = await manager.save(inscripcion);
      return {
        id: saved.id,
        eventoId: saved.eventoId,
        usuarioId: saved.usuarioId,
        cantidad: saved.cantidad,
      };
    });
  }

  async findMine(actor: JwtPayload): Promise<InscripcionDetalleResponse[]> {
    const list = await this.inscripcionesRepo.find({
      where: { usuarioId: actor.sub },
      relations: ['usuario'],
      order: { id: 'ASC' },
    });
    return list.map((i) => ({
      id: i.id,
      eventoId: i.eventoId,
      usuarioId: i.usuarioId,
      cantidad: i.cantidad,
      nombre: i.usuario.nombre,
      correo: i.usuario.correo,
    }));
  }

  async findOne(id: number, actor: JwtPayload): Promise<InscripcionDetalleResponse> {
    const inscripcion = await this.inscripcionesRepo.findOne({
      where: { id },
      relations: ['usuario'],
    });
    if (!inscripcion) {
      throw new NotFoundException();
    }
    if (inscripcion.usuarioId !== actor.sub) {
      throw new ForbiddenException();
    }
    return {
      id: inscripcion.id,
      eventoId: inscripcion.eventoId,
      usuarioId: inscripcion.usuarioId,
      cantidad: inscripcion.cantidad,
      nombre: inscripcion.usuario.nombre,
      correo: inscripcion.usuario.correo,
    };
  }

  async listParticipantes(
    eventoId: number,
    actor: JwtPayload,
  ): Promise<ParticipanteResponse[]> {
    await this.eventsService.assertOwner(eventoId, actor);
    const list = await this.inscripcionesRepo.find({
      where: { eventoId },
      relations: ['usuario'],
      order: { id: 'ASC' },
    });
    return list.map((i) => ({
      id: i.id,
      usuarioId: i.usuarioId,
      nombre: i.usuario.nombre,
      correo: i.usuario.correo,
      cantidad: i.cantidad,
    }));
  }

  async createSeedInscripcion(
    eventoId: number,
    usuarioId: number,
    cantidad: number,
  ): Promise<void> {
    await this.inscripcionesRepo.save(
      this.inscripcionesRepo.create({ eventoId, usuarioId, cantidad }),
    );
  }
}
