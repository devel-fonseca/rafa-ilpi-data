import { ApiProperty } from '@nestjs/swagger';

/**
 * Comparação entre dois assessments
 */
export class AssessmentComparisonDto {
  @ApiProperty({ description: 'ID do assessment' })
  id: string;

  @ApiProperty({ description: 'Data da avaliação' })
  assessmentDate: Date;

  @ApiProperty({ description: 'Percentual de conformidade', example: 74.32 })
  compliancePercentage: number;

  @ApiProperty({ description: 'Nível de conformidade', example: 'PARCIAL' })
  complianceLevel: string;

  @ApiProperty({ description: 'Pontos obtidos', example: 82.5 })
  totalPointsObtained: number;

  @ApiProperty({ description: 'Pontos possíveis', example: 111 })
  totalPointsPossible: number;

  @ApiProperty({ description: 'Questões críticas não conformes', example: 2 })
  criticalNonCompliantCount: number;
}

/**
 * Resultado da comparação histórica
 */
export class ComparisonResultDto {
  @ApiProperty({ description: 'Assessments comparados', type: [AssessmentComparisonDto] })
  assessments: AssessmentComparisonDto[];

  @ApiProperty({ description: 'Evolução do percentual de conformidade', example: 5.2 })
  percentageEvolution: number;

  @ApiProperty({ description: 'Evolução de pontos obtidos', example: 12.5 })
  pointsEvolution: number;

  @ApiProperty({
    description: 'Melhorias identificadas (questões que subiram de pontuação)',
    example: 8,
  })
  improvementsCount: number;

  @ApiProperty({
    description: 'Regressões identificadas (questões que caíram de pontuação)',
    example: 2,
  })
  regressionsCount: number;

  @ApiProperty({ description: 'Tendência geral', example: 'MELHORANDO' })
  trend: 'MELHORANDO' | 'ESTAGNADO' | 'PIORANDO';
}
