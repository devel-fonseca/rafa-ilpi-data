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

export class AgeRangeDistributionDto {
  @ApiProperty()
  range: string;

  @ApiProperty()
  count: number;

  @ApiProperty()
  percentage: number;
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

  @ApiProperty()
  contraindicationsTotal: number;
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

export class ComplexityIndicatorsDto {
  @ApiProperty()
  complexityIndex: number;

  @ApiProperty()
  weightedScore: number;

  @ApiProperty()
  residentsWithMobilityAid: number;

  @ApiProperty()
  mobilityAidPercentage: number;

  @ApiProperty()
  requiredCaregiversPerShift: number;
}

export class AllergySeverityDistributionDto {
  @ApiProperty()
  severity: string;

  @ApiProperty()
  count: number;
}

export class DietaryRestrictionTypeDistributionDto {
  @ApiProperty()
  type: string;

  @ApiProperty()
  count: number;
}

export class BmiDistributionDto {
  @ApiProperty()
  category: string;

  @ApiProperty()
  count: number;

  @ApiProperty()
  percentage: number;
}

export class NutritionalFunctionalIndicatorsDto {
  @ApiProperty()
  anthropometryRecencyDays: number;

  @ApiProperty({ type: [BmiDistributionDto] })
  bmiDistribution: BmiDistributionDto[];

  @ApiProperty()
  percentWithoutRecentAnthropometry: number;

  @ApiProperty()
  percentWithoutDependencyAssessment: number;

  @ApiProperty()
  percentWithoutClinicalProfile: number;
}

export class RoutineCoverageByTypeDto {
  @ApiProperty()
  recordType: string;

  @ApiProperty()
  due: number;

  @ApiProperty()
  done: number;

  @ApiProperty()
  compliance: number;
}

export class TreatmentRoutineIndicatorsDto {
  @ApiProperty()
  residentsWithActivePrescription: number;

  @ApiProperty()
  residentsWithPolypharmacy: number;

  @ApiProperty()
  totalActiveMedications: number;

  @ApiProperty()
  totalRoutineSchedules: number;

  @ApiProperty({ type: [RoutineCoverageByTypeDto] })
  routineCoverageByType: RoutineCoverageByTypeDto[];
}

export class GovernanceQualityIndicatorsDto {
  @ApiProperty()
  residentsWithoutLegalGuardian: number;

  @ApiProperty()
  residentsWithoutEmergencyContact: number;

  @ApiProperty()
  residentsWithoutBed: number;

  @ApiProperty()
  residentsWithoutActiveContract: number;

  @ApiProperty()
  residentsWithCriticalIncompleteFields: number;
}

export class CriticalIncompleteResidentDto {
  @ApiProperty()
  residentId: string;

  @ApiProperty()
  residentName: string;

  @ApiProperty({ nullable: true })
  bedCode: string | null;

  @ApiProperty()
  missingFieldsCount: number;

  @ApiProperty({ type: [String] })
  missingFields: string[];
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

  @ApiProperty({ type: [AgeRangeDistributionDto] })
  ageRangeDistribution: AgeRangeDistributionDto[];

  @ApiProperty({ type: [DependencyDistributionDto] })
  dependencyDistribution: DependencyDistributionDto[];

  @ApiProperty({ type: ComplexityIndicatorsDto })
  complexityIndicators: ComplexityIndicatorsDto;

  @ApiProperty({ type: ClinicalIndicatorsDto })
  clinicalIndicators: ClinicalIndicatorsDto;

  @ApiProperty({ type: [AllergySeverityDistributionDto] })
  allergiesBySeverity: AllergySeverityDistributionDto[];

  @ApiProperty({ type: [DietaryRestrictionTypeDistributionDto] })
  dietaryRestrictionsByType: DietaryRestrictionTypeDistributionDto[];

  @ApiProperty({ type: [TopConditionDto] })
  topConditions: TopConditionDto[];

  @ApiProperty({ type: NutritionalFunctionalIndicatorsDto })
  nutritionalFunctionalIndicators: NutritionalFunctionalIndicatorsDto;

  @ApiProperty({ type: CareLoadSummaryDto })
  careLoadSummary: CareLoadSummaryDto;

  @ApiProperty({ type: [RoutineLoadByTypeDto] })
  routineLoadByType: RoutineLoadByTypeDto[];

  @ApiProperty({ type: TreatmentRoutineIndicatorsDto })
  treatmentRoutineIndicators: TreatmentRoutineIndicatorsDto;

  @ApiProperty({ type: GovernanceQualityIndicatorsDto })
  governanceQualityIndicators: GovernanceQualityIndicatorsDto;

  @ApiProperty({ type: [CriticalIncompleteResidentDto] })
  criticalIncompleteResidents: CriticalIncompleteResidentDto[];

  @ApiProperty({ description: 'Quantidade de meses considerados na tendência (6-12)' })
  trendMonths: number;

  @ApiProperty({ type: [DependencyTrendPointDto] })
  dependencyTrend: DependencyTrendPointDto[];

  @ApiProperty({ type: [CareLoadTrendPointDto] })
  careLoadTrend: CareLoadTrendPointDto[];

  @ApiProperty({ type: [ResidentProfileRowDto] })
  residents: ResidentProfileRowDto[];
}
