import { Tenant } from '@prisma/client'

/**
 * Status de pagamento no Asaas
 */
export enum AsaasPaymentStatus {
  PENDING = 'PENDING',
  RECEIVED = 'RECEIVED',
  CONFIRMED = 'CONFIRMED',
  OVERDUE = 'OVERDUE',
  REFUNDED = 'REFUNDED',
  RECEIVED_IN_CASH = 'RECEIVED_IN_CASH',
  REFUND_REQUESTED = 'REFUND_REQUESTED',
  CHARGEBACK_REQUESTED = 'CHARGEBACK_REQUESTED',
  CHARGEBACK_DISPUTE = 'CHARGEBACK_DISPUTE',
  AWAITING_CHARGEBACK_REVERSAL = 'AWAITING_CHARGEBACK_REVERSAL',
  DUNNING_REQUESTED = 'DUNNING_REQUESTED',
  DUNNING_RECEIVED = 'DUNNING_RECEIVED',
  AWAITING_RISK_ANALYSIS = 'AWAITING_RISK_ANALYSIS',
}

/**
 * Métodos de pagamento no Asaas
 */
export enum AsaasBillingType {
  BOLETO = 'BOLETO',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  PIX = 'PIX',
  UNDEFINED = 'UNDEFINED',
}

/**
 * Ciclo de cobrança para subscriptions
 */
export enum AsaasSubscriptionCycle {
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  BIMONTHLY = 'BIMONTHLY',
  QUARTERLY = 'QUARTERLY',
  SEMIANNUALLY = 'SEMIANNUALLY',
  YEARLY = 'YEARLY',
}

/**
 * Interface para criar cliente no gateway
 */
export interface CreateCustomerData {
  name: string
  email: string
  cpfCnpj: string
  phone?: string
  mobilePhone?: string
  address?: string
  addressNumber?: string
  complement?: string
  province?: string
  city?: string
  state?: string
  postalCode?: string
}

/**
 * Interface para criar subscription no gateway
 */
export interface CreateSubscriptionData {
  customerId: string
  billingType: AsaasBillingType
  value: number
  cycle: AsaasSubscriptionCycle
  description: string
  externalReference?: string
}

/**
 * Interface para criar cobrança avulsa no gateway
 */
export interface CreatePaymentData {
  customerId: string
  billingType: AsaasBillingType
  value: number
  dueDate: Date
  description: string
  externalReference?: string
  installmentCount?: number
  installmentValue?: number
}

/**
 * Resposta do gateway ao criar cliente
 */
export interface CustomerResponse {
  id: string
  name: string
  email: string
  cpfCnpj: string
}

/**
 * Resposta do gateway ao criar subscription
 */
export interface SubscriptionResponse {
  id: string
  customer: string
  billingType: AsaasBillingType
  value: number
  status: string
  nextDueDate: string
  cycle: AsaasSubscriptionCycle
}

/**
 * Resposta do gateway ao criar cobrança
 */
export interface PaymentResponse {
  id: string
  customer: string
  billingType: AsaasBillingType
  value: number
  dueDate: string
  status: AsaasPaymentStatus
  invoiceUrl?: string
  bankSlipUrl?: string
  invoiceNumber?: string
  pixQrCodeId?: string
  pixCopyAndPaste?: string
}

/**
 * Interface abstrata para gateways de pagamento
 * Permite trocar de gateway (Asaas -> Stripe, PagSeguro, etc) no futuro
 */
export interface IPaymentGateway {
  /**
   * Cria um cliente no gateway de pagamento
   */
  createCustomer(data: CreateCustomerData): Promise<CustomerResponse>

  /**
   * Cria uma subscription recorrente
   */
  createSubscription(data: CreateSubscriptionData): Promise<SubscriptionResponse>

  /**
   * Cria uma cobrança avulsa (invoice única)
   */
  createPayment(data: CreatePaymentData): Promise<PaymentResponse>

  /**
   * Busca informações de um pagamento
   */
  getPayment(paymentId: string): Promise<PaymentResponse>

  /**
   * Cancela uma subscription
   */
  cancelSubscription(subscriptionId: string): Promise<void>

  /**
   * Reativa uma subscription cancelada
   */
  reactivateSubscription(subscriptionId: string): Promise<SubscriptionResponse>

  /**
   * Estorna um pagamento
   */
  refundPayment(paymentId: string): Promise<void>
}
