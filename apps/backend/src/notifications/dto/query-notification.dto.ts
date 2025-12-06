import { IsOptional, IsEnum, IsBoolean, IsString, IsInt, Min } from 'class-validator'
import { Type, Transform } from 'class-transformer'
import {
  SystemNotificationType,
  NotificationCategory,
  NotificationSeverity,
} from '@prisma/client'

export class QueryNotificationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20

  @IsOptional()
  @IsEnum(NotificationCategory)
  category?: NotificationCategory

  @IsOptional()
  @IsEnum(NotificationSeverity)
  severity?: NotificationSeverity

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true
    if (value === 'false') return false
    return value
  })
  @IsBoolean()
  read?: boolean

  @IsOptional()
  @IsEnum(SystemNotificationType)
  type?: SystemNotificationType

  @IsOptional()
  @IsString()
  search?: string

  // Cache-busting timestamp (ignorado pelo backend, usado apenas pelo frontend)
  @IsOptional()
  @Type(() => Number)
  _t?: number
}
