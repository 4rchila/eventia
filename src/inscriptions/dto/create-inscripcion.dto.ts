import { IsInt, Max, Min } from 'class-validator';

export class CreateInscripcionDto {
  @IsInt()
  @Min(1)
  @Max(5)
  cantidad!: number;
}
