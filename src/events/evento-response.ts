import { EventoEstado } from '../common/enums/evento-estado.enum';
import { Evento } from './evento.entity';

export type EventoResponse = {
  id: number;
  titulo: string;
  descripcion: string | null;
  fecha: string;
  cupo: number;
  precio: number;
  estado: EventoEstado;
  organizadorId: number;
  disponibles: number;
};

export function toEventoResponse(
  evento: Evento,
  inscritos: number,
): EventoResponse {
  return {
    id: evento.id,
    titulo: evento.titulo,
    descripcion: evento.descripcion,
    fecha: evento.fecha,
    cupo: evento.cupo,
    precio: evento.precio,
    estado: evento.estado,
    organizadorId: evento.organizadorId,
    disponibles: evento.cupo - inscritos,
  };
}
