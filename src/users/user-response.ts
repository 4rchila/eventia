import { Rol } from '../common/enums/rol.enum';
import { User } from './user.entity';

export type UserResponse = {
  id: number;
  nombre: string;
  correo: string;
  telefono: string | null;
  rol: Rol;
};

export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    nombre: user.nombre,
    correo: user.correo,
    telefono: user.telefono,
    rol: user.rol,
  };
}
