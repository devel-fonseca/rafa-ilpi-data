import { ApiProperty } from '@nestjs/swagger';

export class ResidentProfileSummaryDto {
  @ApiProperty()
  generatedAt: string;

  @ApiProperty({ description: 'Data de referência da visão atual (YYYY-MM-DD)' })
  referenceDate: string;

  @ApiProperty()
  totalResidents: number;

  @ApiProperty()
  averageAge: number;

  @ApiProperty()
  minAge: number;

  @ApiProperty()
  maxAge: number;

  @ApiProperty()
  averageStayDays: number;

  @ApiProperty()
  residentsWithLegalGuardian: number;

  @ApiProperty()
  residentsWithoutBed: number;
}

export class GenderDistributionDto {
  @ApiProperty()
  label: string;

  @ApiProperty()
  count: number;

  @ApiProperty()
  percentage: number;
}

export class DependencyDistributionDto {
  @ApiProperty()
  level: string;

  @ApiProperty()
  count: number;

  @ApiProperty()
  percentage: number;

  @ApiProperty({ description: 'Quantidade mínima de cuidadores para este grupo (RDC 502/2021)' })
  requiredCaregivers: number;
}

export class ClinicalIndicatorsDto {
  @ApiProperty()
  residentsWithConditions: number;

  @ApiProperty()
  totalConditions: number;

  @ApiProperty()
  residentsWithAllergies: number;

  @ApiProperty()
  totalAllergies: number;

  @ApiProperty()
  severeAllergies: number;

  @ApiProperty()
  residentsWithDietaryRestrictions: number;

  @ApiProperty()
  totalDietaryRestrictions: number;

  @ApiProperty()
  residentsWithContraindications: number;
}

export class TopConditionDto {
  @ApiProperty()
  condition: string;

  @ApiProperty()
  count: number;

  @ApiProperty()
  percentage: number;
}

export class CareLoadSummaryDto {
  @ApiProperty()
  totalActiveMedications: number;

  @ApiProperty()
  residentsWithPolypharmacy: number;

  @ApiProperty()
  totalRoutineSchedules: number;
}

export class RoutineLoadByTypeDto {
  @ApiProperty()
  recordType: string;

  @ApiProperty()
  count: number;
}

export class DependencyTrendPointDto {
  @ApiProperty({ description: 'Mês no formato YYYY-MM' })
  month: string;

  @ApiProperty()
  totalResidents: number;

  @ApiProperty()
  grauI: number;

  @ApiProperty()
  grauII: number;

  @ApiProperty()
  grauIII: number;

  @ApiProperty()
  notInformed: number;

  @ApiProperty({ description: 'Quantidade teórica mínima de cuidadores para o mês' })
  requiredCaregivers: number;
}

export class CareLoadTrendPointDto {
  @ApiProperty({ description: 'Mês no formato YYYY-MM' })
  month: string;

  @ApiProperty()
  dailyRecordsCount: number;

  @ApiProperty()
  medicationAdministrationsCount: number;

  @ApiProperty({ description: 'Média mensal de registros diários por residente ativo' })
  recordsPerResident: number;
}

export class ResidentProfileRowDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  age: number;

  @ApiProperty({ nullable: true })
  bedCode: string | null;

  @ApiProperty()
  dependencyLevel: string;

  @ApiProperty()
  mobilityAid: boolean;

  @ApiProperty({ nullable: true })
  dependencyAssessmentDate: string | null;

  @ApiProperty()
  conditionsCount: number;

  @ApiProperty()
  allergiesCount: number;

  @ApiProperty()
  dietaryRestrictionsCount: number;

  @ApiProperty()
  activeMedicationsCount: number;

  @ApiProperty()
  routineSchedulesCount: number;

  @ApiProperty()
  hasContraindications: boolean;
}

export class InstitutionalResidentProfileReportDto {
  @ApiProperty({ type: ResidentProfileSummaryDto })
  summary: ResidentProfileSummaryDto;

  @ApiProperty({ type: [GenderDistributionDto] })
  genderDistribution: GenderDistributionDto[];

  @ApiProperty({ type: [DependencyDistributionDto] })
  dependencyDistribution: DependencyDistributionDto[];

  @ApiProperty({ type: ClinicalIndicatorsDto })
  clinicalIndicators: ClinicalIndicatorsDto;

  @ApiProperty({ type: [TopConditionDto] })
  topConditions: TopConditionDto[];

  @ApiProperty({ type: CareLoadSummaryDto })
  careLoadSummary: CareLoadSummaryDto;

  @ApiProperty({ type: [RoutineLoadByTypeDto] })
  routineLoadByType: RoutineLoadByTypeDto[];

  @ApiProperty({ description: 'Quantidade de meses considerados na tendência (6-12)' })
  trendMonths: number;

  @ApiProperty({ type: [DependencyTrendPointDto] })
  dependencyTrend: DependencyTrendPointDto[];

  @ApiProperty({ type: [CareLoadTrendPointDto] })
  careLoadTrend: CareLoadTrendPointDto[];

  @ApiProperty({ type: [ResidentProfileRowDto] })
  residents: ResidentProfileRowDto[];
}
