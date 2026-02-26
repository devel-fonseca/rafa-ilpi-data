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
import { differenceInCalendarDays, parseISO } from 'date-fns';
import {
  DEFAULT_TIMEZONE,
  formatDateOnly,
  getCurrentDateInTz,
  parseDateOnly,
} from '../../utils/date.helpers';
import { TenantContextService } from '../../prisma/tenant-context.service';
import {
  CreateTransactionDto,
  GenerateContractTransactionsDto,
  FinancialTransactionSortDirection,
  FinancialTransactionSortField,
  MarkTransactionPartiallyPaidDto,
  MarkTransactionPaidDto,
  QueryTransactionsDto,
  UpdateTransactionDto,
} from '../dto';
import { FinancialContractTransactionsService } from './financial-contract-transactions.service';

@Injectable()
export class FinancialTransactionsService {
  private static readonly INTEREST_BASE_DAYS = 30;

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

  private getPaidAmountFromImpact(
    type: FinancialTransactionType,
    impact: Prisma.Decimal,
  ): Prisma.Decimal {
    return type === FinancialTransactionType.INCOME ? impact : impact.neg();
  }

  private roundMoney(value: Prisma.Decimal): Prisma.Decimal {
    return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  }

  private getDaysOverdue(dueDate: Date, referenceDateOnly: string): number {
    const normalizedReferenceDate = parseDateOnly(referenceDateOnly);
    const dueDateOnly = formatDateOnly(dueDate);
    const due = parseISO(`${dueDateOnly}T12:00:00.000`);
    const reference = parseISO(`${normalizedReferenceDate}T12:00:00.000`);
    return differenceInCalendarDays(reference, due);
  }

  private calculateContractLateFeeAmount(params: {
    amount: Prisma.Decimal;
    discountAmount: Prisma.Decimal;
    dueDate: Date;
    referenceDateOnly: string;
    lateFeePercent: Prisma.Decimal;
    interestMonthlyPercent: Prisma.Decimal;
  }): Prisma.Decimal {
    const principal = params.amount.minus(params.discountAmount);
    if (principal.lte(0)) {
      return new Prisma.Decimal(0);
    }

    const daysOverdue = this.getDaysOverdue(params.dueDate, params.referenceDateOnly);
    if (daysOverdue <= 0) {
      return new Prisma.Decimal(0);
    }

    const fixedLateFee = params.lateFeePercent.gt(0)
      ? principal.mul(params.lateFeePercent).div(100)
      : new Prisma.Decimal(0);

    const proratedInterest = params.interestMonthlyPercent.gt(0)
      ? principal
          .mul(params.interestMonthlyPercent)
          .div(100)
          .mul(daysOverdue)
          .div(FinancialTransactionsService.INTEREST_BASE_DAYS)
      : new Prisma.Decimal(0);

    return this.roundMoney(fixedLateFee.plus(proratedInterest));
  }

  private calculateContractNetAmount(params: {
    amount: Prisma.Decimal;
    discountAmount: Prisma.Decimal;
    dueDate: Date;
    referenceDateOnly: string;
    lateFeePercent: Prisma.Decimal;
    interestMonthlyPercent: Prisma.Decimal;
  }): { lateFeeAmount: Prisma.Decimal; netAmount: Prisma.Decimal } {
    const lateFeeAmount = this.calculateContractLateFeeAmount(params);
    const netAmount = this.calculateNetAmount(
      params.amount,
      params.discountAmount,
      lateFeeAmount,
    );
    return { lateFeeAmount, netAmount };
  }

