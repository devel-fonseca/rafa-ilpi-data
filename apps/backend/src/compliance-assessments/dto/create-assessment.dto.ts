import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * DTO para criação de novo autodiagnóstico RDC 502/2021
 */
export class CreateAssessmentDto {
  @ApiPropertyOptional({
    description: 'ID da versão da regulamentação (null = versão atual)',
    example: '5df5316e-9bb7-4e9f-8c41-71c9bc324c86',
  })
  @IsOptional()
  @IsUUID()
  versionId?: string;

  @ApiPropertyOptional({
    description: 'Observações iniciais sobre a avaliação',
    example: 'Autodiagnóstico referente ao primeiro semestre de 2026',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
