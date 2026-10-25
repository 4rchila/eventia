import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Evento } from '../events/evento.entity';
import { User } from '../users/user.entity';

@Entity('inscripciones')
@Unique(['eventoId', 'usuarioId'])
export class Inscripcion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  eventoId!: number;

  @Column()
  usuarioId!: number;

  @Column({ type: 'integer' })
  cantidad!: number;

  @ManyToOne(() => Evento, (e) => e.inscripciones)
  evento!: Evento;

  @ManyToOne(() => User, (u) => u.inscripciones)
  usuario!: User;
}
