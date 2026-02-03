import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ConservationState } from '@prisma/client';

export class UpdateBelongingDto {
  @ApiProperty({
    required: false,
    description: 'Descrição do item',
    example: 'Celular Samsung Galaxy S21',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiProperty({
    required: false,
    description: 'Marca/Modelo do item',
    example: 'Samsung Galaxy S21',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  brandModel?: string;

  @ApiProperty({
    required: false,
    description: 'Quantidade',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiProperty({
    enum: ConservationState,
    required: false,
    description: 'Estado de conservação',
    example: 'BOM',
  })
  @IsOptional()
  @IsEnum(ConservationState)
  conservationState?: ConservationState;

  @ApiProperty({
    required: false,
    description: 'Identificação do item (número de série, cor, etc.)',
    example: 'Cor preta, número de série XYZ123',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  identification?: string;

  @ApiProperty({
    required: false,
    description: 'Valor declarado em reais',
    example: 500.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  declaredValue?: number;

  @ApiProperty({
    required: false,
    description: 'Local de armazenamento na ILPI',
    example: 'Armário do quarto 101',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  storageLocation?: string;

  @ApiProperty({
    required: false,
    description: 'Observações sobre o item',
    example: 'Item com pequeno arranhão na lateral',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    required: true,
    description: 'Motivo da alteração (mínimo 10 caracteres)',
    example: 'Atualização do estado de conservação após verificação',
    minLength: 10,
  })
  @IsString()
  @MinLength(10, { message: 'O motivo da alteração deve ter no mínimo 10 caracteres' })
  changeReason: string;
}
