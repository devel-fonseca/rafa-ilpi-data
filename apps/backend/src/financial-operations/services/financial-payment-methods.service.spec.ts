import { FinancialPaymentMethodsService } from './financial-payment-methods.service';

describe('FinancialPaymentMethodsService', () => {
  const makeService = () => {
    const tenantContext = {
      tenantId: 'tenant-1',
      client: {
        financialPaymentMethod: {
          create: jest.fn(),
          update: jest.fn(),
          findMany: jest.fn(),
          findFirst: jest.fn(),
        },
      },
    } as any;

    return {
      service: new FinancialPaymentMethodsService(tenantContext),
      tenantContext,
    };
  };

  it('deve forçar requiresManualConfirmation = true na criação', async () => {
    const { service, tenantContext } = makeService();
    tenantContext.client.financialPaymentMethod.create.mockResolvedValue({
      id: 'm1',
      requiresManualConfirmation: true,
    });

    await service.create({
      name: 'PIX',
      code: 'pix',
      requiresManualConfirmation: false,
      allowsInstallments: false,
      maxInstallments: 1,
      isActive: true,
    });

    expect(tenantContext.client.financialPaymentMethod.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          requiresManualConfirmation: true,
        }),
      }),
    );
  });

  it('deve forçar requiresManualConfirmation = true na atualização', async () => {
    const { service, tenantContext } = makeService();
    tenantContext.client.financialPaymentMethod.findFirst.mockResolvedValue({
      id: 'm1',
      tenantId: 'tenant-1',
      deletedAt: null,
    });
    tenantContext.client.financialPaymentMethod.update.mockResolvedValue({
      id: 'm1',
      requiresManualConfirmation: true,
    });

    await service.update('m1', {
      requiresManualConfirmation: false,
      name: 'PIX editado',
    });

    expect(tenantContext.client.financialPaymentMethod.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          requiresManualConfirmation: true,
        }),
      }),
    );
  });
});

