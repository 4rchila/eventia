import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventoEstado } from '../common/enums/evento-estado.enum';
import { Rol } from '../common/enums/rol.enum';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { Inscripcion } from '../inscriptions/inscripcion.entity';
import { CreateEventoDto } from './dto/create-evento.dto';
import { UpdateEventoDto } from './dto/update-evento.dto';
import { Evento } from './evento.entity';
import { EventoResponse, toEventoResponse } from './evento-response';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Evento)
    private readonly eventosRepo: Repository<Evento>,
    @InjectRepository(Inscripcion)
    private readonly inscripcionesRepo: Repository<Inscripcion>,
  ) {}

  private async sumInscritos(eventoId: number): Promise<number> {
    const row = await this.inscripcionesRepo
      .createQueryBuilder('i')
      .select('COALESCE(SUM(i.cantidad), 0)', 'total')
      .where('i.eventoId = :eventoId', { eventoId })
      .getRawOne<{ total: number }>();
    return Number(row?.total ?? 0);
  }

  async findAll(q?: string): Promise<EventoResponse[]> {
    const qb = this.eventosRepo.createQueryBuilder('e').orderBy('e.id', 'ASC');
    if (q?.trim()) {
      qb.andWhere('LOWER(e.titulo) LIKE LOWER(:q)', { q: `%${q.trim()}%` });
    }
    const eventos = await qb.getMany();
    const result: EventoResponse[] = [];
    for (const evento of eventos) {
      const inscritos = await this.sumInscritos(evento.id);
      result.push(toEventoResponse(evento, inscritos));
    }
    return result;
  }

  async findOne(id: number): Promise<EventoResponse> {
    const evento = await this.eventosRepo.findOne({ where: { id } });
    if (!evento) {
      throw new NotFoundException();
    }
    const inscritos = await this.sumInscritos(evento.id);
    return toEventoResponse(evento, inscritos);
  }

  async create(dto: CreateEventoDto, actor: JwtPayload): Promise<EventoResponse> {
    if (actor.rol !== Rol.Organizador) {
      throw new ForbiddenException();
    }
    const evento = this.eventosRepo.create({
      titulo: dto.titulo,
      descripcion: dto.descripcion ?? null,
      fecha: dto.fecha,
      cupo: dto.cupo,
      precio: dto.precio,
      organizadorId: actor.sub,
      estado: EventoEstado.Abierto,
    });
    const saved = await this.eventosRepo.save(evento);
    return toEventoResponse(saved, 0);
  }

  async update(
    id: number,
    dto: UpdateEventoDto,
    actor: JwtPayload,
  ): Promise<EventoResponse> {
    if (actor.rol !== Rol.Organizador) {
      throw new ForbiddenException();
    }
    const evento = await this.eventosRepo.findOne({ where: { id } });
    if (!evento) {
      throw new NotFoundException();
    }
    if (evento.organizadorId !== actor.sub) {
      throw new ForbiddenException();
    }
    if (evento.estado === EventoEstado.Cerrado) {
      throw new ConflictException('El evento ya está cerrado');
    }
    if (dto.estado !== undefined && dto.estado !== EventoEstado.Cerrado) {
      throw new ConflictException('Solo se puede cerrar el evento');
    }
    if (dto.titulo !== undefined) evento.titulo = dto.titulo;
    if (dto.fecha !== undefined) evento.fecha = dto.fecha;
    if (dto.cupo !== undefined) evento.cupo = dto.cupo;
    if (dto.precio !== undefined) evento.precio = dto.precio;
    if (dto.descripcion !== undefined) evento.descripcion = dto.descripcion;
    if (dto.estado === EventoEstado.Cerrado) {
      evento.estado = EventoEstado.Cerrado;
    }
    const saved = await this.eventosRepo.save(evento);
    const inscritos = await this.sumInscritos(saved.id);
    return toEventoResponse(saved, inscritos);
  }

  async assertOwner(eventoId: number, actor: JwtPayload): Promise<Evento> {
    const evento = await this.eventosRepo.findOne({ where: { id: eventoId } });
    if (!evento) {
      throw new NotFoundException();
    }
    if (actor.rol !== Rol.Organizador || evento.organizadorId !== actor.sub) {
      throw new ForbiddenException();
    }
    return evento;
  }
}
