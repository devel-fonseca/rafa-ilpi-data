import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para um residente no relatório de lista
 */
export class ResidentListItemDto {
  @ApiProperty({ description: 'ID do residente' })
  id: string;

  @ApiProperty({ description: 'Nome completo do residente' })
  fullName: string;

  @ApiProperty({ description: 'Idade em anos' })
  age: number;

  @ApiProperty({ description: 'Data de nascimento (YYYY-MM-DD)' })
  birthDate: string;

  @ApiProperty({ description: 'Data de admissão (YYYY-MM-DD)' })
  admissionDate: string;

  @ApiProperty({ description: 'Tempo de permanência em dias' })
  stayDays: number;

  @ApiProperty({ description: 'Grau de dependência' })
  dependencyLevel: string | null;

  @ApiProperty({ description: 'Código do leito' })
  bedCode: string | null;

  @ApiProperty({ description: 'Lista de condições crônicas', type: [String] })
  conditions: string[];
}

/**
 * DTO para contagem por grau de dependência
 */
export class DependencyCountDto {
  @ApiProperty({ description: 'Grau de dependência' })
  level: string;

  @ApiProperty({ description: 'Quantidade de residentes' })
  count: number;

  @ApiProperty({ description: 'Percentual do total' })
  percentage: number;
}

/**
 * DTO para o resumo executivo do relatório
 */
export class ResidentsListSummaryDto {
  @ApiProperty({ description: 'Data de geração do relatório' })
  generatedAt: string;

  @ApiProperty({ description: 'Total de residentes ativos' })
  totalResidents: number;

  @ApiProperty({ description: 'Contagem por grau de dependência', type: [DependencyCountDto] })
  byDependencyLevel: DependencyCountDto[];

  @ApiProperty({ description: 'Média de idade dos residentes' })
  averageAge: number;

  @ApiProperty({ description: 'Idade mínima' })
  minAge: number;

  @ApiProperty({ description: 'Idade máxima' })
  maxAge: number;

  @ApiProperty({ description: 'Média de tempo de permanência em dias' })
  averageStayDays: number;
}

/**
 * DTO principal do relatório de lista de residentes
 */
export class ResidentsListReportDto {
  @ApiProperty({ description: 'Resumo executivo', type: ResidentsListSummaryDto })
  summary: ResidentsListSummaryDto;

  @ApiProperty({ description: 'Lista de residentes', type: [ResidentListItemDto] })
  residents: ResidentListItemDto[];
}
