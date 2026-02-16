import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  IsBoolean,
} from 'class-validator';

export class RenewContractDto {
  @ApiProperty({
    description: 'Motivo da renovação (gera nova versão major x.0)',
    example: 'Renovação anual de vigência para 2027.',
  })
  @IsString()
  @MinLength(10, { message: 'Motivo deve ter no mínimo 10 caracteres' })
  reason: string;

  @ApiProperty({ example: '2026-06-06', description: 'Nova data de início (YYYY-MM-DD)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    required: false,
    example: '2027-06-05',
    description: 'Nova data de fim (YYYY-MM-DD). Obrigatória se não for prazo indeterminado',
  })
  @ValidateIf((dto: RenewContractDto) => !dto.isIndefinite)
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    required: false,
    description: 'Renovação por prazo indeterminado',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isIndefinite?: boolean;

  @ApiProperty({ required: false, example: 'C2025-0766-2' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contractNumber?: string;

  @ApiProperty({ required: false, example: 5000.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyAmount?: number;

  @ApiProperty({ required: false, example: 5, minimum: 1, maximum: 28 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  dueDay?: number;

  @ApiProperty({ required: false, example: 2.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  lateFeePercent?: number;

  @ApiProperty({ required: false, example: 1.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  interestMonthlyPercent?: number;

  @ApiProperty({ required: false, example: 'INPC' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  adjustmentIndex?: string;

  @ApiProperty({ required: false, example: 5.5 })
  @IsOptional()
  @IsNumber()
  adjustmentRate?: number;

  @ApiProperty({ required: false, example: '2026-12-01' })
  @IsOptional()
  @IsDateString()
  lastAdjustmentDate?: string;

  @ApiProperty({ required: false, description: 'Observações da nova vigência' })
  @IsOptional()
  @IsString()
  notes?: string;
}
