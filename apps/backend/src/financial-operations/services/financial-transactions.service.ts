import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FinancialTransactionType,
  FinancialTransactionStatus,
  Prisma,
} from '@prisma/client';
import { parseISO } from 'date-fns';
import { DEFAULT_TIMEZONE, getCurrentDateInTz, parseDateOnly } from '../../utils/date.helpers';
import { TenantContextService } from '../../prisma/tenant-context.service';
import {
  CreateTransactionDto,
  GenerateContractTransactionsDto,
  FinancialTransactionSortDirection,
  FinancialTransactionSortField,
  MarkTransactionPaidDto,
  QueryTransactionsDto,
  UpdateTransactionDto,
} from '../dto';
import { FinancialContractTransactionsService } from './financial-contract-transactions.service';

@Injectable()
export class FinancialTransactionsService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly contractTransactionsService: FinancialContractTransactionsService,
  ) {}

  private parseDecimal(value: string | undefined, fallback = '0'): Prisma.Decimal {
    const raw = value ?? fallback;
    const decimal = new Prisma.Decimal(raw);

    if (decimal.isNegative()) {
      throw new BadRequestException('Valores monetários não podem ser negativos');
    }

    return decimal;
  }

  private calculateNetAmount(
    amount: Prisma.Decimal,
    discountAmount: Prisma.Decimal,
    lateFeeAmount: Prisma.Decimal,
  ) {
    const netAmount = amount.minus(discountAmount).plus(lateFeeAmount);

    if (netAmount.isNegative()) {
      throw new BadRequestException('Valor líquido não pode ser negativo');
    }

    return netAmount;
  }

  /**
   * Prisma modela @db.Date como DateTime na API do client.
   * Para evitar erro de validação com "YYYY-MM-DD", convertemos para Date em horário fixo (12:00).
   */
  private toPrismaDate(dateOnly: string): Date {
    const normalized = parseDateOnly(dateOnly);
    return parseISO(`${normalized}T12:00:00.000`);
  }

  private getSignedImpact(
    type: FinancialTransactionType,
    netAmount: Prisma.Decimal,
  ): Prisma.Decimal {
    return type === FinancialTransactionType.INCOME ? netAmount : netAmount.neg();
  }

  private async applyBankAccountImpact(
    tx: Prisma.TransactionClient,
    bankAccountId: string | null | undefined,
    impact: Prisma.Decimal,
  ): Promise<{ accountId: string; balanceAfter: Prisma.Decimal } | null> {
    if (!bankAccountId) return null;

    const account = await tx.financialBankAccount.findFirst({
      where: {
        id: bankAccountId,
        tenantId: this.tenantContext.tenantId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!account) {
      throw new NotFoundException('Conta bancária não encontrada para aplicar saldo');
    }

    const updated = await tx.financialBankAccount.update({
      where: { id: account.id },
      data: {
        currentBalance: { increment: impact },
        lastBalanceUpdate: new Date(),
      },
      select: {
        id: true,
        currentBalance: true,
      },
    });

    return {
      accountId: updated.id,
      balanceAfter: updated.currentBalance,
    };
  }

  private async appendLedgerEntry(
    tx: Prisma.TransactionClient,
    params: {
      bankAccountId: string;
      transactionId: string;
      effectiveDate: Date;
      amount: Prisma.Decimal;
      balanceAfter: Prisma.Decimal;
      entryType: string;
      description: string;
      createdBy?: string;
    },
  ): Promise<void> {
    await tx.financialBankAccountLedger.create({
      data: {
        tenantId: this.tenantContext.tenantId,
        bankAccountId: params.bankAccountId,
        transactionId: params.transactionId,
        effectiveDate: params.effectiveDate,
        amount: params.amount,
        balanceAfter: params.balanceAfter,
        entryType: params.entryType,
        description: params.description,
        referenceType: 'TRANSACTION',
        referenceId: params.transactionId,
        createdBy: params.createdBy ?? null,
      },
    });
  }

  private async validateCategory(categoryId: string, type: CreateTransactionDto['type']) {
    const category = await this.tenantContext.client.financialCategory.findFirst({
      where: {
        id: categoryId,
        tenantId: this.tenantContext.tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        type: true,
        isActive: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    if (!category.isActive) {
      throw new BadRequestException('Categoria inativa não pode ser usada');
    }

    if (category.type !== type) {
      throw new BadRequestException(
        `Tipo da categoria (${category.type}) incompatível com a transação (${type})`,
      );
    }
  }

  async create(dto: CreateTransactionDto, userId: string) {
    await this.validateCategory(dto.categoryId, dto.type);

    const amount = this.parseDecimal(dto.amount);
    const discountAmount = this.parseDecimal(dto.discountAmount);
    const lateFeeAmount = this.parseDecimal(dto.lateFeeAmount);
    const netAmount = this.calculateNetAmount(amount, discountAmount, lateFeeAmount);

    if (dto.status === FinancialTransactionStatus.PAID) {
      throw new BadRequestException(
        'Pagamento deve ser confirmado manualmente pelo fluxo de baixa',
      );
    }

    return this.tenantContext.client.financialTransaction.create({
      data: {
        tenantId: this.tenantContext.tenantId,
        type: dto.type,
        categoryId: dto.categoryId,
        residentId: dto.residentId,
        residentContractId: dto.residentContractId,
        isAutoGenerated: dto.isAutoGenerated ?? false,
        generationSource: dto.generationSource,
        amount,
        discountAmount,
        lateFeeAmount,
        netAmount,
        currency: dto.currency ?? 'BRL',
        issueDate: this.toPrismaDate(dto.issueDate),
        dueDate: this.toPrismaDate(dto.dueDate),
        competenceMonth: this.toPrismaDate(dto.competenceMonth),
        paymentMethodId: dto.paymentMethodId,
        bankAccountId: dto.bankAccountId,
        status: dto.status ?? FinancialTransactionStatus.PENDING,
        description: dto.description,
        notes: dto.notes,
        isRecurring: dto.isRecurring ?? false,
        recurrenceFrequency: dto.recurrenceFrequency,
        createdBy: userId,
        confirmedBy: null,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });
  }

  async findAll(query: QueryTransactionsDto) {
    await this.contractTransactionsService.ensureCurrentCompetenceBestEffort();

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.FinancialTransactionWhereInput = {
      tenantId: this.tenantContext.tenantId,
      deletedAt: null,
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.residentId ? { residentId: query.residentId } : {}),
      ...(query.residentContractId
        ? { residentContractId: query.residentContractId }
        : {}),
      ...(query.dueDateFrom || query.dueDateTo
        ? {
            dueDate: {
              ...(query.dueDateFrom ? { gte: this.toPrismaDate(query.dueDateFrom) } : {}),
              ...(query.dueDateTo ? { lte: this.toPrismaDate(query.dueDateTo) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { description: { contains: query.search, mode: 'insensitive' } },
              { notes: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const sortDirection: Prisma.SortOrder =
      query.sortDirection === FinancialTransactionSortDirection.DESC
        ? 'desc'
        : 'asc';

    const orderByMap: Record<
      FinancialTransactionSortField,
      Prisma.FinancialTransactionOrderByWithRelationInput
    > = {
      [FinancialTransactionSortField.DUE_DATE]: { dueDate: sortDirection },
      [FinancialTransactionSortField.NET_AMOUNT]: { netAmount: sortDirection },
      [FinancialTransactionSortField.STATUS]: { status: sortDirection },
      [FinancialTransactionSortField.DESCRIPTION]: { description: sortDirection },
    };

    const sortField =
      query.sortField ?? FinancialTransactionSortField.DUE_DATE;
    const orderBy = [orderByMap[sortField], { createdAt: 'desc' as const }];

    const [items, total] = await Promise.all([
      this.tenantContext.client.financialTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          paymentMethod: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          bankAccount: {
            select: {
              id: true,
              bankName: true,
              accountName: true,
            },
          },
        },
      }),
      this.tenantContext.client.financialTransaction.count({ where }),
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
    const transaction = await this.tenantContext.client.financialTransaction.findFirst({
      where: {
        id,
        tenantId: this.tenantContext.tenantId,
        deletedAt: null,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        paymentMethod: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        bankAccount: {
          select: {
            id: true,
            bankName: true,
            accountName: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transação não encontrada');
    }

    return transaction;
  }

  async update(id: string, dto: UpdateTransactionDto, userId: string) {
    const current = await this.findOne(id);

    if (dto.status === FinancialTransactionStatus.PAID) {
      throw new BadRequestException(
        'Pagamento deve ser confirmado manualmente pelo fluxo de baixa',
      );
    }
    if (dto.status && dto.status !== current.status) {
      throw new BadRequestException(
        'Alteração de status deve usar os fluxos específicos de baixa/cancelamento',
      );
    }

    const nextType = dto.type ?? current.type;
    const nextCategoryId = dto.categoryId ?? current.categoryId;
    const nextBankAccountId =
      dto.bankAccountId !== undefined ? dto.bankAccountId : current.bankAccountId;

    if (dto.type || dto.categoryId) {
      await this.validateCategory(nextCategoryId, nextType);
    }
    if (
      current.status === FinancialTransactionStatus.PAID &&
      !nextBankAccountId
    ) {
      throw new BadRequestException(
        'Transação paga deve permanecer vinculada a uma conta bancária',
      );
    }

    const amount = this.parseDecimal(dto.amount, current.amount.toString());
    const discountAmount = this.parseDecimal(
      dto.discountAmount,
      current.discountAmount.toString(),
    );
    const lateFeeAmount = this.parseDecimal(
      dto.lateFeeAmount,
      current.lateFeeAmount.toString(),
    );
    const netAmount = this.calculateNetAmount(amount, discountAmount, lateFeeAmount);

    return this.tenantContext.client.$transaction(async (tx) => {
      if (current.status === FinancialTransactionStatus.PAID) {
        const adjustmentDate = this.toPrismaDate(getCurrentDateInTz(DEFAULT_TIMEZONE));
        const oldImpact = this.getSignedImpact(current.type, current.netAmount);
        const newImpact = this.getSignedImpact(nextType, netAmount);
        const revertResult = await this.applyBankAccountImpact(
          tx,
          current.bankAccountId,
          oldImpact.neg(),
        );
        if (revertResult) {
          await this.appendLedgerEntry(tx, {
            bankAccountId: revertResult.accountId,
            transactionId: current.id,
            effectiveDate: adjustmentDate,
            amount: oldImpact.neg(),
            balanceAfter: revertResult.balanceAfter,
            entryType: 'PAID_TRANSACTION_UPDATE',
            description: 'Reversão para atualização de transação paga',
            createdBy: userId,
          });
        }
        const applyResult = await this.applyBankAccountImpact(
          tx,
          nextBankAccountId,
          newImpact,
        );
        if (applyResult) {
          await this.appendLedgerEntry(tx, {
            bankAccountId: applyResult.accountId,
            transactionId: current.id,
            effectiveDate: adjustmentDate,
            amount: newImpact,
            balanceAfter: applyResult.balanceAfter,
            entryType: 'PAID_TRANSACTION_UPDATE',
            description: 'Aplicação para atualização de transação paga',
            createdBy: userId,
          });
        }
      }

      return tx.financialTransaction.update({
        where: { id },
        data: {
          ...dto,
          type: nextType,
          categoryId: nextCategoryId,
          bankAccountId: nextBankAccountId,
          amount,
          discountAmount,
          lateFeeAmount,
          netAmount,
          issueDate: dto.issueDate ? this.toPrismaDate(dto.issueDate) : undefined,
          dueDate: dto.dueDate ? this.toPrismaDate(dto.dueDate) : undefined,
          competenceMonth: dto.competenceMonth
            ? this.toPrismaDate(dto.competenceMonth)
            : undefined,
          confirmedBy: current.confirmedBy,
        },
      });
    });
  }

  async markPaid(id: string, dto: MarkTransactionPaidDto, userId: string) {
    return this.tenantContext.client.$transaction(async (tx) => {
      const transaction = await tx.financialTransaction.findFirst({
        where: {
          id,
          tenantId: this.tenantContext.tenantId,
          deletedAt: null,
        },
        select: {
          id: true,
          status: true,
          type: true,
          netAmount: true,
          bankAccountId: true,
        },
      });

      if (!transaction) {
        throw new NotFoundException('Transação não encontrada');
      }

      if (transaction.status === FinancialTransactionStatus.CANCELLED) {
        throw new BadRequestException('Transação cancelada não pode ser marcada como paga');
      }
      if (transaction.status === FinancialTransactionStatus.PARTIALLY_PAID) {
        throw new BadRequestException('Baixa manual não suporta transação parcial neste momento');
      }
      if (
        transaction.status !== FinancialTransactionStatus.PAID &&
        !transaction.bankAccountId
      ) {
        throw new BadRequestException(
          'Associe uma conta bancária à transação antes de confirmar o pagamento',
        );
      }

      if (transaction.status !== FinancialTransactionStatus.PAID) {
        const impact = this.getSignedImpact(transaction.type, transaction.netAmount);
        const updateResult = await this.applyBankAccountImpact(
          tx,
          transaction.bankAccountId,
          impact,
        );
        if (updateResult) {
          await this.appendLedgerEntry(tx, {
            bankAccountId: updateResult.accountId,
            transactionId: transaction.id,
            effectiveDate: this.toPrismaDate(dto.paymentDate),
            amount: impact,
            balanceAfter: updateResult.balanceAfter,
            entryType: 'PAYMENT_CONFIRMATION',
            description: 'Confirmação manual de pagamento',
            createdBy: userId,
          });
        }
      }

      return tx.financialTransaction.update({
        where: { id },
        data: {
          status: FinancialTransactionStatus.PAID,
          paymentDate: this.toPrismaDate(dto.paymentDate),
          confirmedBy: userId,
        },
      });
    });
  }

  async cancel(id: string, userId: string) {
    return this.tenantContext.client.$transaction(async (tx) => {
      const transaction = await tx.financialTransaction.findFirst({
        where: {
          id,
          tenantId: this.tenantContext.tenantId,
          deletedAt: null,
        },
        select: {
          id: true,
          status: true,
          type: true,
          netAmount: true,
          bankAccountId: true,
        },
      });

      if (!transaction) {
        throw new NotFoundException('Transação não encontrada');
      }

      if (
        transaction.status === FinancialTransactionStatus.PAID ||
        transaction.status === FinancialTransactionStatus.PARTIALLY_PAID
      ) {
        if (transaction.status === FinancialTransactionStatus.PARTIALLY_PAID) {
          throw new BadRequestException(
            'Cancelamento de transação parcialmente paga não é suportado neste momento',
          );
        }
        const impact = this.getSignedImpact(transaction.type, transaction.netAmount);
        const cancelDate = this.toPrismaDate(getCurrentDateInTz(DEFAULT_TIMEZONE));
        const updateResult = await this.applyBankAccountImpact(
          tx,
          transaction.bankAccountId,
          impact.neg(),
        );
        if (updateResult) {
          await this.appendLedgerEntry(tx, {
            bankAccountId: updateResult.accountId,
            transactionId: transaction.id,
            effectiveDate: cancelDate,
            amount: impact.neg(),
            balanceAfter: updateResult.balanceAfter,
            entryType: 'PAYMENT_REVERSAL',
            description: 'Reversão de saldo por cancelamento de transação paga',
            createdBy: userId,
          });
        }
      }

      return tx.financialTransaction.update({
        where: { id },
        data: {
          status: FinancialTransactionStatus.CANCELLED,
          paymentDate: null,
          confirmedBy: null,
        },
      });
    });
  }

  async generateFromContracts(
    dto: GenerateContractTransactionsDto,
    userId: string,
  ) {
    return this.contractTransactionsService.ensureForCurrentTenant({
      competenceMonth: dto.competenceMonth,
      userId,
      strictCategory: true,
    });
  }
}
