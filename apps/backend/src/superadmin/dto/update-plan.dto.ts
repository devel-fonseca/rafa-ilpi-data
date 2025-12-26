import { IsOptional, IsNumber, IsString, IsBoolean, IsObject, Min, Max } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UpdatePlanDto {
  @ApiProperty({ example: 299.99, description: 'Preço mensal do plano', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number

  @ApiProperty({ example: 10, description: 'Desconto percentual para assinaturas anuais (0-100)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  annualDiscountPercent?: number

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUsers?: number

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxResidents?: number

  @IsOptional()
  @IsString()
  displayName?: string

  @IsOptional()
  @IsObject()
  features?: object

  @IsOptional()
  @IsBoolean()
  isPopular?: boolean

  @IsOptional()
  @IsNumber()
  @Min(0)
  trialDays?: number
}
