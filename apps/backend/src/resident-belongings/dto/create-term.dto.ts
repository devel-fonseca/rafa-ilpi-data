import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDateString,
  IsArray,
  IsUUID,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  BelongingTermType,
  BelongingMovementType,
  ConservationState,
} from '@prisma/client';

export class TermItemDto {
  @ApiProperty({
    description: 'ID do pertence',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  belongingId: string;

  @ApiProperty({
    enum: BelongingMovementType,
    description: 'Tipo de movimentação',
    example: 'ENTRADA',
  })
  @IsEnum(BelongingMovementType)
  @IsNotEmpty()
  movementType: BelongingMovementType;

  @ApiProperty({
    enum: ConservationState,
    required: false,
    description: 'Estado anterior (para alterações de estado)',
    example: 'BOM',
  })
  @IsOptional()
  @IsEnum(ConservationState)
  previousState?: ConservationState;

  @ApiProperty({
    enum: ConservationState,
    required: false,
    description: 'Novo estado (para alterações de estado)',
    example: 'REGULAR',
  })
  @IsOptional()
  @IsEnum(ConservationState)
  newState?: ConservationState;

  @ApiProperty({
    required: false,
    description: 'Motivo da alteração de estado',
    example: 'Item danificado após queda',
  })
  @IsOptional()
  @IsString()
  stateChangeReason?: string;
}

export class CreateTermDto {
  @ApiProperty({
    enum: BelongingTermType,
    description: 'Tipo do termo',
    example: 'RECEBIMENTO',
  })
  @IsEnum(BelongingTermType)
  @IsNotEmpty()
  type: BelongingTermType;

  @ApiProperty({
    description: 'Data do termo (ISO 8601)',
    example: '2026-02-02',
  })
  @IsDateString()
  @IsNotEmpty()
  termDate: string;

  @ApiProperty({
    description: 'Nome do funcionário que emitiu o termo',
    example: 'João Santos',
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  issuedBy: string;

  @ApiProperty({
    required: false,
    description: 'Nome de quem recebeu os itens (para termos de devolução)',
    example: 'Maria Silva',
    maxLength: 150,
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  receivedBy?: string;

  @ApiProperty({
    required: false,
    description: 'Documento (CPF/RG) de quem recebeu',
    example: '123.456.789-00',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  receiverDocument?: string;

  @ApiProperty({
    required: false,
    description: 'Observações gerais do termo',
    example: 'Termo emitido durante admissão do residente',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    type: [TermItemDto],
    description: 'Itens incluídos no termo',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TermItemDto)
  items: TermItemDto[];
}
