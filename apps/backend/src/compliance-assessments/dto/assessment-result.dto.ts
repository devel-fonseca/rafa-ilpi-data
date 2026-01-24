import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Informações de não conformidade crítica
 */
export class CriticalNonCompliantDto {
  @ApiProperty({ description: 'Número da questão', example: 2 })
  questionNumber: number;

  @ApiProperty({ description: 'Texto da questão', example: 'Constituição Legal' })
  questionText: string;

  @ApiProperty({ description: 'Pontos obtidos', example: 1 })
  pointsObtained: number;

  @ApiProperty({ description: 'Pontos necessários para conformidade', example: 3 })
  pointsRequired: number;
}

/**
 * Estatísticas por categoria
 */
export class CategoryStatsDto {
  @ApiProperty({ description: 'Nome da categoria', example: 'Documentação e Regularização' })
  category: string;

  @ApiProperty({ description: 'Total de questões na categoria', example: 6 })
  totalQuestions: number;

  @ApiProperty({ description: 'Questões respondidas', example: 6 })
  questionsAnswered: number;

  @ApiProperty({ description: 'Pontos obtidos', example: 12.5 })
  pointsObtained: number;

  @ApiProperty({ description: 'Pontos possíveis', example: 18 })
  pointsPossible: number;

  @ApiProperty({ description: 'Percentual de conformidade', example: 69.44 })
  percentage: number;
}

/**
 * Resposta individual de uma questão
 */
export class AssessmentResponseDto {
  @ApiProperty({ description: 'ID da resposta' })
  id: string;

  @ApiProperty({ description: 'Número da questão', example: 1 })
  questionNumber: number;

  @ApiProperty({ description: 'Texto da questão', example: 'Alvará Sanitário' })
  questionTextSnapshot: string;

  @ApiProperty({ description: 'Criticidade', example: 'NC' })
  criticalityLevel: string;

  @ApiPropertyOptional({ description: 'Pontos selecionados', example: 3 })
  selectedPoints?: number;

  @ApiPropertyOptional({ description: 'Texto da opção selecionada' })
  selectedText?: string;

  @ApiProperty({ description: 'Marcado como Não Aplicável', example: false })
  isNotApplicable: boolean;

  @ApiPropertyOptional({ description: 'Observações do avaliador' })
  observations?: string;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;
}

/**
 * Resultado completo de um assessment
 */
export class AssessmentResultDto {
  @ApiProperty({ description: 'ID do assessment' })
  id: string;

  @ApiProperty({ description: 'ID do tenant' })
  tenantId: string;

  @ApiProperty({ description: 'ID da versão da regulamentação' })
  versionId: string;

  @ApiProperty({ description: 'Data da avaliação' })
  assessmentDate: Date;

  @ApiPropertyOptional({ description: 'ID do usuário que realizou' })
  performedBy?: string;

  @ApiProperty({ description: 'Status', example: 'COMPLETED' })
  status: string;

  @ApiProperty({ description: 'Total de questões', example: 37 })
  totalQuestions: number;

  @ApiProperty({ description: 'Questões respondidas', example: 37 })
  questionsAnswered: number;

  @ApiProperty({ description: 'Questões marcadas como N/A', example: 0 })
  questionsNA: number;

  @ApiProperty({ description: 'Questões aplicáveis', example: 37 })
  applicableQuestions: number;

  @ApiProperty({ description: 'Total de pontos obtidos', example: 82.5 })
  totalPointsObtained: number;

  @ApiProperty({ description: 'Total de pontos possíveis', example: 111 })
  totalPointsPossible: number;

  @ApiProperty({ description: 'Percentual de conformidade', example: 74.32 })
  compliancePercentage: number;

  @ApiProperty({ description: 'Nível de conformidade', example: 'PARCIAL' })
  complianceLevel: string;

  @ApiPropertyOptional({
    description: 'Lista de não conformidades críticas',
    type: [CriticalNonCompliantDto],
  })
  criticalNonCompliant?: CriticalNonCompliantDto[];

  @ApiPropertyOptional({ description: 'Observações gerais' })
  notes?: string;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Respostas individuais', type: [AssessmentResponseDto] })
  responses?: AssessmentResponseDto[];

  @ApiPropertyOptional({
    description: 'Estatísticas por categoria',
    type: [CategoryStatsDto],
  })
  categoryStats?: CategoryStatsDto[];
}

/**
 * Resposta paginada de assessments
 */
export class PaginatedAssessmentsDto {
  @ApiProperty({ description: 'Lista de assessments', type: [AssessmentResultDto] })
  data: AssessmentResultDto[];

  @ApiProperty({ description: 'Total de registros', example: 25 })
  total: number;

  @ApiProperty({ description: 'Página atual', example: 1 })
  page: number;

  @ApiProperty({ description: 'Itens por página', example: 10 })
  limit: number;

  @ApiProperty({ description: 'Total de páginas', example: 3 })
  totalPages: number;
}
