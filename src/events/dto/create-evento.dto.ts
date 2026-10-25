import { IsInt, IsISO8601, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateEventoDto {
  @IsString()
  @MinLength(1)
  titulo!: string;

  @IsISO8601()
  fecha!: string;

  @IsInt()
  @Min(1)
  cupo!: number;

  @IsNumber()
  @Min(0)
  precio!: number;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
