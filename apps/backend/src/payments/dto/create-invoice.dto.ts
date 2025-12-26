import { IsUUID, IsNumber, IsOptional, IsString, IsEnum } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { AsaasBillingType } from '../gateways/payment-gateway.interface'

export enum InvoiceCreationMode {
  AUTOMATIC = 'AUTOMATIC',
  MANUAL = 'MANUAL',
}

export class CreateInvoiceDto {
  @ApiProperty({
    description: 'ID do tenant',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  tenantId: string

  @ApiProperty({
    description: 'ID da subscription',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  subscriptionId: string

  @ApiProperty({
    description: 'Valor da fatura em reais',
    example: 299.9,
  })
  @IsNumber()
  amount: number

  @ApiProperty({
    description: 'Descrição da fatura',
    example: 'Mensalidade Plano Profissional - Janeiro/2024',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({
    description: 'Modo de criação da fatura',
    enum: InvoiceCreationMode,
    default: InvoiceCreationMode.AUTOMATIC,
    required: false,
  })
  @IsOptional()
  @IsEnum(InvoiceCreationMode)
  mode?: InvoiceCreationMode

  @ApiProperty({
    description: 'Tipo de cobrança (forma de pagamento)',
    enum: AsaasBillingType,
    default: AsaasBillingType.UNDEFINED,
    example: AsaasBillingType.PIX,
    required: false,
  })
  @IsOptional()
  @IsEnum(AsaasBillingType)
  billingType?: AsaasBillingType

  @ApiProperty({
    description: 'Valor original antes do desconto',
    example: 399.9,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  originalAmount?: number

  @ApiProperty({
    description: 'Percentual de desconto aplicado (0-100)',
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  discountPercent?: number

  @ApiProperty({
    description: 'Motivo do desconto aplicado',
    example: 'Desconto anual do plano (10%)',
    required: false,
  })
  @IsOptional()
  @IsString()
  discountReason?: string

  @ApiProperty({
    description: 'Ciclo de cobrança (MONTHLY ou ANNUAL)',
    example: 'MONTHLY',
    required: false,
  })
  @IsOptional()
  @IsString()
  billingCycle?: string
}
