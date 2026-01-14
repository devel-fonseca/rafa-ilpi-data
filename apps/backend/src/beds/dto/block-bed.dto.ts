import { IsString, IsOptional, MinLength, IsDateString } from 'class-validator';

export class BlockBedDto {
  @IsString()
  @MinLength(10, { message: 'O motivo do bloqueio deve ter no mínimo 10 caracteres' })
  reason: string;

  @IsOptional()
  @IsDateString()
  expectedReleaseDate?: string;
}
