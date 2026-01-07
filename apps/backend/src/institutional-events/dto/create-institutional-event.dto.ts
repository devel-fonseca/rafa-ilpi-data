import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsObject,
  Matches,
  ValidateIf,
} from 'class-validator';
import {
  InstitutionalEventType,
  InstitutionalEventVisibility,
  ScheduledEventStatus,
} from '@prisma/client';
import { IsDateOnly } from '../../common/validators/date.validators';

export class CreateInstitutionalEventDto {
  @IsEnum(InstitutionalEventType)
  eventType: InstitutionalEventType;

  @IsOptional()
  @IsEnum(InstitutionalEventVisibility)
  visibility?: InstitutionalEventVisibility;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateOnly()
  scheduledDate: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'scheduledTime deve estar no formato HH:mm',
  })
  scheduledTime?: string;

  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @IsOptional()
  @IsEnum(ScheduledEventStatus)
  status?: ScheduledEventStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  // Campos específicos para DOCUMENT_EXPIRY
  @ValidateIf((o) => o.eventType === InstitutionalEventType.DOCUMENT_EXPIRY)
  @IsString()
  documentType?: string;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @ValidateIf((o) => o.eventType === InstitutionalEventType.DOCUMENT_EXPIRY)
  @IsDateOnly()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  responsible?: string;

  // Campos específicos para TRAINING
  @ValidateIf((o) => o.eventType === InstitutionalEventType.TRAINING)
  @IsString()
  trainingTopic?: string;

  @IsOptional()
  @IsString()
  instructor?: string;

  @IsOptional()
  @IsString()
  targetAudience?: string;

  @IsOptional()
  @IsString()
  location?: string;

  // Metadados adicionais
  @IsOptional()
  @IsObject()
  metadata?: any;
}
