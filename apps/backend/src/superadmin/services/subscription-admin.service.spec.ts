import { SubscriptionAdminService } from './subscription-admin.service'

describe('SubscriptionAdminService', () => {
  let service: SubscriptionAdminService

  const prismaMock = {
    tenant: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    plan: {
      findUnique: jest.fn(),
    },
    subscription: {
      update: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    systemAlert: {
      create: jest.fn(),
    },
  }

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-02-14T10:00:00.000Z'))
    jest.clearAllMocks()
    service = new SubscriptionAdminService(prismaMock as never)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('changePlan should cancel current subscription as canceled and respect annual cycle', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue({
      id: 'tenant-1',
      subscriptions: [{ id: 'sub-old', planId: 'plan-old', status: 'active' }],
    })
    prismaMock.plan.findUnique.mockResolvedValue({
      id: 'plan-new',
      name: 'PRO',
      billingCycle: 'ANNUAL',
      features: { prontuario: true },
    })
    prismaMock.subscription.create.mockImplementation(async ({ data }) => ({
      id: 'sub-new',
      ...data,
      plan: { id: 'plan-new' },
    }))

    await service.changePlan('tenant-1', 'plan-new', 'upgrade anual')

    expect(prismaMock.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub-old' },
      data: { status: 'canceled' },
    })

    expect(prismaMock.subscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          billingCycle: 'ANNUAL',
          currentPeriodEnd: new Date('2027-02-14T10:00:00.000Z'),
        }),
      }),
    )
  })

  it('cancel should persist status as canceled', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({
      id: 'sub-1',
      tenantId: 'tenant-1',
      planId: 'plan-1',
      status: 'active',
      tenant: { id: 'tenant-1' },
      plan: { name: 'BASICO' },
    })
    prismaMock.subscription.update.mockResolvedValue({
      id: 'sub-1',
      tenantId: 'tenant-1',
      status: 'canceled',
    })

    await service.cancel('sub-1', 'pedido do cliente')

    expect(prismaMock.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: { status: 'canceled' },
    })
  })

  it('reactivate should respect annual cycle', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({
      id: 'sub-old',
      tenantId: 'tenant-1',
      planId: 'plan-1',
      status: 'canceled',
      billingCycle: 'ANNUAL',
      tenant: { id: 'tenant-1' },
      plan: { id: 'plan-1', name: 'PRO', features: { meds: true } },
    })
    prismaMock.subscription.create.mockImplementation(async ({ data }) => ({
      id: 'sub-new',
      ...data,
      plan: { id: 'plan-1' },
    }))

    await service.reactivate('sub-old')

    expect(prismaMock.subscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'active',
          billingCycle: 'ANNUAL',
          currentPeriodEnd: new Date('2027-02-14T10:00:00.000Z'),
        }),
      }),
    )
  })
})
