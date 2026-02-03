import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';
import {
  BelongingCategory,
  ConservationState,
} from '@prisma/client';

export class CreateBelongingDto {
  @ApiProperty({
    enum: BelongingCategory,
    description: 'Categoria do pertence',
    example: 'ELETRONICOS',
  })
  @IsEnum(BelongingCategory)
  @IsNotEmpty()
  category: BelongingCategory;

  @ApiProperty({
    description: 'Descrição do item',
    example: 'Celular Samsung Galaxy S21',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description: string;

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
    description: 'Quantidade',
    example: 1,
    default: 1,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  quantity?: number = 1;

  @ApiProperty({
    enum: ConservationState,
    description: 'Estado de conservação',
    example: 'BOM',
  })
  @IsEnum(ConservationState)
  @IsNotEmpty()
  conservationState: ConservationState;

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
    description: 'Data de entrada do item (ISO 8601)',
    example: '2026-02-02',
  })
  @IsDateString()
  @IsNotEmpty()
  entryDate: string;

  @ApiProperty({
    description: 'Nome de quem entregou o item (familiar/responsável)',
    example: 'Maria Silva',
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  deliveredBy: string;

  @ApiProperty({
    description: 'Nome do funcionário que recebeu o item',
    example: 'João Santos',
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  receivedBy: string;

  @ApiProperty({
    required: false,
    description: 'Observações sobre o item',
    example: 'Item com pequeno arranhão na lateral',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
