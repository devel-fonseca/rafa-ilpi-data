import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  MaxLength,
  IsInt,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

/**
 * DTO para assinante do contrato
 */
export class SignatoryDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '123.456.789-00', required: false })
  @IsOptional()
  @IsString()
  cpf?: string;

  @ApiProperty({
    enum: ['RESIDENTE', 'RESPONSAVEL_LEGAL', 'RESPONSAVEL_CONTRATUAL', 'TESTEMUNHA', 'ILPI'],
    example: 'RESIDENTE',
  })
  @IsEnum(['RESIDENTE', 'RESPONSAVEL_LEGAL', 'RESPONSAVEL_CONTRATUAL', 'TESTEMUNHA', 'ILPI'])
  role: string;
}

/**
 * DTO para criação de contrato de prestação de serviços (digitalização)
 */
export class CreateContractDto {
  @ApiProperty({ example: 'CONT-2025-001', description: 'Número único do contrato' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  contractNumber: string;

  @ApiProperty({ example: '2025-01-01', description: 'Data de início da vigência (YYYY-MM-DD)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-01-01', description: 'Data de fim da vigência (YYYY-MM-DD)' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 3500.0, description: 'Valor da mensalidade em reais' })
  @IsNumber()
  @Min(0)
  monthlyAmount: number;

  @ApiProperty({ example: 10, description: 'Dia do vencimento da mensalidade (1-28)', minimum: 1, maximum: 28 })
  @IsInt()
  @Min(1)
  @Max(28)
  dueDay: number;

  @ApiProperty({ example: 'INPC', required: false, description: 'Índice de reajuste (INPC, IGP-M, etc)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  adjustmentIndex?: string;

  @ApiProperty({ example: 5.5, required: false, description: 'Percentual do último reajuste' })
  @IsOptional()
  @IsNumber()
  adjustmentRate?: number;

  @ApiProperty({ example: '2024-12-01', required: false, description: 'Data do último reajuste (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  lastAdjustmentDate?: string;

  @ApiProperty({
    type: [SignatoryDto],
    description: 'Lista de assinantes do contrato (residente, responsável legal, testemunhas, ILPI)'
  })
  @Transform(({ value }) => {
    // Se for string JSON (vem do FormData), fazer parse
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        // Garantir que é array e mapear para instâncias de SignatoryDto
        if (Array.isArray(parsed)) {
          return parsed.map((item) => {
            const dto = new SignatoryDto();
            dto.name = item.name;
            dto.cpf = item.cpf;
            dto.role = item.role;
            return dto;
          });
        }
        return [];
      } catch {
        return [];
      }
    }
    // Se já for array, retornar como está
    return Array.isArray(value) ? value : [];
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SignatoryDto)
  signatories: SignatoryDto[];

  @ApiProperty({ required: false, description: 'Observações adicionais sobre o contrato' })
  @IsOptional()
  @IsString()
  notes?: string;
}
