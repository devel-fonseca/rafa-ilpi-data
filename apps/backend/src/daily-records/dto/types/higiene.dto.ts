import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';

export class HigieneDataDto {
  @ApiProperty({
    enum: ['Chuveiro', 'Leito', 'Aspersão'],
    description: 'Tipo de banho realizado',
    example: 'Chuveiro',
  })
  @IsEnum(['Chuveiro', 'Leito', 'Aspersão'])
  @IsNotEmpty()
  tipoBanho: string;

  @ApiProperty({
    required: false,
    description: 'Duração do banho em minutos',
    example: 15,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duracao?: number;

  @ApiProperty({
    enum: ['Normal', 'Ressecada', 'Lesão', 'Edema'],
    description: 'Condição da pele observada',
    example: 'Normal',
  })
  @IsEnum(['Normal', 'Ressecada', 'Lesão', 'Edema'])
  @IsNotEmpty()
  condicaoPele: string;

  @ApiProperty({
    required: false,
    description: 'Local onde foi observada alteração na pele',
    example: 'Braços e pernas',
  })
  @IsOptional()
  @IsString()
  localAlteracao?: string;

  @ApiProperty({
    description: 'Indica se hidratante foi aplicado',
    example: true,
  })
  @IsBoolean()
  hidratanteAplicado: boolean;

  @ApiProperty({
    description: 'Indica se higiene bucal foi realizada',
    example: true,
  })
  @IsBoolean()
  higieneBucal: boolean;

  @ApiProperty({
    description: 'Indica se houve troca de fralda/roupa',
    example: true,
  })
  @IsBoolean()
  trocaFralda: boolean;

  @ApiProperty({
    required: false,
    description: 'Quantidade de fraldas utilizadas',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantidadeFraldas?: number;
}
