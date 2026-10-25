import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EventoEstado } from '../common/enums/evento-estado.enum';
import { User } from '../users/user.entity';
import { Inscripcion } from '../inscriptions/inscripcion.entity';

@Entity('eventos')
export class Evento {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  titulo!: string;

  @Column({ type: 'text', nullable: true })
  descripcion!: string | null;

  @Column({ type: 'text' })
  fecha!: string;

  @Column({ type: 'integer' })
  cupo!: number;

  @Column({ type: 'real' })
  precio!: number;

  @Column()
  organizadorId!: number;

  @ManyToOne(() => User, (u) => u.eventos)
  organizador!: User;

  @Column({ type: 'text', default: EventoEstado.Abierto })
  estado!: EventoEstado;

  @OneToMany(() => Inscripcion, (i) => i.evento)
  inscripciones!: Inscripcion[];
}
