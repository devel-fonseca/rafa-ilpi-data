import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

/**
 * DTO para submissão de resposta individual de uma questão
 */
export class SubmitResponseDto {
  @ApiProperty({
    description: 'ID da questão sendo respondida',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsNotEmpty()
  @IsUUID()
  questionId: string;

  @ApiProperty({
    description: 'Número da questão (1-37)',
    example: 1,
    minimum: 1,
    maximum: 37,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(37)
  questionNumber: number;

  @ApiPropertyOptional({
    description: 'Pontuação selecionada (0-5) - NULL se marcou N/A',
    example: 3,
    minimum: 0,
    maximum: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  @ValidateIf((o) => !o.isNotApplicable)
  selectedPoints?: number;

  @ApiPropertyOptional({
    description: 'Texto da opção selecionada',
    example: 'Alvará Sanitário atualizado.',
  })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => !o.isNotApplicable)
  selectedText?: string;

  @ApiProperty({
    description: 'Indica se a questão foi marcada como Não Aplicável',
    example: false,
    default: false,
  })
  @IsBoolean()
  isNotApplicable: boolean;

  @ApiPropertyOptional({
    description: 'Observações do avaliador sobre esta questão',
    example: 'Alvará renovado em janeiro/2026, válido até janeiro/2027',
  })
  @IsOptional()
  @IsString()
  observations?: string;

  // Campos de snapshot (preenchidos automaticamente pelo backend)
  @ApiPropertyOptional({
    description: 'Snapshot do texto da questão (preenchido automaticamente)',
  })
  @IsOptional()
  @IsString()
  questionTextSnapshot?: string;

  @ApiPropertyOptional({
    description: 'Snapshot da criticidade (preenchido automaticamente)',
  })
  @IsOptional()
  @IsString()
  criticalityLevel?: string;
}
