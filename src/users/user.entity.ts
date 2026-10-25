import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Rol } from '../common/enums/rol.enum';
import { Evento } from '../events/evento.entity';
import { Inscripcion } from '../inscriptions/inscripcion.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  nombre!: string;

  @Column({ unique: true })
  correo!: string;

  @Column()
  passwordHash!: string;

  @Column({ type: 'text', default: Rol.Usuario })
  rol!: Rol;

  @Column({ type: 'text', nullable: true })
  telefono!: string | null;

  @OneToMany(() => Evento, (e) => e.organizador)
  eventos!: Evento[];

  @OneToMany(() => Inscripcion, (i) => i.usuario)
  inscripciones!: Inscripcion[];
}
