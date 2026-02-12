import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  FinancialReconciliationStatus,
  FinancialTransactionStatus,
  FinancialTransactionType,
  Prisma,
} from '@prisma/client';
import { parseISO } from 'date-fns';
import { parseDateOnly } from '../../utils/date.helpers';
import {
  CreateReconciliationDto,
  QueryReconciliationsDto,
  QueryUnreconciledPaidTransactionsDto,
} from '../dto';
import { TenantContextService } from '../../prisma/tenant-context.service';
import { FinancialContractTransactionsService } from './financial-contract-transactions.service';

@Injectable()
export class FinancialReconciliationsService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly contractTransactionsService: FinancialContractTransactionsService,
  ) {}

  private parseDecimal(value: string): Prisma.Decimal {
    const decimal = new Prisma.Decimal(value);
    if (decimal.isNegative()) {
      throw new BadRequestException('Valor não pode ser negativo');
    }
    return decimal;
  }

  /**
   * Campos @db.Date no Prisma precisam receber Date no client.
   * Usamos 12:00 para evitar deslocamentos por timezone.
   */
  private toPrismaDate(dateOnly: string): Date {
    const normalized = parseDateOnly(dateOnly);
    return parseISO(`${normalized}T12:00:00.000`);
  }

  async findAll(query: QueryReconciliationsDto) {
    await this.contractTransactionsService.ensureCurrentCompetenceBestEffort();

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.FinancialReconciliationWhereInput = {
      tenantId: this.tenantContext.tenantId,
      ...(query.bankAccountId ? { bankAccountId: query.bankAccountId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.tenantContext.client.financialReconciliation.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ reconciliationDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          bankAccount: {
            select: {
              id: true,
              accountName: true,
              bankName: true,
            },
          },
        },
      }),
      this.tenantContext.client.financialReconciliation.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const reconciliation =
      await this.tenantContext.client.financialReconciliation.findFirst({
        where: {
          id,
          tenantId: this.tenantContext.tenantId,
        },
        include: {
          bankAccount: {
            select: {
              id: true,
              accountName: true,
              bankName: true,
            },
          },
          items: {
            include: {
              transaction: {
                select: {
                  id: true,
                  description: true,
                  type: true,
                  netAmount: true,
                  paymentDate: true,
                  status: true,
                },
              },
            },
            orderBy: {
              transaction: {
                paymentDate: 'asc',
              },
            },
          },
        },
      });

    if (!reconciliation) {
      throw new NotFoundException('Fechamento não encontrado');
    }

    return reconciliation;
  }

  async findUnreconciledPaidTransactions(
    query: QueryUnreconciledPaidTransactionsDto,
  ) {
    await this.contractTransactionsService.ensureCurrentCompetenceBestEffort();

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const fromDate = query.fromDate ? this.toPrismaDate(query.fromDate) : undefined;
    const toDate = query.toDate ? this.toPrismaDate(query.toDate) : undefined;

    if (query.fromDate && query.toDate && query.fromDate > query.toDate) {
      throw new BadRequestException(
        'Período inválido: data inicial maior que data final',
      );
    }

    const where: Prisma.FinancialTransactionWhereInput = {
      tenantId: this.tenantContext.tenantId,
      deletedAt: null,
      status: FinancialTransactionStatus.PAID,
      paymentDate: {
        ...(fromDate ? { gte: fromDate } : {}),
        ...(toDate ? { lte: toDate } : {}),
      },
      ...(query.bankAccountId ? { bankAccountId: query.bankAccountId } : {}),
      ...(query.search
        ? {
            OR: [
              { description: { contains: query.search, mode: 'insensitive' } },
              { notes: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      // "Sem fechamento" = transação ainda não incluída em nenhum fechamento.
      // (independente de status final técnico de reconciliação).
      items: {
        none: {},
      },
    };

    const [items, total, totals] = await Promise.all([
      this.tenantContext.client.financialTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ paymentDate: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          description: true,
          type: true,
          netAmount: true,
          paymentDate: true,
          status: true,
          category: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          bankAccount: {
            select: {
              id: true,
              accountName: true,
              bankName: true,
            },
          },
        },
      }),
      this.tenantContext.client.financialTransaction.count({ where }),
      this.tenantContext.client.financialTransaction.groupBy({
        by: ['type'],
        where,
        _sum: {
          netAmount: true,
        },
      }),
    ]);

    const totalIncome = totals
      .filter((item) => item.type === FinancialTransactionType.INCOME)
      .reduce((sum, item) => sum.plus(item._sum.netAmount ?? 0), new Prisma.Decimal(0));

    const totalExpense = totals
      .filter((item) => item.type === FinancialTransactionType.EXPENSE)
      .reduce((sum, item) => sum.plus(item._sum.netAmount ?? 0), new Prisma.Decimal(0));

    return {
      items,
      summary: {
        total,
        totalIncome,
        totalExpense,
        netImpact: totalIncome.minus(totalExpense),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(dto: CreateReconciliationDto, userId: string) {
    const startDateOnly = parseDateOnly(dto.startDate);
    const endDateOnly = parseDateOnly(dto.endDate);
    const reconciliationDate = this.toPrismaDate(dto.reconciliationDate);
    const startDate = this.toPrismaDate(dto.startDate);
    const endDate = this.toPrismaDate(dto.endDate);

    if (startDateOnly > endDateOnly) {
      throw new BadRequestException('Período inválido: data inicial maior que data final');
    }

    const bankAccount =
      await this.tenantContext.client.financialBankAccount.findFirst({
        where: {
          id: dto.bankAccountId,
          tenantId: this.tenantContext.tenantId,
          deletedAt: null,
        },
        select: { id: true },
      });

    if (!bankAccount) {
      throw new NotFoundException('Conta bancária não encontrada');
    }

    const existingReconciliation =
      await this.tenantContext.client.financialReconciliation.findFirst({
        where: {
          tenantId: this.tenantContext.tenantId,
          bankAccountId: dto.bankAccountId,
          reconciliationDate,
        },
        select: { id: true },
      });

    if (existingReconciliation) {
      throw new BadRequestException(
        'Já existe fechamento para esta conta na data informada',
      );
    }

    const openingBalance = this.parseDecimal(dto.openingBalance);
    const closingBalance = this.parseDecimal(dto.closingBalance);

    const transactions =
      await this.tenantContext.client.financialTransaction.findMany({
        where: {
          tenantId: this.tenantContext.tenantId,
          bankAccountId: dto.bankAccountId,
          deletedAt: null,
          status: {
            in: [
              FinancialTransactionStatus.PAID,
              FinancialTransactionStatus.PARTIALLY_PAID,
            ],
          },
          paymentDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          type: true,
          netAmount: true,
        },
      });

    const totalIncome = transactions
      .filter((t) => t.type === FinancialTransactionType.INCOME)
      .reduce((sum, t) => sum.plus(t.netAmount), new Prisma.Decimal(0));

    const totalExpense = transactions
      .filter((t) => t.type === FinancialTransactionType.EXPENSE)
      .reduce((sum, t) => sum.plus(t.netAmount), new Prisma.Decimal(0));

    const systemBalance = openingBalance.plus(totalIncome).minus(totalExpense);
    const difference = closingBalance.minus(systemBalance);

    let status: FinancialReconciliationStatus =
      FinancialReconciliationStatus.PENDING;
    if (difference.equals(0)) {
      status = FinancialReconciliationStatus.RECONCILED;
    } else {
      status = FinancialReconciliationStatus.DISCREPANCY;
    }

    return this.tenantContext.client.$transaction(async (tx) => {
      const reconciliation = await tx.financialReconciliation.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          bankAccountId: dto.bankAccountId,
          reconciliationDate,
          startDate,
          endDate,
          openingBalance,
          closingBalance,
          systemBalance,
          difference,
          status,
          reconciledTransactionsCount: transactions.length,
          totalIncome,
          totalExpense,
          notes: dto.notes,
          reconciledBy:
            status === FinancialReconciliationStatus.RECONCILED ? userId : null,
        },
      });

      if (transactions.length > 0) {
        await tx.financialReconciliationItem.createMany({
          data: transactions.map((transaction) => ({
            reconciliationId: reconciliation.id,
            transactionId: transaction.id,
            isReconciled: status === FinancialReconciliationStatus.RECONCILED,
            reconciledAt:
              status === FinancialReconciliationStatus.RECONCILED
                ? new Date()
                : null,
            reconciledBy:
              status === FinancialReconciliationStatus.RECONCILED
                ? userId
                : null,
          })),
          skipDuplicates: true,
        });
      }

      if (status === FinancialReconciliationStatus.RECONCILED) {
        await tx.financialBankAccount.update({
          where: { id: dto.bankAccountId },
          data: {
            currentBalance: closingBalance,
            lastBalanceUpdate: new Date(),
          },
        });
      }

      return tx.financialReconciliation.findFirst({
        where: {
          id: reconciliation.id,
          tenantId: this.tenantContext.tenantId,
        },
        include: {
          bankAccount: {
            select: {
              id: true,
              accountName: true,
              bankName: true,
            },
          },
          items: {
            include: {
              transaction: {
                select: {
                  id: true,
                  description: true,
                  type: true,
                  netAmount: true,
                  paymentDate: true,
                  status: true,
                },
              },
            },
            orderBy: {
              transaction: {
                paymentDate: 'asc',
              },
            },
          },
        },
      });
    });
  }
}
