import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { BelongingStatus } from '@prisma/client';

export class ChangeStatusDto {
  @ApiProperty({
    enum: BelongingStatus,
    description: 'Novo status do pertence',
    example: 'DEVOLVIDO',
  })
  @IsEnum(BelongingStatus)
  @IsNotEmpty()
  status: BelongingStatus;

  @ApiProperty({
    description: 'Motivo da alteração de status (mínimo 10 caracteres)',
    example: 'Item devolvido ao familiar responsável durante visita',
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'O motivo deve ter no mínimo 10 caracteres' })
  reason: string;

  @ApiProperty({
    required: false,
    description: 'Data da saída/alteração (ISO 8601)',
    example: '2026-02-02',
  })
  @IsOptional()
  @IsDateString()
  exitDate?: string;

  @ApiProperty({
    required: false,
    description: 'Nome de quem recebeu o item na saída',
    example: 'Maria Silva',
    maxLength: 150,
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  exitReceivedBy?: string;
}
