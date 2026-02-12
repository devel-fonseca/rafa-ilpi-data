import { ApiPropertyOptional } from '@nestjs/swagger';
import { FinancialAccountType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class QueryAccountsDto {
  @ApiPropertyOptional({ enum: FinancialAccountType })
  @IsOptional()
  @IsEnum(FinancialAccountType)
  accountType?: FinancialAccountType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() !== 'false';
    return true;
  })
  @IsBoolean()
  activeOnly?: boolean = true;
}

