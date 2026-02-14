import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance, AxiosError } from 'axios'
import { parseDateOnly } from '../../utils/date.helpers'
import {
  IPaymentGateway,
  CreateCustomerData,
  CreateSubscriptionData,
  CreatePaymentData,
  CustomerResponse,
  SubscriptionResponse,
  PaymentResponse,
} from '../gateways/payment-gateway.interface'
import { RetryWithBackoff } from '../decorators/retry.decorator'

/**
 * Service para integração com API do Asaas
 * @see https://docs.asaas.com/reference/inicio
 */
@Injectable()
export class AsaasService implements IPaymentGateway {
  private readonly logger = new Logger(AsaasService.name)
  private readonly client: AxiosInstance
  private readonly apiUrl: string
  private readonly apiKey: string

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ASAAS_API_KEY') || ''
    const environment = this.configService.get<string>('ASAAS_ENVIRONMENT') || 'sandbox'

    // Sandbox: https://sandbox.asaas.com/api/v3
    // Production: https://api.asaas.com/v3
    this.apiUrl =
      environment === 'production'
        ? 'https://api.asaas.com/v3'
        : 'https://sandbox.asaas.com/api/v3'

    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        access_token: this.apiKey,
      },
      timeout: 30000, // 30 segundos
    })

    this.logger.log(`🚀 AsaasService initialized (${environment} mode)`)
  }

  /**
   * Cria um cliente no Asaas
   * @see https://docs.asaas.com/reference/criar-novo-cliente
   */
  @RetryWithBackoff(3, 1000, [429, 500, 502, 503, 504])
  async createCustomer(data: CreateCustomerData): Promise<CustomerResponse> {
    try {
      this.logger.log(`Creating customer: ${data.email}`)

      const response = await this.client.post('/customers', {
        name: data.name,
        email: data.email,
        cpfCnpj: data.cpfCnpj,
        phone: data.phone,
        mobilePhone: data.mobilePhone,
        address: data.address,
        addressNumber: data.addressNumber,
        complement: data.complement,
        province: data.province,
        postalCode: data.postalCode,
      })

      this.logger.log(`✓ Customer created: ${response.data.id}`)

      return {
        id: response.data.id,
        name: response.data.name,
        email: response.data.email,
        cpfCnpj: response.data.cpfCnpj,
      }
    } catch (error) {
      this.handleError('createCustomer', error)
    }
  }

  /**
   * Cria uma subscription recorrente
   * @see https://docs.asaas.com/reference/criar-assinatura
   */
  @RetryWithBackoff(3, 1000, [429, 500, 502, 503, 504])
  async createSubscription(
    data: CreateSubscriptionData,
  ): Promise<SubscriptionResponse> {
    try {
      this.logger.log(`Creating subscription for customer: ${data.customerId}`)

      const response = await this.client.post('/subscriptions', {
        customer: data.customerId,
        billingType: data.billingType,
        value: data.value,
        cycle: data.cycle,
        description: data.description,
        nextDueDate: data.nextDueDate, // Data de vencimento da primeira cobrança
        externalReference: data.externalReference,
      })

      this.logger.log(`✓ Subscription created: ${response.data.id}`)

      return {
        id: response.data.id,
        customer: response.data.customer,
        billingType: response.data.billingType,
        value: response.data.value,
        status: response.data.status,
        nextDueDate: response.data.nextDueDate,
        cycle: response.data.cycle,
      }
    } catch (error) {
      this.handleError('createSubscription', error)
    }
  }

  /**
   * Cria uma cobrança avulsa
   * @see https://docs.asaas.com/reference/criar-nova-cobranca
   */
  @RetryWithBackoff(3, 1000, [429, 500, 502, 503, 504])
  async createPayment(data: CreatePaymentData): Promise<PaymentResponse> {
    try {
      this.logger.log(`Creating payment for customer: ${data.customerId}`)

      const response = await this.client.post('/payments', {
        customer: data.customerId,
        billingType: data.billingType,
        value: data.value,
        dueDate: parseDateOnly(data.dueDate), // YYYY-MM-DD (data civil, sem conversão UTC)
        description: data.description,
        externalReference: data.externalReference,
        installmentCount: data.installmentCount,
        installmentValue: data.installmentValue,
      })

      this.logger.log(`✓ Payment created: ${response.data.id}`)

      return {
        id: response.data.id,
        customer: response.data.customer,
        billingType: response.data.billingType,
        value: response.data.value,
        dueDate: response.data.dueDate,
        status: response.data.status,
        invoiceUrl: response.data.invoiceUrl,
        bankSlipUrl: response.data.bankSlipUrl,
        invoiceNumber: response.data.invoiceNumber,
        pixQrCodeId: response.data.pix?.qrCode?.id,
        pixCopyAndPaste: response.data.pix?.qrCode?.payload,
      }
    } catch (error) {
      this.handleError('createPayment', error)
    }
  }

  /**
   * Busca customer por CPF/CNPJ
   * @see https://docs.asaas.com/reference/listar-clientes
   */
  @RetryWithBackoff(3, 1000, [429, 500, 502, 503, 504])
  async findCustomerByCpfCnpj(cpfCnpj: string): Promise<CustomerResponse | null> {
    try {
      this.logger.log(`Searching customer by CPF/CNPJ: ${cpfCnpj}`)

      const response = await this.client.get('/customers', {
        params: { cpfCnpj },
      })

      // Se encontrou customers, retornar o primeiro
      if (response.data.data && response.data.data.length > 0) {
        const customer = response.data.data[0]
        this.logger.log(`✓ Customer found: ${customer.id}`)

        return {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          cpfCnpj: customer.cpfCnpj,
        }
      }

      this.logger.log(`✗ No customer found with CPF/CNPJ: ${cpfCnpj}`)
      return null
    } catch (error) {
      this.logger.warn(`Error searching customer: ${error.message}`)
      return null // Não falhar se busca der erro, apenas retornar null
    }
  }

  /**
   * Busca informações de um pagamento
   * @see https://docs.asaas.com/reference/recuperar-uma-unica-cobranca
   */
  @RetryWithBackoff(3, 1000, [429, 500, 502, 503, 504])
  async getPayment(paymentId: string): Promise<PaymentResponse> {
    try {
      this.logger.log(`Fetching payment: ${paymentId}`)

      const response = await this.client.get(`/payments/${paymentId}`)

      return {
        id: response.data.id,
        customer: response.data.customer,
        billingType: response.data.billingType,
        value: response.data.value,
        dueDate: response.data.dueDate,
        status: response.data.status,
        paymentDate: response.data.paymentDate,
        invoiceUrl: response.data.invoiceUrl,
        bankSlipUrl: response.data.bankSlipUrl,
        invoiceNumber: response.data.invoiceNumber,
        pixQrCodeId: response.data.pix?.qrCode?.id,
        pixCopyAndPaste: response.data.pix?.qrCode?.payload,
      }
    } catch (error) {
      this.handleError('getPayment', error)
    }
  }

  /**
   * Cancela uma subscription
   * @see https://docs.asaas.com/reference/deletar-assinatura
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      this.logger.log(`Canceling subscription: ${subscriptionId}`)

      await this.client.delete(`/subscriptions/${subscriptionId}`)

      this.logger.log(`✓ Subscription canceled: ${subscriptionId}`)
    } catch (error) {
      this.handleError('cancelSubscription', error)
    }
  }

  /**
   * Reativa uma subscription cancelada
   * Nota: Asaas não tem endpoint direto para reativar, precisamos criar uma nova
   */
  async reactivateSubscription(
    subscriptionId: string,
  ): Promise<SubscriptionResponse> {
    try {
      this.logger.warn(
        `Asaas does not support reactivation. Create a new subscription instead.`,
      )

      // Buscar subscription atual para obter dados
      const response = await this.client.get(`/subscriptions/${subscriptionId}`)

      // Criar nova subscription com os mesmos dados
      return this.createSubscription({
        customerId: response.data.customer,
        billingType: response.data.billingType,
        value: response.data.value,
        cycle: response.data.cycle,
        description: response.data.description,
        externalReference: response.data.externalReference,
      })
    } catch (error) {
      this.handleError('reactivateSubscription', error)
    }
  }

  /**
   * Estorna um pagamento
   * @see https://docs.asaas.com/reference/estornar-cobranca
   */
  async refundPayment(paymentId: string): Promise<void> {
    try {
      this.logger.log(`Refunding payment: ${paymentId}`)

      await this.client.post(`/payments/${paymentId}/refund`)

      this.logger.log(`✓ Payment refunded: ${paymentId}`)
    } catch (error) {
      this.handleError('refundPayment', error)
    }
  }

  /**
   * Busca QR Code PIX para um pagamento
   * @see https://docs.asaas.com/reference/get-qr-code-for-pix-payments
   * @param paymentId - ID do pagamento no Asaas
   * @returns QR Code encodedImage (Base64) e outras informações
   */
  @RetryWithBackoff(3, 1000, [429, 500, 502, 503, 504])
  async getPixQrCode(paymentId: string): Promise<{
    encodedImage: string
    payload: string
    expirationDate: string
  }> {
    try {
      this.logger.log(`Fetching PIX QR Code for payment: ${paymentId}`)

      const response = await this.client.get(`/payments/${paymentId}/pixQrCode`)

      this.logger.log(`✓ PIX QR Code fetched for payment: ${paymentId}`)

      return {
        encodedImage: response.data.encodedImage,
        payload: response.data.payload,
        expirationDate: response.data.expirationDate,
      }
    } catch (error) {
      this.handleError('getPixQrCode', error)
    }
  }

  /**
   * Busca uma subscription por ID no Asaas
   * @param subscriptionId - ID da subscription no Asaas
   * @returns Dados da subscription
   */
  @RetryWithBackoff(3, 1000, [429, 500, 502, 503, 504])
  async getSubscription(subscriptionId: string): Promise<SubscriptionResponse> {
    try {
      this.logger.debug(`📋 Fetching subscription ${subscriptionId} from Asaas...`)

      const response = await this.client.get(`/subscriptions/${subscriptionId}`)

      this.logger.debug(`✓ Subscription ${subscriptionId} fetched successfully`)

      return response.data
    } catch (error) {
      this.handleError('getSubscription', error)
    }
  }

  /**
   * Handler centralizado de erros da API Asaas
   */
  private handleError(method: string, error: unknown): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError
      const status = axiosError.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      const data = axiosError.response?.data as { errors?: Array<{ description?: string; code?: string }>; message?: string } | undefined

      this.logger.error(
        `❌ Asaas API Error [${method}]: ${data?.errors?.[0]?.description || data?.message || axiosError.message}`,
      )

      throw new HttpException(
        {
          message: `Erro no gateway de pagamento: ${data?.errors?.[0]?.description || data?.message || 'Erro desconhecido'}`,
          code: data?.errors?.[0]?.code,
          method,
        },
        status,
      )
    }

    this.logger.error(`❌ Unexpected error [${method}]:`, error)
    throw new HttpException(
      {
        message: 'Erro inesperado no processamento de pagamento',
        method,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    )
  }
}
