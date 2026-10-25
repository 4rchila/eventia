import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import {
  checkLoginAllowed,
  clearLoginAttempts,
  recordFailedLogin,
} from './login-rate-limiter';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    if (!checkLoginAllowed(dto.correo)) {
      throw new HttpException(
        'Demasiados intentos',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.usersService.findByCorreo(dto.correo);
    const invalid =
      !user || !(await bcrypt.compare(dto.password, user.passwordHash));

    if (invalid) {
      recordFailedLogin(dto.correo);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    clearLoginAttempts(dto.correo);
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      correo: user.correo,
      rol: user.rol,
    });
    return { accessToken };
  }
}
