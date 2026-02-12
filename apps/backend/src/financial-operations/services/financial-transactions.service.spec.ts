import { BadRequestException } from '@nestjs/common';
import { FinancialTransactionStatus } from '@prisma/client';
import { FinancialTransactionsService } from './financial-transactions.service';

describe('FinancialTransactionsService', () => {
  const makeService = () => {
    const tenantContext = {
      tenantId: 'tenant-1',
      client: {
        financialCategory: {
          findFirst: jest.fn(),
        },
        financialTransaction: {
          create: jest.fn(),
          findMany: jest.fn(),
          count: jest.fn(),
          findFirst: jest.fn(),
          update: jest.fn(),
        },
      },
    } as any;

    return {
      service: new FinancialTransactionsService(tenantContext),
      tenantContext,
    };
  };

  it('deve bloquear criação com status PAID fora da baixa manual', async () => {
    const { service, tenantContext } = makeService();
    tenantContext.client.financialCategory.findFirst.mockResolvedValue({
      id: 'cat-1',
      type: 'INCOME',
      isActive: true,
    });

    await expect(
      service.create(
        {
          type: 'INCOME',
          categoryId: 'cat-1',
          amount: '100.00',
          issueDate: '2026-02-12',
          dueDate: '2026-02-12',
          competenceMonth: '2026-02-01',
          description: 'Teste',
          status: FinancialTransactionStatus.PAID,
        },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deve bloquear update com status PAID fora da baixa manual', async () => {
    const { service, tenantContext } = makeService();
    tenantContext.client.financialTransaction.findFirst.mockResolvedValue({
      id: 'tx-1',
      tenantId: 'tenant-1',
      deletedAt: null,
      type: 'INCOME',
      categoryId: 'cat-1',
      amount: { toString: () => '100.00' },
      discountAmount: { toString: () => '0.00' },
      lateFeeAmount: { toString: () => '0.00' },
      confirmedBy: null,
    });

    await expect(
      service.update('tx-1', {
        status: FinancialTransactionStatus.PAID,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

