import { Injectable } from '@nestjs/common';
import { TenantContextService } from '../../prisma/tenant-context.service';

@Injectable()
export class FinancialReferenceDataService {
  constructor(private readonly tenantContext: TenantContextService) {}

  async listPaymentMethods(activeOnly = true) {
    return this.tenantContext.client.financialPaymentMethod.findMany({
      where: {
        tenantId: this.tenantContext.tenantId,
        deletedAt: null,
        ...(activeOnly ? { isActive: true } : {}),
      },
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async listBankAccounts(activeOnly = true) {
    return this.tenantContext.client.financialBankAccount.findMany({
      where: {
        tenantId: this.tenantContext.tenantId,
        deletedAt: null,
        ...(activeOnly ? { isActive: true } : {}),
      },
      select: {
        id: true,
        accountName: true,
        bankName: true,
        accountType: true,
        isActive: true,
      },
      orderBy: [{ isDefault: 'desc' }, { accountName: 'asc' }],
    });
  }
}

