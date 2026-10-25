import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventoEstado } from '../common/enums/evento-estado.enum';
import { Rol } from '../common/enums/rol.enum';
import { Evento } from '../events/evento.entity';
import { InscriptionsService } from '../inscriptions/inscriptions.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    private readonly usersService: UsersService,
    private readonly inscriptionsService: InscriptionsService,
    @InjectRepository(Evento)
    private readonly eventosRepo: Repository<Evento>,
  ) {}

  async onModuleInit() {
    const count = await this.usersService.count();
    if (count > 0) {
      return;
    }

    const admin = await this.usersService.createSeedUser(
      'Admin',
      'admin@eventia.test',
      'admin123',
      Rol.Administrador,
    );
    const org1 = await this.usersService.createSeedUser(
      'Organizador Uno',
      'organizador@eventia.test',
      'organizador123',
      Rol.Organizador,
    );
    await this.usersService.createSeedUser(
      'Organizador Dos',
      'organizador2@eventia.test',
      'organizador123',
      Rol.Organizador,
    );
    const usuario = await this.usersService.createSeedUser(
      'Usuario Demo',
      'usuario@eventia.test',
      'usuario123',
      Rol.Usuario,
    );

    void admin;

    const abierto = await this.eventosRepo.save(
      this.eventosRepo.create({
        titulo: 'Feria universitaria',
        descripcion: 'Evento de prueba abierto',
        fecha: new Date(Date.now() + 86400000).toISOString(),
        cupo: 10,
        precio: 0,
        organizadorId: org1.id,
        estado: EventoEstado.Abierto,
      }),
    );

    await this.eventosRepo.save(
      this.eventosRepo.create({
        titulo: 'Concierto cerrado',
        descripcion: 'Evento de prueba cerrado',
        fecha: new Date(Date.now() - 86400000).toISOString(),
        cupo: 50,
        precio: 25,
        organizadorId: org1.id,
        estado: EventoEstado.Cerrado,
      }),
    );

    await this.inscriptionsService.createSeedInscripcion(
      abierto.id,
      usuario.id,
      1,
    );
  }
}