  private async syncContractLateFeeForTransaction(
    tx: Prisma.TransactionClient,
    transaction: {
      id: string;
      residentContractId: string | null;
      amount: Prisma.Decimal;
      discountAmount: Prisma.Decimal;
      lateFeeAmount: Prisma.Decimal;
      netAmount: Prisma.Decimal;
      dueDate: Date;
    },
    referenceDateOnly: string,
  ): Promise<{ lateFeeAmount: Prisma.Decimal; netAmount: Prisma.Decimal }> {
    if (!transaction.residentContractId) {
      return {
        lateFeeAmount: transaction.lateFeeAmount,
        netAmount: transaction.netAmount,
      };
    }

    const contract = await tx.residentContract.findFirst({
      where: {
        id: transaction.residentContractId,
        tenantId: this.tenantContext.tenantId,
        deletedAt: null,
      },
      select: {
        lateFeePercent: true,
        interestMonthlyPercent: true,
      },
    });

    if (!contract) {
      return {
        lateFeeAmount: transaction.lateFeeAmount,
        netAmount: transaction.netAmount,
      };
    }

    const recalculated = this.calculateContractNetAmount({
      amount: transaction.amount,
      discountAmount: transaction.discountAmount,
      dueDate: transaction.dueDate,
      referenceDateOnly,
      lateFeePercent: contract.lateFeePercent,
      interestMonthlyPercent: contract.interestMonthlyPercent,
    });

    if (
      transaction.lateFeeAmount.equals(recalculated.lateFeeAmount) &&
      transaction.netAmount.equals(recalculated.netAmount)
    ) {
      return recalculated;
    }

    await tx.financialTransaction.update({
      where: { id: transaction.id },
      data: {
        lateFeeAmount: recalculated.lateFeeAmount,
        netAmount: recalculated.netAmount,
      },
    });

    return recalculated;
  }

