import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FinancialCategoryType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Mensalidades' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Receitas recorrentes de contratos ativos' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: FinancialCategoryType, example: FinancialCategoryType.INCOME })
  @IsEnum(FinancialCategoryType)
  type: FinancialCategoryType;

  @ApiPropertyOptional({ description: 'ID da categoria pai (subcategoria)' })
  @IsOptional()
  @IsUUID()
  parentCategoryId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
