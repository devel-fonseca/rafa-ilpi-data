import { BadRequestException } from '@nestjs/common';
import { FinancialTransactionStatus, Prisma } from '@prisma/client';
import { FinancialTransactionsService } from './financial-transactions.service';

describe('FinancialTransactionsService', () => {
  const makeService = () => {
    const tx = {
      financialTransaction: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      residentContract: {
        findFirst: jest.fn(),
      },
      financialBankAccount: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      financialBankAccountLedger: {
        create: jest.fn(),
        aggregate: jest.fn(),
      },
    };

    const tenantContext = {
      tenantId: 'tenant-1',
      client: {
        financialCategory: {
          findFirst: jest.fn(),
        },
        residentContract: {
          findFirst: jest.fn(),
        },
        financialTransaction: {
          create: jest.fn(),
          findMany: jest.fn(),
          count: jest.fn(),
          findFirst: jest.fn(),
          update: jest.fn(),
        },
        $transaction: jest.fn(async (callback: (arg: typeof tx) => unknown) => callback(tx)),
      },
    } as any;

    const contractTransactionsService = {
      ensureCurrentCompetenceBestEffort: jest.fn(),
      ensureForTenant: jest.fn(),
    } as any;

    return {
      service: new FinancialTransactionsService(tenantContext, contractTransactionsService),
      tenantContext,
      contractTransactionsService,
      tx,
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

  it('deve bloquear criação com status PARTIALLY_PAID fora do fluxo específico', async () => {
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
          status: FinancialTransactionStatus.PARTIALLY_PAID,
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
      status: FinancialTransactionStatus.PENDING,
      type: 'INCOME',
      categoryId: 'cat-1',
      amount: new Prisma.Decimal(100),
      discountAmount: new Prisma.Decimal(0),
      lateFeeAmount: new Prisma.Decimal(0),
      netAmount: new Prisma.Decimal(100),
      bankAccountId: 'acc-1',
      confirmedBy: null,
    });

    await expect(
      service.update(
        'tx-1',
        {
          status: FinancialTransactionStatus.PAID,
        },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deve bloquear baixa parcial sem conta bancária', async () => {
    const { service, tx } = makeService();
    tx.financialTransaction.findFirst.mockResolvedValue({
      id: 'tx-1',
      status: FinancialTransactionStatus.PENDING,
      type: 'INCOME',
      residentContractId: null,
      amount: new Prisma.Decimal(100),
      discountAmount: new Prisma.Decimal(0),
      lateFeeAmount: new Prisma.Decimal(0),
      netAmount: new Prisma.Decimal(100),
      dueDate: new Date('2026-02-01T12:00:00.000Z'),
      bankAccountId: null,
    });

    await expect(
      service.markPartiallyPaid(
        'tx-1',
        { paymentDate: '2026-02-12', amount: '10.00' },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deve quitar pagamento parcial pendente aplicando apenas o restante', async () => {
    const { service, tx } = makeService();
    tx.financialTransaction.findFirst.mockResolvedValue({
      id: 'tx-1',
      status: FinancialTransactionStatus.PARTIALLY_PAID,
      type: 'INCOME',
      residentContractId: null,
      amount: new Prisma.Decimal(100),
      discountAmount: new Prisma.Decimal(0),
      lateFeeAmount: new Prisma.Decimal(0),
      netAmount: new Prisma.Decimal(100),
      dueDate: new Date('2026-02-01T12:00:00.000Z'),
      bankAccountId: 'acc-1',
    });
    tx.financialBankAccountLedger.aggregate.mockResolvedValue({
      _sum: { amount: new Prisma.Decimal(40) },
    });
    tx.financialBankAccount.findFirst.mockResolvedValue({ id: 'acc-1' });
    tx.financialBankAccount.update.mockResolvedValue({
      id: 'acc-1',
      currentBalance: new Prisma.Decimal(1000),
    });
    tx.financialTransaction.update.mockResolvedValue({
      id: 'tx-1',
      status: FinancialTransactionStatus.PAID,
    });

    await service.markPaid('tx-1', { paymentDate: '2026-02-12' }, 'user-1');

    const bankUpdateArg = tx.financialBankAccount.update.mock.calls[0][0];
    expect(bankUpdateArg.data.currentBalance.increment.toString()).toBe('60');
    expect(tx.financialTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: FinancialTransactionStatus.PAID,
        }),
      }),
    );
  });

  it('deve recalcular multa e juros temporal na baixa total de mensalidade em atraso', async () => {
    const { service, tx } = makeService();
    tx.financialTransaction.findFirst.mockResolvedValue({
      id: 'tx-1',
      status: FinancialTransactionStatus.PENDING,
      type: 'INCOME',
      residentContractId: 'contract-1',
      amount: new Prisma.Decimal(100),
      discountAmount: new Prisma.Decimal(0),
      lateFeeAmount: new Prisma.Decimal(0),
      netAmount: new Prisma.Decimal(100),
      dueDate: new Date('2026-02-10T12:00:00.000Z'),
      bankAccountId: 'acc-1',
    });
    tx.residentContract.findFirst.mockResolvedValue({
      lateFeePercent: new Prisma.Decimal(2),
      interestMonthlyPercent: new Prisma.Decimal(1),
    });
    tx.financialBankAccountLedger.aggregate.mockResolvedValue({
      _sum: { amount: new Prisma.Decimal(0) },
    });
    tx.financialBankAccount.findFirst.mockResolvedValue({ id: 'acc-1' });
    tx.financialBankAccount.update.mockResolvedValue({
      id: 'acc-1',
      currentBalance: new Prisma.Decimal(1000),
    });
    tx.financialTransaction.update
      .mockResolvedValueOnce({
        id: 'tx-1',
        lateFeeAmount: new Prisma.Decimal(2.33),
        netAmount: new Prisma.Decimal(102.33),
      })
      .mockResolvedValueOnce({
        id: 'tx-1',
        status: FinancialTransactionStatus.PAID,
      });

    await service.markPaid('tx-1', { paymentDate: '2026-02-20' }, 'user-1');

    const recalculationCall = tx.financialTransaction.update.mock.calls[0][0];
    expect(recalculationCall.data.lateFeeAmount.toString()).toBe('2.33');
    expect(recalculationCall.data.netAmount.toString()).toBe('102.33');

    const bankUpdateArg = tx.financialBankAccount.update.mock.calls[0][0];
    expect(bankUpdateArg.data.currentBalance.increment.toString()).toBe('102.33');
  });

  it('deve recalcular parcelas abertas de contrato com política temporal de atraso', async () => {
    const { service, tenantContext, tx } = makeService();
    tenantContext.client.residentContract.findFirst.mockResolvedValue({
      id: 'contract-1',
      lateFeePercent: new Prisma.Decimal(2),
      interestMonthlyPercent: new Prisma.Decimal(1),
    });
    tenantContext.client.financialTransaction.findMany.mockResolvedValue([
      {
        id: 'tx-overdue',
        amount: new Prisma.Decimal(100),
        discountAmount: new Prisma.Decimal(0),
        lateFeeAmount: new Prisma.Decimal(0),
        netAmount: new Prisma.Decimal(100),
        dueDate: new Date('2026-02-10T12:00:00.000Z'),
      },
      {
        id: 'tx-future',
        amount: new Prisma.Decimal(100),
        discountAmount: new Prisma.Decimal(0),
        lateFeeAmount: new Prisma.Decimal(0),
        netAmount: new Prisma.Decimal(100),
        dueDate: new Date('2026-03-10T12:00:00.000Z'),
      },
    ]);
    tx.financialTransaction.update.mockResolvedValue({});

    const result = await service.recalculateOpenInstallmentsFromContract({
      contractId: 'contract-1',
      referenceDate: '2026-02-20',
    });

    expect(result.totalOpenInstallments).toBe(2);
    expect(result.updated).toBe(1);
    expect(result.unchanged).toBe(1);
    expect(tx.financialTransaction.update).toHaveBeenCalledTimes(1);

    const updateArg = tx.financialTransaction.update.mock.calls[0][0];
    expect(updateArg.where.id).toBe('tx-overdue');
    expect(updateArg.data.lateFeeAmount.toString()).toBe('2.33');
    expect(updateArg.data.netAmount.toString()).toBe('102.33');
  });

  it('deve permitir cancelar transação parcialmente paga revertendo impacto aplicado', async () => {
    const { service, tx } = makeService();
    tx.financialTransaction.findFirst.mockResolvedValue({
      id: 'tx-1',
      status: FinancialTransactionStatus.PARTIALLY_PAID,
      type: 'INCOME',
      netAmount: new Prisma.Decimal(100),
      bankAccountId: 'acc-1',
    });
    tx.financialBankAccountLedger.aggregate.mockResolvedValue({
      _sum: { amount: new Prisma.Decimal(35) },
    });
    tx.financialBankAccount.findFirst.mockResolvedValue({ id: 'acc-1' });
    tx.financialBankAccount.update.mockResolvedValue({
      id: 'acc-1',
      currentBalance: new Prisma.Decimal(965),
    });
    tx.financialTransaction.update.mockResolvedValue({
      id: 'tx-1',
      status: FinancialTransactionStatus.CANCELLED,
    });

    await service.cancel('tx-1', 'user-1');

    const bankUpdateArg = tx.financialBankAccount.update.mock.calls[0][0];
    expect(bankUpdateArg.data.currentBalance.increment.toString()).toBe('-35');
    expect(tx.financialTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: FinancialTransactionStatus.CANCELLED,
        }),
      }),
    );
  });
});
