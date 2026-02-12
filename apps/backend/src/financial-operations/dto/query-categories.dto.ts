import { ApiPropertyOptional } from '@nestjs/swagger';
import { FinancialCategoryType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class QueryCategoriesDto {
  @ApiPropertyOptional({ enum: FinancialCategoryType })
  @IsOptional()
  @IsEnum(FinancialCategoryType)
  type?: FinancialCategoryType;

  @ApiPropertyOptional({ example: 'mensal' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  activeOnly?: boolean = true;
}
