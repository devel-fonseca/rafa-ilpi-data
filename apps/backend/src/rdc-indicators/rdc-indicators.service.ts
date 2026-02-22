import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  IncidentMonthlyIndicator,
  IncidentCategory,
  IncidentSeverity,
  IncidentSubtypeClinical,
  Prisma,
  PrismaClient,
  RecordType,
  RdcIndicatorType,
} from '@prisma/client';
import { parseISO } from 'date-fns';
import { formatDateOnly, parseDateOnly } from '../utils/date.helpers';
import {
  RdcIndicatorHistoryMonth,
  RdcIndicatorResult,
  RdcIndicatorsByType,
} from './interfaces/rdc-indicator-result.interface';

type TenantDbClient = PrismaClient | Prisma.TransactionClient;
type ReviewDecision = 'CONFIRMED' | 'DISCARDED' | 'PENDING';

type IndicatorCaseRecord = {
  id: string;
  residentId: string;
  date: Date;
  time: string;
  incidentSeverity: IncidentSeverity | null;
  notes: string | null;
  data: Prisma.JsonValue;
  resident: {
    id: string;
    fullName: string;
  };
};

const RDC_INDICATOR_ORDER: RdcIndicatorType[] = [
  RdcIndicatorType.MORTALIDADE,
  RdcIndicatorType.DIARREIA_AGUDA,
  RdcIndicatorType.ESCABIOSE,
  RdcIndicatorType.DESIDRATACAO,
  RdcIndicatorType.ULCERA_DECUBITO,
  RdcIndicatorType.DESNUTRICAO,
];

@Injectable()
export class RdcIndicatorsService {
  private readonly logger = new Logger(RdcIndicatorsService.name);

  constructor(
    private readonly prisma: PrismaService, // tabelas SHARED e tenant client
  ) {}

