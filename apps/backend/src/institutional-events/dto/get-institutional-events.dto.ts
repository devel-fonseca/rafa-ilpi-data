import { IsOptional, IsEnum, IsDate } from 'class-validator';
import {
  InstitutionalEventType,
  InstitutionalEventVisibility,
  ScheduledEventStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';

export class GetInstitutionalEventsDto {
  @IsOptional()
  @IsEnum(InstitutionalEventType)
  eventType?: InstitutionalEventType;

  @IsOptional()
  @IsEnum(InstitutionalEventVisibility)
  visibility?: InstitutionalEventVisibility;

  @IsOptional()
  @IsEnum(ScheduledEventStatus)
  status?: ScheduledEventStatus;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;
}
