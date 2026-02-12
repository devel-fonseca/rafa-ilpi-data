import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  FinancialTransactionStatus,
  FinancialTransactionType,
} from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { IsDateOnly } from '../../common/validators/date.validators';

export enum FinancialTransactionSortField {
  DUE_DATE = 'dueDate',
  NET_AMOUNT = 'netAmount',
  STATUS = 'status',
  DESCRIPTION = 'description',
}

export enum FinancialTransactionSortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export class QueryTransactionsDto {
  @ApiPropertyOptional({ enum: FinancialTransactionType })
  @IsOptional()
  @IsEnum(FinancialTransactionType)
  type?: FinancialTransactionType;

  @ApiPropertyOptional({ enum: FinancialTransactionStatus })
  @IsOptional()
  @IsEnum(FinancialTransactionStatus)
  status?: FinancialTransactionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  residentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  residentContractId?: string;

  @ApiPropertyOptional({ example: '2026-02-01' })
  @IsOptional()
  @IsDateOnly()
  dueDateFrom?: string;

  @ApiPropertyOptional({ example: '2026-02-29' })
  @IsOptional()
  @IsDateOnly()
  dueDateTo?: string;

  @ApiPropertyOptional({ example: 'mensalidade' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: FinancialTransactionSortField, default: FinancialTransactionSortField.DUE_DATE })
  @IsOptional()
  @IsEnum(FinancialTransactionSortField)
  sortField?: FinancialTransactionSortField = FinancialTransactionSortField.DUE_DATE;

  @ApiPropertyOptional({ enum: FinancialTransactionSortDirection, default: FinancialTransactionSortDirection.ASC })
  @IsOptional()
  @IsEnum(FinancialTransactionSortDirection)
  sortDirection?: FinancialTransactionSortDirection = FinancialTransactionSortDirection.ASC;

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
