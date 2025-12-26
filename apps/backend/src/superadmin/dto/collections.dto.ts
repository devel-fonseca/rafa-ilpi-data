import { IsString, IsArray, IsOptional, IsNumber, Min, Max, MinLength } from 'class-validator'

/**
 * DTO para envio de lembrete de pagamento
 */
export class SendReminderDto {
  @IsString()
  invoiceId: string
}

/**
 * DTO para suspensão de tenant por inadimplência
 */
export class SuspendTenantForNonPaymentDto {
  @IsString()
  tenantId: string

  @IsArray()
  @IsString({ each: true })
  invoiceIds: string[]

  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Motivo deve ter pelo menos 10 caracteres' })
  reason?: string
}

/**
 * DTO para renegociação de fatura
 */
export class RenegotiateDto {
  @IsString()
  invoiceId: string

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Desconto não pode ser negativo' })
  @Max(100, { message: 'Desconto não pode exceder 100%' })
  discountPercent?: number

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Extensão deve ser de pelo menos 1 dia' })
  extensionDays?: number

  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Motivo deve ter pelo menos 10 caracteres' })
  reason?: string
}
