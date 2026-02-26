import { FinancialContractTransactionsJob } from './financial-contract-transactions.job';

describe('FinancialContractTransactionsJob', () => {
  const makeJob = () => {
    const prisma = {
      tenant: {
        findMany: jest.fn(),
      },
    } as any;

    const contractTransactionsService = {
      ensureForTenant: jest.fn(),
    } as any;

    return {
      job: new FinancialContractTransactionsJob(prisma, contractTransactionsService),
      prisma,
      contractTransactionsService,
    };
  };

  it('deve processar todos os tenants ativos no cron diário', async () => {
    const { job, prisma, contractTransactionsService } = makeJob();
    prisma.tenant.findMany.mockResolvedValue([
      { id: 'tenant-1', name: 'Tenant 1' },
      { id: 'tenant-2', name: 'Tenant 2' },
    ]);
    contractTransactionsService.ensureForTenant.mockResolvedValue({
      competenceMonth: '2026-02-01',
      generated: 1,
      skippedExisting: 0,
      skippedNoCategory: 0,
      totalEligibleContracts: 1,
    });

    await job.syncCurrentCompetence();

    expect(contractTransactionsService.ensureForTenant).toHaveBeenCalledTimes(2);
    expect(contractTransactionsService.ensureForTenant).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ tenantId: 'tenant-1', strictCategory: false }),
    );
    expect(contractTransactionsService.ensureForTenant).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ tenantId: 'tenant-2', strictCategory: false }),
    );
  });

  it('deve continuar processamento quando um tenant falha', async () => {
    const { job, prisma, contractTransactionsService } = makeJob();
    prisma.tenant.findMany.mockResolvedValue([
      { id: 'tenant-1', name: 'Tenant 1' },
      { id: 'tenant-2', name: 'Tenant 2' },
    ]);
    contractTransactionsService.ensureForTenant
      .mockRejectedValueOnce(new Error('Falha tenant 1'))
      .mockResolvedValueOnce({
        competenceMonth: '2026-02-01',
        generated: 2,
        skippedExisting: 0,
        skippedNoCategory: 0,
        totalEligibleContracts: 2,
      });

    await job.syncCurrentCompetence();

    expect(contractTransactionsService.ensureForTenant).toHaveBeenCalledTimes(2);
  });
});
