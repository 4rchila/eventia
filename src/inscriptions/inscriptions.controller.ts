import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { CreateInscripcionDto } from './dto/create-inscripcion.dto';
import { InscriptionsService } from './inscriptions.service';

@ApiTags('inscripciones')
@Controller('api')
export class InscriptionsController {
  constructor(private readonly inscriptionsService: InscriptionsService) {}

  @Get('inscripciones/mias')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: JwtPayload) {
    return this.inscriptionsService.findMine(user);
  }

  @Get('inscripciones/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.inscriptionsService.findOne(id, user);
  }

  @Post('eventos/:id/inscripciones')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(
    @Param('id', ParseIntPipe) eventoId: number,
    @Body() dto: CreateInscripcionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.inscriptionsService.create(eventoId, dto, user);
  }
}
