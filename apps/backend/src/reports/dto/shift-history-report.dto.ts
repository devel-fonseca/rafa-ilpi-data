import { ApiProperty } from '@nestjs/swagger';

export class ShiftHistoryActivityRowDto {
  @ApiProperty()
  registeredTime: string;

  @ApiProperty()
  recordType: string;

  @ApiProperty()
  residentName: string;

  @ApiProperty({ required: false, nullable: true })
  recordDetails?: string | null;

  @ApiProperty()
  recordedBy: string;

  @ApiProperty({ required: false, nullable: true })
  timestamp: string | null;
}

export class ShiftHistoryReportSummaryDto {
  @ApiProperty()
  shiftId: string;

  @ApiProperty()
  date: string;

  @ApiProperty()
  shiftName: string;

  @ApiProperty()
  startTime: string;

  @ApiProperty()
  endTime: string;

  @ApiProperty({ required: false, nullable: true })
  teamName: string | null;

  @ApiProperty()
  status: string;

  @ApiProperty()
  closedAt: string;

  @ApiProperty()
  closedBy: string;

  @ApiProperty()
  handoverType: 'COMPLETED' | 'ADMIN_CLOSED';

  @ApiProperty({ required: false, nullable: true })
  receivedBy: string | null;

  @ApiProperty()
  report: string;

  @ApiProperty()
  totalActivities: number;

  @ApiProperty()
  shiftMembersActivities: number;

  @ApiProperty()
  otherUsersActivities: number;
}

export class ShiftHistoryReportDto {
  @ApiProperty({ type: ShiftHistoryReportSummaryDto })
  summary: ShiftHistoryReportSummaryDto;

  @ApiProperty({ type: [ShiftHistoryActivityRowDto] })
  shiftMembersActivities: ShiftHistoryActivityRowDto[];

  @ApiProperty({ type: [ShiftHistoryActivityRowDto] })
  otherUsersActivities: ShiftHistoryActivityRowDto[];
}
