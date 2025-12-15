import { IsUUID, IsString, MinLength, IsOptional, IsDateString } from 'class-validator';

export class TransferBedDto {
  @IsUUID()
  toBedId: string;

  @IsString()
  @MinLength(10, { message: 'O motivo da transferência deve ter no mínimo 10 caracteres' })
  reason: string;

  @IsOptional()
  @IsDateString()
  transferredAt?: string; // Data/hora da transferência (opcional, padrão: now())
}
