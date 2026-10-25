import { Rol } from '../common/enums/rol.enum';

export interface JwtPayload {
  sub: number;
  correo: string;
  rol: Rol;
}
