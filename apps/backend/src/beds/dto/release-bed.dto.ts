import { IsString, IsOptional, MinLength } from 'class-validator';

export class ReleaseBedDto {
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'O motivo da liberação deve ter no mínimo 10 caracteres' })
  reason?: string;
}
