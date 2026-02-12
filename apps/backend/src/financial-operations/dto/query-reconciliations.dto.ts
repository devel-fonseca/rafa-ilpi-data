import { ApiPropertyOptional } from '@nestjs/swagger';
import { FinancialReconciliationStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class QueryReconciliationsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  bankAccountId?: string;

  @ApiPropertyOptional({ enum: FinancialReconciliationStatus })
  @IsOptional()
  @IsEnum(FinancialReconciliationStatus)
  status?: FinancialReconciliationStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