  private async getAppliedImpactForTransaction(
    tx: Prisma.TransactionClient,
    transactionId: string,
  ): Promise<Prisma.Decimal> {
    const aggregation = await tx.financialBankAccountLedger.aggregate({
      where: {
        tenantId: this.tenantContext.tenantId,
        transactionId,
      },
      _sum: {
        amount: true,
      },
    });

    return new Prisma.Decimal(aggregation._sum.amount ?? 0);
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

    if (
      dto.status === FinancialTransactionStatus.PAID ||
      dto.status === FinancialTransactionStatus.PARTIALLY_PAID
    ) {
      throw new BadRequestException(
        'Pagamento deve ser confirmado pelos fluxos de baixa (total/parcial)',
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
    await this.contractTransactionsService.ensureCurrentCompetenceBestEffort({
      tenantId: this.tenantContext.tenantId,
    });

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

    if (
      dto.status === FinancialTransactionStatus.PAID ||
      dto.status === FinancialTransactionStatus.PARTIALLY_PAID
    ) {
      throw new BadRequestException(
        'Pagamento deve ser confirmado pelos fluxos de baixa (total/parcial)',
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
    const touchesPaidFinancialFields =
      dto.type !== undefined ||
      dto.categoryId !== undefined ||
      dto.amount !== undefined ||
      dto.discountAmount !== undefined ||
      dto.lateFeeAmount !== undefined ||
      dto.bankAccountId !== undefined;

    if (
      current.status === FinancialTransactionStatus.PARTIALLY_PAID &&
      touchesPaidFinancialFields
    ) {
      throw new BadRequestException(
        'Transação parcialmente paga não pode alterar tipo/categoria/valores/conta',
      );
    }

    if (
      (
        current.status === FinancialTransactionStatus.PAID ||
        current.status === FinancialTransactionStatus.PARTIALLY_PAID
      ) &&
      !nextBankAccountId
    ) {
      throw new BadRequestException(
        'Transação paga/parcial deve permanecer vinculada a uma conta bancária',
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
          residentContractId: true,
          amount: true,
          discountAmount: true,
          lateFeeAmount: true,
          netAmount: true,
          dueDate: true,
          bankAccountId: true,
        },
      });

      if (!transaction) {
        throw new NotFoundException('Transação não encontrada');
      }

      if (transaction.status === FinancialTransactionStatus.CANCELLED) {
        throw new BadRequestException('Transação cancelada não pode ser marcada como paga');
      }

      const recalculated = await this.syncContractLateFeeForTransaction(
        tx,
        transaction,
        dto.paymentDate,
      );

      const appliedImpact = await this.getAppliedImpactForTransaction(tx, transaction.id);
      const appliedPaidAmount = this.getPaidAmountFromImpact(transaction.type, appliedImpact);

      if (appliedPaidAmount.isNegative()) {
        throw new BadRequestException('Histórico de pagamentos inconsistente para esta transação');
      }

      const remainingAmount = new Prisma.Decimal(recalculated.netAmount).minus(appliedPaidAmount);
      if (remainingAmount.isNegative()) {
        throw new BadRequestException('Valor já pago excede o valor líquido da transação');
      }

      if (
        transaction.status !== FinancialTransactionStatus.PAID &&
        remainingAmount.gt(0) &&
        !transaction.bankAccountId
      ) {
        throw new BadRequestException(
          'Associe uma conta bancária à transação antes de confirmar o pagamento',
        );
      }

      if (transaction.status !== FinancialTransactionStatus.PAID && remainingAmount.gt(0)) {
        const impact = this.getSignedImpact(transaction.type, remainingAmount);
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
            description:
              transaction.status === FinancialTransactionStatus.PARTIALLY_PAID
                ? 'Quitação de pagamento parcial'
                : 'Confirmação manual de pagamento',
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

  async markPartiallyPaid(
    id: string,
    dto: MarkTransactionPartiallyPaidDto,
    userId: string,
  ) {
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
          residentContractId: true,
          amount: true,
          discountAmount: true,
          lateFeeAmount: true,
          netAmount: true,
          dueDate: true,
          bankAccountId: true,
        },
      });

      if (!transaction) {
        throw new NotFoundException('Transação não encontrada');
      }

      if (transaction.status === FinancialTransactionStatus.CANCELLED) {
        throw new BadRequestException('Transação cancelada não pode receber baixa parcial');
      }
      if (transaction.status === FinancialTransactionStatus.PAID) {
        throw new BadRequestException('Transação já está totalmente paga');
      }
      if (!transaction.bankAccountId) {
        throw new BadRequestException(
          'Associe uma conta bancária à transação antes de confirmar pagamento parcial',
        );
      }

      const partialAmount = this.parseDecimal(dto.amount);
      if (partialAmount.lte(0)) {
        throw new BadRequestException('Valor da baixa parcial deve ser maior que zero');
      }

      const recalculated = await this.syncContractLateFeeForTransaction(
        tx,
        transaction,
        dto.paymentDate,
      );

      const appliedImpact = await this.getAppliedImpactForTransaction(tx, transaction.id);
      const alreadyPaidAmount = this.getPaidAmountFromImpact(transaction.type, appliedImpact);
      if (alreadyPaidAmount.isNegative()) {
        throw new BadRequestException('Histórico de pagamentos inconsistente para esta transação');
      }

      const remainingAmount = new Prisma.Decimal(recalculated.netAmount).minus(alreadyPaidAmount);
      if (remainingAmount.lte(0)) {
        throw new BadRequestException('Transação já está quitada');
      }
      if (partialAmount.gt(remainingAmount)) {
        throw new BadRequestException('Valor parcial excede o saldo restante da transação');
      }

      const impact = this.getSignedImpact(transaction.type, partialAmount);
      const updateResult = await this.applyBankAccountImpact(
        tx,
        transaction.bankAccountId,
        impact,
      );

      if (updateResult) {
        const becomesPaid = partialAmount.equals(remainingAmount);
        await this.appendLedgerEntry(tx, {
          bankAccountId: updateResult.accountId,
          transactionId: transaction.id,
          effectiveDate: this.toPrismaDate(dto.paymentDate),
          amount: impact,
          balanceAfter: updateResult.balanceAfter,
          entryType: becomesPaid ? 'PAYMENT_CONFIRMATION' : 'PARTIAL_PAYMENT_CONFIRMATION',
          description: becomesPaid
            ? 'Quitação por baixa parcial'
            : 'Confirmação manual de pagamento parcial',
          createdBy: userId,
        });
      }

      const nextStatus = partialAmount.equals(remainingAmount)
        ? FinancialTransactionStatus.PAID
        : FinancialTransactionStatus.PARTIALLY_PAID;

      return tx.financialTransaction.update({
        where: { id },
        data: {
          status: nextStatus,
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
        const appliedImpact = await this.getAppliedImpactForTransaction(tx, transaction.id);
        const cancelDate = this.toPrismaDate(getCurrentDateInTz(DEFAULT_TIMEZONE));
        if (!appliedImpact.equals(0)) {
          const updateResult = await this.applyBankAccountImpact(
            tx,
            transaction.bankAccountId,
            appliedImpact.neg(),
          );
          if (updateResult) {
            await this.appendLedgerEntry(tx, {
              bankAccountId: updateResult.accountId,
              transactionId: transaction.id,
              effectiveDate: cancelDate,
              amount: appliedImpact.neg(),
              balanceAfter: updateResult.balanceAfter,
              entryType: 'PAYMENT_REVERSAL',
              description: 'Reversão de saldo por cancelamento de transação paga/parcial',
              createdBy: userId,
            });
          }
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
    return this.contractTransactionsService.ensureForTenant({
      tenantId: this.tenantContext.tenantId,
      competenceMonth: dto.competenceMonth,
      userId,
      strictCategory: true,
    });
  }

  async recalculateOpenInstallmentsFromContract(input: {
    contractId: string;
    referenceDate?: string;
  }): Promise<{
    contractId: string;
    referenceDate: string;
    totalOpenInstallments: number;
    updated: number;
    unchanged: number;
  }> {
    const referenceDateOnly = parseDateOnly(
      input.referenceDate ?? getCurrentDateInTz(DEFAULT_TIMEZONE),
    );

    const contract = await this.tenantContext.client.residentContract.findFirst({
      where: {
        id: input.contractId,
        tenantId: this.tenantContext.tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        lateFeePercent: true,
        interestMonthlyPercent: true,
      },
    });

    if (!contract) {
      throw new NotFoundException('Contrato não encontrado para recálculo financeiro');
    }

    const openTransactions = await this.tenantContext.client.financialTransaction.findMany({
      where: {
        tenantId: this.tenantContext.tenantId,
        residentContractId: contract.id,
        deletedAt: null,
        status: {
          in: [
            FinancialTransactionStatus.PENDING,
            FinancialTransactionStatus.OVERDUE,
          ],
        },
      },
      select: {
        id: true,
        amount: true,
        discountAmount: true,
        lateFeeAmount: true,
        netAmount: true,
        dueDate: true,
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    if (openTransactions.length === 0) {
      return {
        contractId: contract.id,
        referenceDate: referenceDateOnly,
        totalOpenInstallments: 0,
        updated: 0,
        unchanged: 0,
      };
    }

    let updated = 0;
    await this.tenantContext.client.$transaction(async (tx) => {
      for (const transaction of openTransactions) {
        const recalculated = this.calculateContractNetAmount({
          amount: transaction.amount,
          discountAmount: transaction.discountAmount,
          dueDate: transaction.dueDate,
          referenceDateOnly,
          lateFeePercent: contract.lateFeePercent,
          interestMonthlyPercent: contract.interestMonthlyPercent,
        });

        if (
          transaction.lateFeeAmount.equals(recalculated.lateFeeAmount) &&
          transaction.netAmount.equals(recalculated.netAmount)
        ) {
          continue;
        }

        await tx.financialTransaction.update({
          where: { id: transaction.id },
          data: {
            lateFeeAmount: recalculated.lateFeeAmount,
            netAmount: recalculated.netAmount,
          },
        });
        updated++;
      }
    });

    return {
      contractId: contract.id,
      referenceDate: referenceDateOnly,
      totalOpenInstallments: openTransactions.length,
      updated,
      unchanged: openTransactions.length - updated,
    };
  }
}
