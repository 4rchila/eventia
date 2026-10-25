import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Rol } from '../common/enums/rol.enum';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateRolDto } from './dto/update-rol.dto';
import { User } from './user.entity';
import { toUserResponse, UserResponse } from './user-response';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async count(): Promise<number> {
    return this.usersRepo.count();
  }

  async create(dto: CreateUserDto): Promise<UserResponse> {
    const exists = await this.usersRepo.findOne({ where: { correo: dto.correo } });
    if (exists) {
      throw new ConflictException('Correo ya registrado');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepo.create({
      nombre: dto.nombre,
      correo: dto.correo,
      passwordHash,
      rol: Rol.Usuario,
      telefono: dto.telefono ?? null,
    });
    const saved = await this.usersRepo.save(user);
    return toUserResponse(saved);
  }

  async createSeedUser(
    nombre: string,
    correo: string,
    password: string,
    rol: Rol,
  ): Promise<User> {
    const passwordHash = await bcrypt.hash(password, 10);
    return this.usersRepo.save(
      this.usersRepo.create({
        nombre,
        correo,
        passwordHash,
        rol,
        telefono: null,
      }),
    );
  }

  async findByCorreo(correo: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { correo } });
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  async findAll(): Promise<UserResponse[]> {
    const users = await this.usersRepo.find({ order: { id: 'ASC' } });
    return users.map(toUserResponse);
  }

  async getOne(id: number, actor: JwtPayload): Promise<UserResponse> {
    if (actor.rol !== Rol.Administrador && actor.sub !== id) {
      throw new ForbiddenException();
    }
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException();
    }
    return toUserResponse(user);
  }

  async updateRol(id: number, dto: UpdateRolDto): Promise<UserResponse> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException();
    }
    user.rol = dto.rol;
    const saved = await this.usersRepo.save(user);
    return toUserResponse(saved);
  }
}