  private async getTenantClient(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { schemaName: true },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} não encontrado`);
    }

    return this.prisma.getTenantClient(tenant.schemaName);
  }

  private getMonthDateRange(year: number, month: number) {
    const paddedMonth = String(month).padStart(2, '0');
    const lastDay = new Date(year, month, 0).getDate();
    const startDate = `${year}-${paddedMonth}-01`;
    const endDate = `${year}-${paddedMonth}-${String(lastDay).padStart(2, '0')}`;
    const populationReferenceDate = `${year}-${paddedMonth}-15`;

    const startDateObj = this.toDateOnlyPrismaValue(startDate);
    const endDateObj = this.toDateOnlyPrismaValue(endDate);
    const populationReferenceDateObj =
      this.toDateOnlyPrismaValue(populationReferenceDate);

    return {
      startDate,
      endDate,
      populationReferenceDate,
      startDateObj,
      endDateObj,
      populationReferenceDateObj,
    };
  }

  /**
   * Prisma modela @db.Date como DateTime no client.
   * Usamos 12:00 para evitar shift de dia por timezone.
   */
  private toDateOnlyPrismaValue(dateOnly: string): Date {
    const cleanDate = parseDateOnly(dateOnly);
    return parseISO(`${cleanDate}T12:00:00.000`);
  }

  private getClinicalSubtypeForIndicator(indicatorType: RdcIndicatorType) {
    switch (indicatorType) {
      case RdcIndicatorType.MORTALIDADE:
        return IncidentSubtypeClinical.OBITO;
      case RdcIndicatorType.DIARREIA_AGUDA:
        return IncidentSubtypeClinical.DOENCA_DIARREICA_AGUDA;
      case RdcIndicatorType.ESCABIOSE:
        return IncidentSubtypeClinical.ESCABIOSE;
      case RdcIndicatorType.DESIDRATACAO:
        return IncidentSubtypeClinical.DESIDRATACAO;
      case RdcIndicatorType.ULCERA_DECUBITO:
        return IncidentSubtypeClinical.ULCERA_DECUBITO;
      case RdcIndicatorType.DESNUTRICAO:
        return IncidentSubtypeClinical.DESNUTRICAO;
      default:
        return null;
    }
  }

  private assertDateWithinMonth(dateOnly: string, year: number, month: number) {
    const normalized = parseDateOnly(dateOnly);
    const [dateYear, dateMonth] = normalized.split('-').map(Number);
    if (dateYear !== year || dateMonth !== month) {
      throw new BadRequestException(
        'A data do caso deve pertencer ao mês/ano selecionados.',
      );
    }
    return normalized;
  }

  private parseIncidentIds(rawIncidentIds: Prisma.JsonValue): string[] {
    if (!Array.isArray(rawIncidentIds)) return [];
    return rawIncidentIds.filter((id): id is string => typeof id === 'string');
  }

  private getDateOnlyString(value: Date | string | null | undefined): string | null {
    if (!value) return null;
    try {
      return formatDateOnly(value);
    } catch {
      return null;
    }
  }

  private getIsoTimestamp(value: Date | null | undefined): string | null {
    return value ? value.toISOString() : null;
  }

  private asObject(value: Prisma.JsonValue | null): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as Record<string, unknown>;
  }

  private readIndicatorField<T>(
    indicator: IncidentMonthlyIndicator,
    fieldName: string,
    fallback: T,
  ): T {
    const value = (indicator as Record<string, unknown>)[fieldName];
    return (value ?? fallback) as T;
  }

  private normalizeReviewDecision(value: string): ReviewDecision | null {
    if (!value) return null;
    const normalized = value.toUpperCase();
    if (
      normalized === 'CONFIRMED' ||
      normalized === 'DISCARDED' ||
      normalized === 'PENDING'
    ) {
      return normalized;
    }
    return null;
  }

  private calculateNumerator(
    indicatorType: RdcIndicatorType,
    cases: Array<{ residentId: string }>,
  ): number {
    if (indicatorType === RdcIndicatorType.MORTALIDADE) {
      return cases.length;
    }
    return new Set(cases.map((item) => item.residentId)).size;
  }

  private async getPopulationOnReferenceDate(
    tenantClient: TenantDbClient,
    referenceDate: Date,
  ): Promise<number> {
    return tenantClient.resident.count({
      where: {
        admissionDate: { lte: referenceDate },
        OR: [{ dischargeDate: null }, { dischargeDate: { gte: referenceDate } }],
        deletedAt: null,
      },
    });
  }

  private async getIndicatorCasesInPeriod(
    tenantClient: TenantDbClient,
    indicatorType: RdcIndicatorType,
    startDate: Date,
    endDate: Date,
  ): Promise<IndicatorCaseRecord[]> {
    const subtype = this.getClinicalSubtypeForIndicator(indicatorType);
    if (!subtype) return [];

    const records = await tenantClient.dailyRecord.findMany({
      where: {
        type: 'INTERCORRENCIA',
        incidentSubtypeClinical: subtype,
        date: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      select: {
        id: true,
        residentId: true,
        date: true,
        time: true,
        incidentSeverity: true,
        notes: true,
        data: true,
        resident: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: [{ date: 'desc' }, { time: 'desc' }],
    });

    return records;
  }

  private async getIndicatorCasesByIds(
    tenantClient: TenantDbClient,
    incidentIds: string[],
  ): Promise<IndicatorCaseRecord[]> {
    if (incidentIds.length === 0) return [];

    const records = await tenantClient.dailyRecord.findMany({
      where: {
        id: { in: incidentIds },
        deletedAt: null,
      },
      select: {
        id: true,
        residentId: true,
        date: true,
        time: true,
        incidentSeverity: true,
        notes: true,
        data: true,
        resident: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    const positionById = new Map(
      incidentIds.map((incidentId, index) => [incidentId, index]),
    );

    records.sort((left, right) => {
      const leftPos = positionById.get(left.id) ?? Number.MAX_SAFE_INTEGER;
      const rightPos = positionById.get(right.id) ?? Number.MAX_SAFE_INTEGER;
      return leftPos - rightPos;
    });

    return records;
  }

  private async refreshIndicatorAggregates(params: {
    tenantClient: TenantDbClient;
    indicator: IncidentMonthlyIndicator;
    candidateCases: Array<{ id: string; residentId: string }>;
  }): Promise<IncidentMonthlyIndicator> {
    const { tenantClient, indicator, candidateCases } = params;
    const incidentIds = candidateCases.map((candidate) => candidate.id);
    const reviewDelegate = tenantClient.incidentMonthlyIndicatorReview;

    if (incidentIds.length === 0) {
      await reviewDelegate.deleteMany({
        where: { indicatorId: indicator.id },
      });

      return tenantClient.incidentMonthlyIndicator.update({
        where: { id: indicator.id },
        data: {
          incidentIds: [],
          totalCandidates: 0,
          pendingCount: 0,
          confirmedCount: 0,
          discardedCount: 0,
          provisionalNumerator: 0,
          numerator: 0,
          rate: 0,
        },
      });
    }

    await reviewDelegate.deleteMany({
      where: {
        indicatorId: indicator.id,
        incidentId: { notIn: incidentIds },
      },
    });

    const reviews = (await reviewDelegate.findMany({
      where: {
        indicatorId: indicator.id,
        incidentId: { in: incidentIds },
      },
      select: {
        incidentId: true,
        decision: true,
      },
    })) as Array<{ incidentId: string; decision: string }>;

    const reviewDecisionByIncident = new Map(
      reviews.map((review) => [review.incidentId, review.decision.toUpperCase()]),
    );

    const confirmedCount = reviews.filter(
      (review) => review.decision.toUpperCase() === 'CONFIRMED',
    ).length;
    const discardedCount = reviews.filter(
      (review) => review.decision.toUpperCase() === 'DISCARDED',
    ).length;

    const pendingCount = Math.max(incidentIds.length - confirmedCount - discardedCount, 0);

    const includedCases = candidateCases.filter((candidate) => {
      const decision = reviewDecisionByIncident.get(candidate.id);
      return decision !== 'DISCARDED';
    });

    const provisionalNumerator = this.calculateNumerator(
      indicator.indicatorType,
      candidateCases,
    );
    const numerator = this.calculateNumerator(indicator.indicatorType, includedCases);
    const rate = indicator.denominator > 0 ? (numerator / indicator.denominator) * 100 : 0;

    return tenantClient.incidentMonthlyIndicator.update({
      where: { id: indicator.id },
      data: {
        incidentIds,
        totalCandidates: incidentIds.length,
        pendingCount,
        confirmedCount,
        discardedCount,
        provisionalNumerator,
        numerator,
        rate,
      },
    });
  }

  private extractDescription(record: Pick<IndicatorCaseRecord, 'data' | 'notes'>): string {
    const data = this.asObject(record.data);

    const candidates = [
      data.incidentDescription,
      data.description,
      data.descricao,
      data.acaoTomada,
      data.summary,
      data.reason,
      data.alertMessage,
      data.eventDescription,
      record.notes,
    ];

    for (const value of candidates) {
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }

    return 'Caso identificado para revisão do indicador.';
  }

  private buildIndicatorResult(indicator: IncidentMonthlyIndicator): RdcIndicatorResult {
    const totalCandidates = this.readIndicatorField<number>(
      indicator,
      'totalCandidates',
      this.parseIncidentIds(indicator.incidentIds).length,
    );
    const pendingCount = this.readIndicatorField<number>(indicator, 'pendingCount', 0);
    const confirmedCount = this.readIndicatorField<number>(
      indicator,
      'confirmedCount',
      0,
    );
    const discardedCount = this.readIndicatorField<number>(
      indicator,
      'discardedCount',
      0,
    );
    const provisionalNumerator = this.readIndicatorField<number>(
      indicator,
      'provisionalNumerator',
      indicator.numerator,
    );
    const periodStatus =
      this.readIndicatorField<string>(indicator, 'periodStatus', 'OPEN') === 'CLOSED'
        ? 'CLOSED'
        : 'OPEN';
    const periodClosedAt = this.getIsoTimestamp(
      this.readIndicatorField<Date | null>(indicator, 'periodClosedAt', null),
    );
    const periodClosedBy = this.readIndicatorField<string | null>(
      indicator,
      'periodClosedBy',
      null,
    );
    const periodClosedByName = this.readIndicatorField<string | null>(
      indicator,
      'periodClosedByName',
      null,
    );
    const periodCloseNote = this.readIndicatorField<string | null>(
      indicator,
      'periodCloseNote',
      null,
    );
    const metadata = this.asObject(indicator.metadata);
    const populationReferenceDate = this.getDateOnlyString(
      this.readIndicatorField<Date | string | null>(
        indicator,
        'populationReferenceDate',
        null,
      ),
    );

    return {
      numerator: indicator.numerator,
      denominator: indicator.denominator,
      rate: indicator.rate,
      incidentIds: this.parseIncidentIds(indicator.incidentIds),
      metadata: {
        ...metadata,
        totalCandidates,
        pendingCount,
        confirmedCount,
        discardedCount,
        populationReferenceDate,
        periodClosure: {
          status: periodStatus,
          closedAt: periodClosedAt,
          closedBy: periodClosedBy,
          closedByName: periodClosedByName,
          note: periodCloseNote,
        },
      } as Prisma.JsonValue,
      calculatedAt: indicator.calculatedAt,
      provisionalNumerator,
      totalCandidates,
      pendingCount,
      confirmedCount,
      discardedCount,
      populationReferenceDate,
      periodStatus,
      periodClosedAt,
      periodClosedBy,
      periodClosedByName,
      periodCloseNote,
    };
  }

  private async upsertIndicator(params: {
    tenantClient: TenantDbClient;
    tenantId: string;
    year: number;
    month: number;
    indicatorType: RdcIndicatorType;
    denominator: number;
    populationReferenceDate: Date;
    candidateCases: Array<{ id: string; residentId: string }>;
    metadata?: Prisma.JsonValue;
    calculatedBy?: string;
  }): Promise<void> {
    const {
      tenantClient,
      tenantId,
      year,
      month,
      indicatorType,
      denominator,
      populationReferenceDate,
      candidateCases,
      metadata,
      calculatedBy,
    } = params;

    const provisionalNumerator = this.calculateNumerator(indicatorType, candidateCases);
    const provisionalRate =
      denominator > 0 ? (provisionalNumerator / denominator) * 100 : 0;

    const incidentIds = candidateCases.map((candidate) => candidate.id);

    const indicator = await tenantClient.incidentMonthlyIndicator.upsert({
      where: {
        tenantId_year_month_indicatorType: {
          tenantId,
          year,
          month,
          indicatorType,
        },
      },
      create: {
        tenantId,
        year,
        month,
        indicatorType,
        numerator: provisionalNumerator,
        denominator,
        rate: provisionalRate,
        provisionalNumerator,
        totalCandidates: incidentIds.length,
        pendingCount: incidentIds.length,
        confirmedCount: 0,
        discardedCount: 0,
        populationReferenceDate,
        incidentIds,
        metadata: metadata ?? Prisma.JsonNull,
        calculatedBy,
      },
      update: {
        denominator,
        provisionalNumerator,
        populationReferenceDate,
        incidentIds,
        metadata: metadata ?? Prisma.JsonNull,
        calculatedAt: new Date(),
        calculatedBy,
      },
    });

    await this.refreshIndicatorAggregates({
      tenantClient,
      indicator,
      candidateCases,
    });
  }

  async calculateMonthlyIndicators(
    tenantId: string,
    year: number,
    month: number,
    calculatedBy?: string,
  ): Promise<void> {
    this.logger.log(`Calculando indicadores RDC para ${year}/${month}`, {
      tenantId,
      year,
      month,
    });

    const tenantClient = await this.getTenantClient(tenantId);
    const closedIndicator = await tenantClient.incidentMonthlyIndicator.findFirst({
      where: {
        tenantId,
        year,
        month,
        periodStatus: 'CLOSED',
      },
      select: { id: true },
    });

    if (closedIndicator) {
      throw new BadRequestException(
        'O mês está fechado. Reabra o período antes de recalcular os indicadores.',
      );
    }

    const {
      populationReferenceDate,
      startDateObj,
      endDateObj,
      populationReferenceDateObj,
    } = this.getMonthDateRange(year, month);
    const denominator = await this.getPopulationOnReferenceDate(
      tenantClient,
      populationReferenceDateObj,
    );

    await Promise.all(
      RDC_INDICATOR_ORDER.map(async (indicatorType) => {
        const cases = await this.getIndicatorCasesInPeriod(
          tenantClient,
          indicatorType,
          startDateObj,
          endDateObj,
        );

        await this.upsertIndicator({
          tenantClient,
          tenantId,
          year,
          month,
          indicatorType,
          denominator,
          populationReferenceDate: populationReferenceDateObj,
          candidateCases: cases.map((item) => ({
            id: item.id,
            residentId: item.residentId,
          })),
          metadata: {
            totalEpisodes: cases.length,
            uniqueResidents: Array.from(new Set(cases.map((item) => item.residentId))),
          } as Prisma.JsonValue,
          calculatedBy,
        });
      }),
    );

    this.logger.log('Indicadores RDC calculados com sucesso', {
      tenantId,
      year,
      month,
      denominator,
      populationReferenceDate,
    });
  }

  async getIndicatorsByMonth(
    tenantId: string,
    year: number,
    month: number,
  ): Promise<RdcIndicatorsByType> {
    const tenantClient = await this.getTenantClient(tenantId);

    let indicators = await tenantClient.incidentMonthlyIndicator.findMany({
      where: {
        tenantId,
        year,
        month,
      },
      orderBy: {
        indicatorType: 'asc',
      },
    });

    if (indicators.length === 0) {
      await this.calculateMonthlyIndicators(tenantId, year, month);
      indicators = await tenantClient.incidentMonthlyIndicator.findMany({
        where: {
          tenantId,
          year,
          month,
        },
        orderBy: {
          indicatorType: 'asc',
        },
      });
    }

    const result: RdcIndicatorsByType = {};
    for (const indicator of indicators) {
      result[indicator.indicatorType] = this.buildIndicatorResult(indicator);
    }

    return result;
  }

  async getIndicatorsHistory(
    tenantId: string,
    months: number = 12,
  ): Promise<RdcIndicatorHistoryMonth[]> {
    const tenantClient = await this.getTenantClient(tenantId);

    const indicators = await tenantClient.incidentMonthlyIndicator.findMany({
      where: { tenantId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: months * RDC_INDICATOR_ORDER.length,
    });

    const grouped: Record<string, RdcIndicatorHistoryMonth> = {};
    for (const indicator of indicators) {
      const key = `${indicator.year}-${String(indicator.month).padStart(2, '0')}`;
      if (!grouped[key]) {
        grouped[key] = {
          year: indicator.year,
          month: indicator.month,
          monthLabel: key,
          indicators: {},
        };
      }

      grouped[key].indicators[indicator.indicatorType] =
        this.buildIndicatorResult(indicator);
    }

    return Object.values(grouped);
  }

  private async getIndicatorOrThrow(
    tenantClient: TenantDbClient,
    tenantId: string,
    year: number,
    month: number,
    indicatorType: RdcIndicatorType,
  ) {
    let indicator = await tenantClient.incidentMonthlyIndicator.findUnique({
      where: {
        tenantId_year_month_indicatorType: {
          tenantId,
          year,
          month,
          indicatorType,
        },
      },
    });

    if (!indicator) {
      await this.calculateMonthlyIndicators(tenantId, year, month);
      indicator = await tenantClient.incidentMonthlyIndicator.findUnique({
        where: {
          tenantId_year_month_indicatorType: {
            tenantId,
            year,
            month,
            indicatorType,
          },
        },
      });
    }

    if (!indicator) {
      throw new NotFoundException(
        `Indicador ${indicatorType} não encontrado para ${month}/${year}`,
      );
    }

    return indicator;
  }

  async getIndicatorCasesForReview(
    tenantId: string,
    year: number,
    month: number,
    indicatorType: RdcIndicatorType,
  ) {
    const tenantClient = await this.getTenantClient(tenantId);
    const indicator = await this.getIndicatorOrThrow(
      tenantClient,
      tenantId,
      year,
      month,
      indicatorType,
    );

    const incidentIds = this.parseIncidentIds(indicator.incidentIds);
    const candidates = await this.getIndicatorCasesByIds(tenantClient, incidentIds);

    const updatedIndicator = await this.refreshIndicatorAggregates({
      tenantClient,
      indicator,
      candidateCases: candidates.map((candidate) => ({
        id: candidate.id,
        residentId: candidate.residentId,
      })),
    });

    const updatedIncidentIds = this.parseIncidentIds(updatedIndicator.incidentIds);
    const reviews = await tenantClient.incidentMonthlyIndicatorReview.findMany({
      where: {
        indicatorId: updatedIndicator.id,
        incidentId: { in: updatedIncidentIds },
      },
      select: {
        incidentId: true,
        decision: true,
        reason: true,
        decidedAt: true,
        decidedBy: true,
        decidedByName: true,
      },
    });

    const reviewByIncidentId = new Map(
      reviews.map((review) => [review.incidentId, review]),
    );

    const orderedCandidates = candidates
      .filter((candidate) => updatedIncidentIds.includes(candidate.id))
      .sort((left, right) => {
        if (left.date.getTime() !== right.date.getTime()) {
          return right.date.getTime() - left.date.getTime();
        }
        return right.time.localeCompare(left.time);
      });

    return {
      year,
      month,
      indicatorType,
      numerator: updatedIndicator.numerator,
      denominator: updatedIndicator.denominator,
      rate: updatedIndicator.rate,
      closure: {
        status:
          this.readIndicatorField<string>(updatedIndicator, 'periodStatus', 'OPEN') ===
          'CLOSED'
            ? 'CLOSED'
            : 'OPEN',
        closedAt:
          this.getIsoTimestamp(
            this.readIndicatorField<Date | null>(
              updatedIndicator,
              'periodClosedAt',
              null,
            ),
          ) || undefined,
        closedBy:
          this.readIndicatorField<string | null>(
            updatedIndicator,
            'periodClosedBy',
            null,
          ) || undefined,
        closedByName:
          this.readIndicatorField<string | null>(
            updatedIndicator,
            'periodClosedByName',
            null,
          ) || undefined,
        note:
          this.readIndicatorField<string | null>(
            updatedIndicator,
            'periodCloseNote',
            null,
          ) || undefined,
      },
      metadata: this.asObject(updatedIndicator.metadata),
      summary: {
        total: this.readIndicatorField<number>(
          updatedIndicator,
          'totalCandidates',
          updatedIncidentIds.length,
        ),
        pending: this.readIndicatorField<number>(updatedIndicator, 'pendingCount', 0),
        confirmed: this.readIndicatorField<number>(
          updatedIndicator,
          'confirmedCount',
          0,
        ),
        discarded: this.readIndicatorField<number>(
          updatedIndicator,
          'discardedCount',
          0,
        ),
      },
      candidates: orderedCandidates.map((candidate) => {
        const review = reviewByIncidentId.get(candidate.id);
        const normalizedDecision = this.normalizeReviewDecision(review?.decision || '');

        return {
          incidentId: candidate.id,
          residentId: candidate.residentId,
          residentName: candidate.resident?.fullName || 'Residente não informado',
          date: this.getDateOnlyString(candidate.date),
          time: candidate.time || '--:--',
          severity: candidate.incidentSeverity || 'MODERADA',
          description: this.extractDescription(candidate),
          reviewStatus: normalizedDecision || 'PENDING',
          reviewReason: review?.reason || null,
          reviewedAt: this.getIsoTimestamp(review?.decidedAt),
          reviewedBy: review?.decidedByName || review?.decidedBy || null,
        };
      }),
    };
  }

  async reviewIndicatorCases(params: {
    tenantId: string;
    year: number;
    month: number;
    indicatorType: RdcIndicatorType;
    decisions: Array<{ incidentId: string; decision: ReviewDecision; reason?: string }>;
    reviewedBy: string;
    reviewedByName: string;
  }) {
    const {
      tenantId,
      year,
      month,
      indicatorType,
      decisions,
      reviewedBy,
      reviewedByName,
    } = params;

    const tenantClient = await this.getTenantClient(tenantId);
    const indicator = await this.getIndicatorOrThrow(
      tenantClient,
      tenantId,
      year,
      month,
      indicatorType,
    );

    if (this.readIndicatorField<string>(indicator, 'periodStatus', 'OPEN') === 'CLOSED') {
      throw new BadRequestException(
        'O mês está fechado. Reabra o período antes de alterar a revisão.',
      );
    }

    const candidateIncidentIds = this.parseIncidentIds(indicator.incidentIds);
    const candidateSet = new Set(candidateIncidentIds);
    const invalidIds = decisions
      .map((item) => item.incidentId)
      .filter((incidentId) => !candidateSet.has(incidentId));

    if (invalidIds.length > 0) {
      throw new BadRequestException(
        'Há decisões para incidentes que não pertencem aos candidatos do indicador.',
      );
    }

    const discardedWithoutReason = decisions.some(
      (item) =>
        item.decision === 'DISCARDED' &&
        (!item.reason || item.reason.trim().length < 5),
    );
    if (discardedWithoutReason) {
      throw new BadRequestException(
        'Descarte exige motivo com no mínimo 5 caracteres.',
      );
    }

    await tenantClient.$transaction(async (tx) => {
      const decisionTimestamp = new Date();
      const reviewDelegate = tx.incidentMonthlyIndicatorReview;

      for (const item of decisions) {
        if (item.decision === 'PENDING') {
          await reviewDelegate.deleteMany({
            where: {
              indicatorId: indicator.id,
              incidentId: item.incidentId,
            },
          });
          continue;
        }

        await reviewDelegate.upsert({
          where: {
            indicatorId_incidentId: {
              indicatorId: indicator.id,
              incidentId: item.incidentId,
            },
          },
          create: {
            tenantId,
            indicatorId: indicator.id,
            incidentId: item.incidentId,
            decision: item.decision,
            reason: item.reason?.trim() || null,
            decidedAt: decisionTimestamp,
            decidedBy: reviewedBy,
            decidedByName: reviewedByName,
          },
          update: {
            decision: item.decision,
            reason: item.reason?.trim() || null,
            decidedAt: decisionTimestamp,
            decidedBy: reviewedBy,
            decidedByName: reviewedByName,
          },
        });
      }

      const candidateCases = await this.getIndicatorCasesByIds(tx, candidateIncidentIds);
      const currentIndicator = await tx.incidentMonthlyIndicator.findUniqueOrThrow({
        where: { id: indicator.id },
      });

      await this.refreshIndicatorAggregates({
        tenantClient: tx,
        indicator: currentIndicator,
        candidateCases: candidateCases.map((candidate) => ({
          id: candidate.id,
          residentId: candidate.residentId,
        })),
      });
    });

    return this.getIndicatorCasesForReview(tenantId, year, month, indicatorType);
  }

  async createManualIndicatorCase(params: {
    tenantId: string;
    year: number;
    month: number;
    indicatorType: RdcIndicatorType;
    residentId: string;
    date: string;
    time: string;
    severity: IncidentSeverity;
    description: string;
    actionTaken: string;
    note?: string;
    createdBy: string;
    createdByName: string;
  }) {
    const {
      tenantId,
      year,
      month,
      indicatorType,
      residentId,
      date,
      time,
      severity,
      description,
      actionTaken,
      note,
      createdBy,
      createdByName,
    } = params;

    const subtype = this.getClinicalSubtypeForIndicator(indicatorType);
    if (!subtype) {
      throw new BadRequestException('Indicador informado não permite inclusão manual.');
    }

    const normalizedDate = this.assertDateWithinMonth(date, year, month);
    const normalizedDescription = description.trim();
    const normalizedActionTaken = actionTaken.trim();
    const normalizedNote = note?.trim() || null;

    if (normalizedDescription.length < 5) {
      throw new BadRequestException(
        'Descrição do caso deve ter no mínimo 5 caracteres.',
      );
    }
    if (normalizedActionTaken.length < 5) {
      throw new BadRequestException(
        'Ação tomada deve ter no mínimo 5 caracteres.',
      );
    }

    const tenantClient = await this.getTenantClient(tenantId);

    const closedIndicator = await tenantClient.incidentMonthlyIndicator.findFirst({
      where: {
        tenantId,
        year,
        month,
        periodStatus: 'CLOSED',
      },
      select: { id: true },
    });
    if (closedIndicator) {
      throw new BadRequestException(
        'O mês está fechado. Reabra o período antes de incluir caso manual.',
      );
    }

    const resident = await tenantClient.resident.findFirst({
      where: {
        id: residentId,
        deletedAt: null,
      },
      select: {
        id: true,
        fullName: true,
      },
    });
    if (!resident) {
      throw new NotFoundException('Residente não encontrado.');
    }

    const record = await tenantClient.dailyRecord.create({
      data: {
        tenantId,
        residentId,
        userId: createdBy,
        type: 'INTERCORRENCIA' as RecordType,
        date: this.toDateOnlyPrismaValue(normalizedDate),
        time,
        recordedBy: createdByName,
        notes: normalizedNote,
        incidentCategory: IncidentCategory.CLINICA,
        incidentSubtypeClinical: subtype,
        incidentSeverity: severity,
        rdcIndicators: [indicatorType] as Prisma.InputJsonValue,
        data: {
          descricao: normalizedDescription,
          acaoTomada: normalizedActionTaken,
          origem: 'RDC_MANUAL_CASE',
        } as Prisma.InputJsonValue,
      },
      select: {
        id: true,
      },
    });

    await this.calculateMonthlyIndicators(tenantId, year, month, createdBy);

    const indicator = await this.getIndicatorOrThrow(
      tenantClient,
      tenantId,
      year,
      month,
      indicatorType,
    );
    const candidateIncidentIds = this.parseIncidentIds(indicator.incidentIds);

    if (!candidateIncidentIds.includes(record.id)) {
      throw new BadRequestException(
        'O caso manual não foi incluído como candidato do indicador. Verifique data e tipo do caso.',
      );
    }

    const decisionTimestamp = new Date();
    await tenantClient.incidentMonthlyIndicatorReview.upsert({
      where: {
        indicatorId_incidentId: {
          indicatorId: indicator.id,
          incidentId: record.id,
        },
      },
      create: {
        tenantId,
        indicatorId: indicator.id,
        incidentId: record.id,
        decision: 'CONFIRMED',
        reason: 'Caso manual confirmado diretamente no módulo RDC.',
        decidedAt: decisionTimestamp,
        decidedBy: createdBy,
        decidedByName: createdByName,
      },
      update: {
        decision: 'CONFIRMED',
        reason: 'Caso manual confirmado diretamente no módulo RDC.',
        decidedAt: decisionTimestamp,
        decidedBy: createdBy,
        decidedByName: createdByName,
      },
    });

    const candidateCases = await this.getIndicatorCasesByIds(
      tenantClient,
      candidateIncidentIds,
    );
    const refreshedIndicator = await this.refreshIndicatorAggregates({
      tenantClient,
      indicator,
      candidateCases: candidateCases.map((candidate) => ({
        id: candidate.id,
        residentId: candidate.residentId,
      })),
    });

    this.logger.log('Caso manual RDC registrado e confirmado', {
      tenantId,
      year,
      month,
      indicatorType,
      residentId,
      residentName: resident.fullName,
      recordId: record.id,
      date: normalizedDate,
      time,
      severity,
      createdBy,
    });

    return {
      success: true,
      recordId: record.id,
      indicatorType,
      residentId,
      residentName: resident.fullName,
      date: normalizedDate,
      time,
      severity,
      indicator: this.buildIndicatorResult(refreshedIndicator),
    };
  }

  async closeMonth(params: {
    tenantId: string;
    year: number;
    month: number;
    note?: string;
    closedBy: string;
    closedByName: string;
  }) {
    const { tenantId, year, month, note, closedBy, closedByName } = params;
    const tenantClient = await this.getTenantClient(tenantId);

    const indicators = await tenantClient.incidentMonthlyIndicator.findMany({
      where: {
        tenantId,
        year,
        month,
      },
    });

    if (indicators.length === 0) {
      throw new BadRequestException(
        'Não há indicadores calculados para o período selecionado.',
      );
    }

    const indicatorsWithPending = indicators.filter((item) => item.pendingCount > 0);
    if (indicatorsWithPending.length > 0) {
      throw new BadRequestException(
        `Ainda há ${indicatorsWithPending.length} indicador(es) com casos pendentes.`,
      );
    }

    const closedAt = new Date();
    await tenantClient.incidentMonthlyIndicator.updateMany({
      where: {
        tenantId,
        year,
        month,
      },
      data: {
        periodStatus: 'CLOSED',
        periodClosedAt: closedAt,
        periodClosedBy: closedBy,
        periodClosedByName: closedByName,
        periodCloseNote: note?.trim() || null,
      },
    });

    return {
      year,
      month,
      status: 'CLOSED',
      closedAt: closedAt.toISOString(),
      closedBy,
      closedByName,
      note: note?.trim() || null,
      indicatorsClosed: indicators.length,
    };
  }

  async reopenMonth(params: {
    tenantId: string;
    year: number;
    month: number;
    reason: string;
    reopenedBy: string;
    reopenedByName: string;
  }) {
    const { tenantId, year, month, reason, reopenedBy, reopenedByName } = params;
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 5) {
      throw new BadRequestException(
        'Informe o motivo da reabertura com no mínimo 5 caracteres.',
      );
    }

    const tenantClient = await this.getTenantClient(tenantId);
    const indicators = await tenantClient.incidentMonthlyIndicator.findMany({
      where: {
        tenantId,
        year,
        month,
      },
    });

    if (indicators.length === 0) {
      throw new BadRequestException(
        'Não há indicadores calculados para o período selecionado.',
      );
    }

    const closedCount = indicators.filter(
      (item) => this.readIndicatorField<string>(item, 'periodStatus', 'OPEN') === 'CLOSED',
    ).length;

    if (closedCount === 0) {
      throw new BadRequestException('O mês selecionado já está aberto.');
    }

    const reopenedAt = new Date();
    await tenantClient.incidentMonthlyIndicator.updateMany({
      where: {
        tenantId,
        year,
        month,
      },
      data: {
        periodStatus: 'OPEN',
        periodClosedAt: null,
        periodClosedBy: null,
        periodClosedByName: null,
        periodCloseNote: null,
      },
    });

    this.logger.warn('Período mensal RDC reaberto', {
      tenantId,
      year,
      month,
      reopenedAt: reopenedAt.toISOString(),
      reopenedBy,
      reopenedByName,
      reason: normalizedReason,
    });

    return {
      year,
      month,
      status: 'OPEN',
      reopenedAt: reopenedAt.toISOString(),
      reopenedBy,
      reopenedByName,
      reason: normalizedReason,
      indicatorsReopened: closedCount,
    };
  }

  async getAnnualConsolidated(tenantId: string, year?: number) {
    const referenceYear =
      typeof year === 'number' && year >= 2020 ? year : new Date().getFullYear() - 1;
    const tenantClient = await this.getTenantClient(tenantId);

    const indicators = await tenantClient.incidentMonthlyIndicator.findMany({
      where: {
        tenantId,
        year: referenceYear,
      },
      orderBy: [{ month: 'asc' }, { indicatorType: 'asc' }],
    });

    const groupedByMonth = new Map<number, IncidentMonthlyIndicator[]>();
    for (const indicator of indicators) {
      const monthIndicators = groupedByMonth.get(indicator.month) || [];
      monthIndicators.push(indicator);
      groupedByMonth.set(indicator.month, monthIndicators);
    }

    const months = Array.from({ length: 12 }, (_, index) => index + 1).map((month) => {
      const monthIndicators = groupedByMonth.get(month) || [];

      const indicatorsByType = RDC_INDICATOR_ORDER.map((indicatorType) => {
        const indicator = monthIndicators.find(
          (item) => item.indicatorType === indicatorType,
        );

        if (!indicator) {
          return {
            indicatorType,
            numerator: 0,
            denominator: 0,
            rate: 0,
            status: 'MISSING' as const,
            closed: false,
            closedAt: null,
            closedByName: null,
          };
        }

        const closed =
          this.readIndicatorField<string>(indicator, 'periodStatus', 'OPEN') ===
          'CLOSED';
        return {
          indicatorType,
          numerator: indicator.numerator,
          denominator: indicator.denominator,
          rate: indicator.rate,
          status: closed ? ('CLOSED' as const) : ('OPEN' as const),
          closed,
          closedAt: this.getIsoTimestamp(
            this.readIndicatorField<Date | null>(indicator, 'periodClosedAt', null),
          ),
          closedByName: this.readIndicatorField<string | null>(
            indicator,
            'periodClosedByName',
            null,
          ),
        };
      });

      let monthStatus: 'MISSING' | 'OPEN' | 'CLOSED' = 'OPEN';
      if (monthIndicators.length === 0) {
        monthStatus = 'MISSING';
      } else if (indicatorsByType.every((item) => item.status === 'CLOSED')) {
        monthStatus = 'CLOSED';
      }

      return {
        month,
        monthLabel: `${String(month).padStart(2, '0')}/${referenceYear}`,
        status: monthStatus,
        indicators: indicatorsByType,
      };
    });

    const closedMonths = months.filter((item) => item.status === 'CLOSED').length;
    const openMonths = months.filter((item) => item.status === 'OPEN').length;
    const missingMonths = months.filter((item) => item.status === 'MISSING').length;

    return {
      year: referenceYear,
      generatedAt: new Date().toISOString(),
      summary: {
        totalMonths: 12,
        closedMonths,
        openMonths,
        missingMonths,
        readyToSubmit: closedMonths === 12,
      },
      months,
    };
  }
}
