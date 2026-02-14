import { InvoiceService } from './invoice.service'
import { AsaasService } from './asaas.service'
import { AsaasBillingType } from '../gateways/payment-gateway.interface'

describe('InvoiceService - civil due date', () => {
  let service: InvoiceService

  const prismaMock = {
    subscription: {
      findFirst: jest.fn(),
    },
    invoice: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    tenant: {
      update: jest.fn(),
    },
  }

  const asaasMock = {
    createPayment: jest.fn(),
    createCustomer: jest.fn(),
    findCustomerByCpfCnpj: jest.fn(),
  } as unknown as AsaasService

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-02-13T02:30:00.000Z'))
    jest.clearAllMocks()

    service = new InvoiceService(prismaMock as never, asaasMock)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should send dueDate to Asaas as date-only in tenant timezone (no UTC day shift)', async () => {
    prismaMock.subscription.findFirst.mockResolvedValue({
      id: 'sub-1',
      tenantId: 'tenant-1',
      tenant: {
        id: 'tenant-1',
        name: 'ILPI Teste',
        email: 'financeiro@ilpi.com',
        cnpj: '12.345.678/0001-90',
        timezone: 'America/Sao_Paulo',
        asaasCustomerId: 'cus_123',
      },
      plan: {
        id: 'plan-1',
        displayName: 'Plano Profissional',
      },
    })

    prismaMock.invoice.findFirst.mockResolvedValue(null)

    asaasMock.createPayment = jest.fn().mockResolvedValue({
      id: 'pay_123',
      status: 'PENDING',
      invoiceUrl: 'https://asaas.test/invoice/123',
      bankSlipUrl: null,
    })

    prismaMock.invoice.create.mockImplementation(async (input) => ({
      id: 'inv-1',
      invoiceNumber: input.data.invoiceNumber,
      asaasInvoiceId: input.data.asaasInvoiceId || null,
      paymentUrl: input.data.paymentUrl || null,
      ...input.data,
      tenant: { id: 'tenant-1' },
      subscription: { id: 'sub-1', plan: { displayName: 'Plano Profissional' } },
    }))

    await service.generateInvoice({
      tenantId: 'tenant-1',
      subscriptionId: 'sub-1',
      amount: 299.9,
      billingType: AsaasBillingType.BOLETO,
      description: 'Mensalidade',
    })

    expect(asaasMock.createPayment).toHaveBeenCalledTimes(1)
    expect(asaasMock.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        dueDate: '2026-03-24',
      }),
    )
  })
})
