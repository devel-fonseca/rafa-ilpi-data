import { IsNotEmpty, IsNumber, IsString, IsBoolean, IsObject, IsEnum, IsOptional, Min, Max } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { PlanType, BillingCycle } from '@prisma/client'

export class CreatePlanDto {
  @ApiProperty({ example: 'plan_essential_monthly', description: 'Nome técnico único do plano (snake_case)' })
  @IsNotEmpty()
  @IsString()
  name: string

  @ApiProperty({ example: 'Essential', description: 'Nome de exibição do plano' })
  @IsNotEmpty()
  @IsString()
  displayName: string

  @ApiProperty({ enum: PlanType, example: 'ESSENTIAL', description: 'Tipo do plano' })
  @IsNotEmpty()
  @IsEnum(PlanType)
  type: PlanType

  @ApiProperty({ enum: BillingCycle, example: 'MONTHLY', description: 'Ciclo de cobrança' })
  @IsNotEmpty()
  @IsEnum(BillingCycle)
  billingCycle: BillingCycle

  @ApiProperty({ example: 299.99, description: 'Preço mensal do plano' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number

  @ApiProperty({ example: 10, description: 'Desconto percentual para assinaturas anuais (0-100)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  annualDiscountPercent?: number

  @ApiProperty({ example: 5, description: 'Número máximo de usuários' })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  maxUsers: number

  @ApiProperty({ example: 30, description: 'Número máximo de residentes' })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  maxResidents: number

  @ApiProperty({ example: 14, description: 'Dias de trial gratuito', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  trialDays?: number

  @ApiProperty({ example: false, description: 'Se o plano é destacado como popular', required: false })
  @IsOptional()
  @IsBoolean()
  isPopular?: boolean

  @ApiProperty({ example: true, description: 'Se o plano está ativo', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @ApiProperty({
    example: { medicacoes: true, sinais_vitais: true },
    description: 'Features habilitadas no plano',
    required: false,
  })
  @IsOptional()
  @IsObject()
  features?: object
}
