import {
  IsEnum,
  IsString,
  IsOptional,
  IsUUID,
  IsObject,
  MaxLength,
  IsDateString,
} from 'class-validator'
import {
  SystemNotificationType,
  NotificationCategory,
  NotificationSeverity,
} from '@prisma/client'

export class CreateNotificationDto {
  @IsEnum(SystemNotificationType)
  type: SystemNotificationType

  @IsEnum(NotificationCategory)
  category: NotificationCategory

  @IsEnum(NotificationSeverity)
  severity: NotificationSeverity

  @IsString()
  @MaxLength(255)
  title: string

  @IsString()
  message: string

  @IsOptional()
  @IsString()
  actionUrl?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  entityType?: string

  @IsOptional()
  @IsUUID()
  entityId?: string

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>

  @IsOptional()
  @IsDateString()
  expiresAt?: string
}
