import { IsString, IsEnum, IsObject, IsOptional } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

/**
 * Eventos de webhook do Asaas (33 eventos totais)
 * @see https://docs.asaas.com/docs/webhook-para-cobrancas
 * @see https://docs.asaas.com/docs/eventos-para-assinaturas
 */
export enum AsaasEventType {
  // ============================================
  // PAYMENT EVENTS (27 eventos)
  // ============================================

  // Criação e atualizações
  PAYMENT_CREATED = 'PAYMENT_CREATED',
  PAYMENT_UPDATED = 'PAYMENT_UPDATED',
  PAYMENT_DELETED = 'PAYMENT_DELETED',
  PAYMENT_RESTORED = 'PAYMENT_RESTORED',

  // Status de pagamento
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED', // Processado, saldo não disponível ainda
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED', // Recebido com sucesso
  PAYMENT_OVERDUE = 'PAYMENT_OVERDUE', // Vencido
  PAYMENT_ANTICIPATED = 'PAYMENT_ANTICIPATED', // Antecipado

  // Cartão de crédito
  PAYMENT_AUTHORIZED = 'PAYMENT_AUTHORIZED', // Autorizado, aguardando captura
  PAYMENT_AWAITING_RISK_ANALYSIS = 'PAYMENT_AWAITING_RISK_ANALYSIS', // Em análise manual
  PAYMENT_APPROVED_BY_RISK_ANALYSIS = 'PAYMENT_APPROVED_BY_RISK_ANALYSIS', // Aprovado
  PAYMENT_REPROVED_BY_RISK_ANALYSIS = 'PAYMENT_REPROVED_BY_RISK_ANALYSIS', // Reprovado
  PAYMENT_CREDIT_CARD_CAPTURE_REFUSED = 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED', // Captura recusada

  // Estornos
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED', // Estornado totalmente
  PAYMENT_PARTIALLY_REFUNDED = 'PAYMENT_PARTIALLY_REFUNDED', // Estornado parcialmente
  PAYMENT_REFUND_IN_PROGRESS = 'PAYMENT_REFUND_IN_PROGRESS', // Estorno agendado
  PAYMENT_RECEIVED_IN_CASH_UNDONE = 'PAYMENT_RECEIVED_IN_CASH_UNDONE', // Recebimento desfeito

  // Chargeback (disputa)
  PAYMENT_CHARGEBACK_REQUESTED = 'PAYMENT_CHARGEBACK_REQUESTED', // Solicitado
  PAYMENT_CHARGEBACK_DISPUTE = 'PAYMENT_CHARGEBACK_DISPUTE', // Em disputa
  PAYMENT_AWAITING_CHARGEBACK_REVERSAL = 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL', // Aguardando reversão

  // Negativação
  PAYMENT_DUNNING_REQUESTED = 'PAYMENT_DUNNING_REQUESTED', // Solicitada
  PAYMENT_DUNNING_RECEIVED = 'PAYMENT_DUNNING_RECEIVED', // Recebida

  // Visualizações
  PAYMENT_BANK_SLIP_VIEWED = 'PAYMENT_BANK_SLIP_VIEWED', // Boleto visualizado
  PAYMENT_CHECKOUT_VIEWED = 'PAYMENT_CHECKOUT_VIEWED', // Checkout visualizado

  // Split de pagamento
  PAYMENT_SPLIT_CANCELLED = 'PAYMENT_SPLIT_CANCELLED', // Split cancelado
  PAYMENT_SPLIT_DIVERGENCE_BLOCK = 'PAYMENT_SPLIT_DIVERGENCE_BLOCK', // Bloqueado por divergência
  PAYMENT_SPLIT_DIVERGENCE_BLOCK_FINISHED = 'PAYMENT_SPLIT_DIVERGENCE_BLOCK_FINISHED', // Bloqueio finalizado

  // ============================================
  // SUBSCRIPTION EVENTS (6 eventos)
  // ============================================

  SUBSCRIPTION_CREATED = 'SUBSCRIPTION_CREATED', // Criada
  SUBSCRIPTION_UPDATED = 'SUBSCRIPTION_UPDATED', // Atualizada
  SUBSCRIPTION_INACTIVATED = 'SUBSCRIPTION_INACTIVATED', // Inativada
  SUBSCRIPTION_DELETED = 'SUBSCRIPTION_DELETED', // Deletada
  SUBSCRIPTION_SPLIT_DIVERGENCE_BLOCK = 'SUBSCRIPTION_SPLIT_DIVERGENCE_BLOCK', // Bloqueada
  SUBSCRIPTION_SPLIT_DIVERGENCE_BLOCK_FINISHED = 'SUBSCRIPTION_SPLIT_DIVERGENCE_BLOCK_FINISHED', // Desbloqueada
}

/**
 * DTO para eventos de webhook do Asaas
 */
export class AsaasWebhookDto {
  @ApiProperty({
    description: 'Tipo de evento do Asaas',
    enum: AsaasEventType,
    example: 'PAYMENT_RECEIVED',
  })
  @IsEnum(AsaasEventType)
  event: AsaasEventType

  @ApiProperty({
    description: 'ID do evento (para idempotência)',
    example: 'evt_abc123',
  })
  @IsString()
  id: string

  @ApiProperty({
    description: 'Dados do pagamento/subscription',
    example: {
      id: 'pay_123',
      customer: 'cus_123',
      value: 299.9,
      status: 'RECEIVED',
    },
  })
  @IsObject()
  payment?: any

  @ApiProperty({
    description: 'Dados da subscription',
    example: {
      id: 'sub_123',
      customer: 'cus_123',
      value: 299.9,
      status: 'ACTIVE',
    },
  })
  @IsOptional()
  @IsObject()
  subscription?: any

  @ApiProperty({
    description: 'Data/hora do evento',
    example: '2024-01-15T10:30:00Z',
  })
  @IsOptional()
  @IsString()
  dateCreated?: string
}
