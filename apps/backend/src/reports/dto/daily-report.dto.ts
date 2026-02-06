import { ApiProperty } from '@nestjs/swagger';

export class DailyRecordReportDto {
  @ApiProperty()
  residentId: string;

  @ApiProperty()
  residentName: string;

  @ApiProperty()
  residentCpf: string;

  @ApiProperty({ required: false })
  residentCns?: string;

  @ApiProperty()
  bedCode: string;

  @ApiProperty()
  date: string;

  @ApiProperty()
  time: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  recordedBy: string;

  @ApiProperty()
  details: Record<string, any>;

  @ApiProperty({ required: false })
  notes?: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty({ enum: ['SCHEDULED', 'AD_HOC'] })
  origin: 'SCHEDULED' | 'AD_HOC';

  @ApiProperty({ required: false })
  scheduleConfigId?: string;
}

export class MedicationAdministrationReportDto {
  @ApiProperty()
  residentName: string;

  @ApiProperty()
  residentCpf: string;

  @ApiProperty({ required: false })
  residentCns?: string;

  @ApiProperty()
  bedCode: string;

  @ApiProperty()
  medicationName: string;

  @ApiProperty()
  concentration: string;

  @ApiProperty()
  dose: string;

  @ApiProperty()
  route: string;

  @ApiProperty()
  scheduledTime: string;

  @ApiProperty({ required: false })
  actualTime?: string;

  @ApiProperty()
  wasAdministered: boolean;

  @ApiProperty({ required: false })
  administeredBy?: string;

  @ApiProperty({ required: false })
  reason?: string;

  @ApiProperty({ required: false })
  notes?: string;
}

export class VitalSignsReportDto {
  @ApiProperty()
  residentName: string;

  @ApiProperty()
  residentCpf: string;

  @ApiProperty()
  bedCode: string;

  @ApiProperty()
  time: string;

  @ApiProperty({ required: false })
  bloodPressure?: string;

  @ApiProperty({ required: false })
  heartRate?: number;

  @ApiProperty({ required: false })
  temperature?: number;

  @ApiProperty({ required: false })
  oxygenSaturation?: number;

  @ApiProperty({ required: false })
  glucose?: number;
}

export class ShiftReportDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  date: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  startTime: string;

  @ApiProperty()
  endTime: string;

  @ApiProperty({ required: false })
  teamName?: string;

  @ApiProperty({ required: false })
  teamColor?: string;

  @ApiProperty()
  status: string;
}

export class DailyComplianceMetricDto {
  @ApiProperty()
  recordType: string;

  @ApiProperty()
  due: number;

  @ApiProperty()
  done: number;

  @ApiProperty()
  overdue: number;

  @ApiProperty()
  adHoc: number;

  @ApiProperty({ required: false })
  compliance?: number | null;
}

export class DailyReportSummaryDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  totalResidents: number;

  @ApiProperty()
  totalDailyRecords: number;

  @ApiProperty()
  totalMedicationsAdministered: number;

  @ApiProperty()
  totalMedicationsScheduled: number;

  @ApiProperty({ description: 'Percentual de cobertura de higiene' })
  hygieneCoverage: number;

  @ApiProperty({ description: 'Percentual de cobertura de alimentação' })
  feedingCoverage: number;

  @ApiProperty({ description: 'Percentual de cobertura de sinais vitais' })
  vitalSignsCoverage: number;

  @ApiProperty({ type: [DailyComplianceMetricDto] })
  compliance: DailyComplianceMetricDto[];
}

export class DailyReportDto {
  @ApiProperty({ type: DailyReportSummaryDto })
  summary: DailyReportSummaryDto;

  @ApiProperty({ type: [DailyRecordReportDto] })
  dailyRecords: DailyRecordReportDto[];

  @ApiProperty({ type: [MedicationAdministrationReportDto] })
  medicationAdministrations: MedicationAdministrationReportDto[];

  @ApiProperty({ type: [VitalSignsReportDto] })
  vitalSigns: VitalSignsReportDto[];

  @ApiProperty({ type: [ShiftReportDto] })
  shifts: ShiftReportDto[];
}

export class MultiDayReportDto {
  @ApiProperty()
  startDate: string;

  @ApiProperty()
  endDate: string;

  @ApiProperty({ type: [DailyReportDto] })
  reports: DailyReportDto[];
}
