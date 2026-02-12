import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { parseISO } from 'date-fns';
import { DEFAULT_TIMEZONE, getCurrentDateInTz, parseDateOnly } from '../../utils/date.helpers';
import { TenantContextService } from '../../prisma/tenant-context.service';
import {
  CreateAccountDto,
  QueryAccountsDto,
  QueryAccountStatementDto,
  UpdateAccountDto,
} from '../dto';

@Injectable()
export class FinancialAccountsService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private parseBalance(value: string | undefined): Prisma.Decimal {
    const decimal = new Prisma.Decimal(value ?? '0');
    if (decimal.isNegative()) {
      throw new BadRequestException('Saldo não pode ser negativo');
    }
    return decimal;
  }

  private toPrismaDate(dateOnly: string): Date {
    const normalized = parseDateOnly(dateOnly);
    return parseISO(`${normalized}T12:00:00.000`);
  }

  private async appendLedgerEntry(
    tx: Prisma.TransactionClient,
    params: {
      bankAccountId: string;
      effectiveDate: Date;
      amount: Prisma.Decimal;
      balanceAfter: Prisma.Decimal;
      entryType: string;
      description?: string;
      referenceType?: string;
      referenceId?: string;
      transactionId?: string;
      createdBy?: string;
    },
  ) {
    await tx.financialBankAccountLedger.create({
      data: {
        tenantId: this.tenantContext.tenantId,
        bankAccountId: params.bankAccountId,
        effectiveDate: params.effectiveDate,
        amount: params.amount,
        balanceAfter: params.balanceAfter,
        entryType: params.entryType,
        description: params.description,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        transactionId: params.transactionId,
        createdBy: params.createdBy ?? null,
      },
    });
  }

  async findAll(query: QueryAccountsDto) {
    return this.tenantContext.client.financialBankAccount.findMany({
      where: {
        tenantId: this.tenantContext.tenantId,
        deletedAt: null,
        ...(query.accountType ? { accountType: query.accountType } : {}),
        ...(query.activeOnly ? { isActive: true } : {}),
        ...(query.search
          ? {
              OR: [
                { accountName: { contains: query.search, mode: 'insensitive' } },
                { bankName: { contains: query.search, mode: 'insensitive' } },
                { accountNumber: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ isDefault: 'desc' }, { bankName: 'asc' }, { accountName: 'asc' }],
    });
  }

  async findOne(id: string) {
    const account = await this.tenantContext.client.financialBankAccount.findFirst({
      where: {
        id,
        tenantId: this.tenantContext.tenantId,
        deletedAt: null,
      },
    });

    if (!account) {
      throw new NotFoundException('Conta bancária não encontrada');
    }

    return account;
  }

  async create(dto: CreateAccountDto, userId: string) {
    if (dto.isDefault) {
      await this.tenantContext.client.financialBankAccount.updateMany({
        where: {
          tenantId: this.tenantContext.tenantId,
          deletedAt: null,
          isDefault: true,
        },
        data: { isDefault: false, updatedBy: userId },
      });
    }

    try {
      return await this.tenantContext.client.$transaction(async (tx) => {
        const initialBalance = this.parseBalance(dto.currentBalance);
        const account = await tx.financialBankAccount.create({
          data: {
            tenantId: this.tenantContext.tenantId,
            bankCode: dto.bankCode,
            bankName: dto.bankName,
            branch: dto.branch,
            accountNumber: dto.accountNumber,
            accountType: dto.accountType,
            pixKey: dto.pixKey,
            pixKeyType: dto.pixKeyType,
            accountName: dto.accountName,
            currentBalance: initialBalance,
            isActive: dto.isActive ?? true,
            isDefault: dto.isDefault ?? false,
            createdBy: userId,
            updatedBy: userId,
          },
        });

        await this.appendLedgerEntry(tx, {
          bankAccountId: account.id,
          effectiveDate: this.toPrismaDate(getCurrentDateInTz(DEFAULT_TIMEZONE)),
          amount: initialBalance,
          balanceAfter: initialBalance,
          entryType: 'INITIAL_BALANCE',
          description: 'Saldo inicial da conta',
          referenceType: 'ACCOUNT',
          referenceId: account.id,
          createdBy: userId,
        });

        return account;
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Já existe conta com os mesmos dados bancários');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateAccountDto, userId: string) {
    const current = await this.findOne(id);

    if (dto.isDefault) {
      await this.tenantContext.client.financialBankAccount.updateMany({
        where: {
          tenantId: this.tenantContext.tenantId,
          deletedAt: null,
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false, updatedBy: userId },
      });
    }

    try {
      return await this.tenantContext.client.$transaction(async (tx) => {
        const nextBalance =
          dto.currentBalance !== undefined
            ? this.parseBalance(dto.currentBalance)
            : new Prisma.Decimal(current.currentBalance ?? 0);

        const updated = await tx.financialBankAccount.update({
          where: { id },
          data: {
            ...dto,
            ...(dto.currentBalance !== undefined
              ? { currentBalance: nextBalance }
              : {}),
            updatedBy: userId,
          },
        });

        if (dto.currentBalance !== undefined) {
          const currentBalance = new Prisma.Decimal(current.currentBalance ?? 0);
          const delta = nextBalance.minus(currentBalance);

          if (!delta.equals(0)) {
            await this.appendLedgerEntry(tx, {
              bankAccountId: id,
              effectiveDate: this.toPrismaDate(getCurrentDateInTz(DEFAULT_TIMEZONE)),
              amount: delta,
              balanceAfter: nextBalance,
              entryType: 'MANUAL_BALANCE_ADJUSTMENT',
              description: 'Ajuste manual de saldo da conta',
              referenceType: 'ACCOUNT',
              referenceId: id,
              createdBy: userId,
            });
          }
        }

        return updated;
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Já existe conta com os mesmos dados bancários');
      }
      throw error;
    }
  }

  async getStatement(id: string, query: QueryAccountStatementDto) {
    const account = await this.findOne(id);

    const fromDateRaw = query.fromDate ?? getCurrentDateInTz(DEFAULT_TIMEZONE);
    const toDateRaw = query.toDate ?? fromDateRaw;
    const fromDateOnly = parseDateOnly(fromDateRaw);
    const toDateOnly = parseDateOnly(toDateRaw);

    if (fromDateOnly > toDateOnly) {
      throw new BadRequestException('Período inválido: data inicial maior que data final');
    }

    const fromDate = this.toPrismaDate(fromDateOnly);
    const toDate = this.toPrismaDate(toDateOnly);

    const [entries, previousEntry] = await Promise.all([
      this.tenantContext.client.financialBankAccountLedger.findMany({
        where: {
          tenantId: this.tenantContext.tenantId,
          bankAccountId: id,
          effectiveDate: {
            gte: fromDate,
            lte: toDate,
          },
        },
        orderBy: [{ effectiveDate: 'asc' }, { createdAt: 'asc' }],
        include: {
          transaction: {
            select: {
              id: true,
              type: true,
              status: true,
              description: true,
              paymentDate: true,
              netAmount: true,
              category: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
        },
      }),
      this.tenantContext.client.financialBankAccountLedger.findFirst({
        where: {
          tenantId: this.tenantContext.tenantId,
          bankAccountId: id,
          effectiveDate: {
            lt: fromDate,
          },
        },
        orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
        select: {
          balanceAfter: true,
        },
      }),
    ]);

    const openingBalance = previousEntry
      ? new Prisma.Decimal(previousEntry.balanceAfter)
      : entries.length > 0
        ? entries[0].entryType === 'INITIAL_BALANCE'
          ? new Prisma.Decimal(entries[0].balanceAfter)
          : new Prisma.Decimal(entries[0].balanceAfter).minus(entries[0].amount)
        : new Prisma.Decimal(account.currentBalance ?? 0);

    const periodNetImpact = entries.reduce(
      // Tradeoff: lançamento de saldo inicial é referência de base e não
      // movimentação operacional do período.
      (sum, item) => item.entryType === 'INITIAL_BALANCE' ? sum : sum.plus(item.amount),
      new Prisma.Decimal(0),
    );

    const closingBalance = entries.length > 0
      ? new Prisma.Decimal(entries[entries.length - 1].balanceAfter)
      : openingBalance;

    const mappedEntries = entries.map((entry) => ({
      id: entry.id,
      type: entry.transaction?.type || null,
      status: entry.transaction?.status || null,
      description: entry.transaction?.description || entry.description || '-',
      paymentDate: entry.transaction?.paymentDate || entry.effectiveDate,
      netAmount: entry.transaction?.netAmount || entry.amount,
      impactAmount: entry.amount,
      runningBalance: entry.balanceAfter,
      category: entry.transaction?.category
        ? {
            id: entry.transaction.category.id,
            name: entry.transaction.category.name,
            type: entry.transaction.category.type,
          }
        : null,
      entryType: entry.entryType,
    }));

    return {
      account: {
        id: account.id,
        accountName: account.accountName,
        bankName: account.bankName,
        branch: account.branch,
        accountNumber: account.accountNumber,
        accountType: account.accountType,
        currentBalance: account.currentBalance,
      },
      period: {
        fromDate: fromDateOnly,
        toDate: toDateOnly,
      },
      summary: {
        openingBalance,
        closingBalance,
        periodNetImpact,
        entriesCount: mappedEntries.length,
      },
      entries: mappedEntries,
    };
  }
}
