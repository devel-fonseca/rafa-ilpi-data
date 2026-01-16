import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  RdcIndicatorType,
  IncidentSubtypeClinical,
  PrismaClient,
  Prisma,
} from '@prisma/client';
import { startOfMonth, endOfMonth } from 'date-fns';
import {
  RdcIndicatorsByType,
  RdcIndicatorHistoryMonth,
} from './interfaces/rdc-indicator-result.interface';

/**
 * Serviço responsável por calcular os 6 indicadores mensais obrigatórios
 * conforme RDC 502/2021 da ANVISA.
 *
 * INDICADORES OBRIGATÓRIOS (Art. 58-59 + Anexo):
 * 1. Taxa de mortalidade
 * 2. Taxa de incidência de doença diarréica aguda
 * 3. Taxa de incidência de escabiose
 * 4. Taxa de incidência de desidratação
 * 5. Taxa de prevalência de úlcera de decúbito
 * 6. Taxa de prevalência de desnutrição
 *
 * FÓRMULAS:
 * - Taxa de incidência = (casos novos / residentes no mês) × 100
 * - Taxa de prevalência = (casos existentes / residentes no mês) × 100
 * - Taxa de mortalidade = (óbitos / residentes no mês) × 100
 */
@Injectable()
export class RdcIndicatorsService {
  private readonly logger = new Logger(RdcIndicatorsService.name);

  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema) e getTenantClient()
  ) {}

  /**
   * Obtém o client específico do tenant usando getTenantClient
   * Usado em contextos sem REQUEST scope (CRON jobs)
   */
  private async getTenantClient(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { schemaName: true },
    });

    if (!tenant) {
      throw new Error(`Tenant ${tenantId} não encontrado`);
    }

    return this.prisma.getTenantClient(tenant.schemaName);
  }

  /**
   * Calcula todos os 6 indicadores RDC para um tenant em um mês específico
   */
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

    // Obter tenant client para acessar schema isolado
    const tenantClient = await this.getTenantClient(tenantId);

    const firstDay = startOfMonth(new Date(year, month - 1, 1));
    const lastDay = endOfMonth(firstDay);

    // Obter residentes ativos no mês (média mensal)
    const activeResidents = await this.getActiveResidentsInPeriod(
      tenantClient,
      firstDay,
      lastDay,
    );
    const denominator = activeResidents.length;

    if (denominator === 0) {
      this.logger.warn('Nenhum residente ativo no período', {
        tenantId,
        year,
        month,
      });
      return;
    }

    this.logger.debug(`Residentes ativos no período: ${denominator}`);

    // Calcular todos os 6 indicadores em paralelo
    await Promise.all([
      this.calculateMortalidade(
        tenantClient,
        tenantId,
        year,
        month,
        firstDay,
        lastDay,
        denominator,
        calculatedBy,
      ),
      this.calculateDiarreiaAguda(
        tenantClient,
        tenantId,
        year,
        month,
        firstDay,
        lastDay,
        denominator,
        calculatedBy,
      ),
      this.calculateEscabiose(
        tenantClient,
        tenantId,
        year,
        month,
        firstDay,
        lastDay,
        denominator,
        calculatedBy,
      ),
      this.calculateDesidratacao(
        tenantClient,
        tenantId,
        year,
        month,
        firstDay,
        lastDay,
        denominator,
        calculatedBy,
      ),
      this.calculateUlceraDecubito(
        tenantClient,
        tenantId,
        year,
        month,
        firstDay,
        lastDay,
        denominator,
        calculatedBy,
      ),
      this.calculateDesnutricao(
        tenantClient,
        tenantId,
        year,
        month,
        firstDay,
        lastDay,
        denominator,
        calculatedBy,
      ),
    ]);

    this.logger.log('Indicadores RDC calculados com sucesso', {
      tenantId,
      year,
      month,
    });
  }

  /**
   * Indicador 1: Taxa de Mortalidade
   * Fórmula: (óbitos no mês / residentes no mês) × 100
   */
  private async calculateMortalidade(
    tenantClient: PrismaClient,
    tenantId: string,
    year: number,
    month: number,
    firstDay: Date,
    lastDay: Date,
    denominator: number,
    calculatedBy?: string,
  ): Promise<void> {
    const obitos = await tenantClient.dailyRecord.findMany({
      where: {
        type: 'INTERCORRENCIA',
        incidentSubtypeClinical: IncidentSubtypeClinical.OBITO,
        date: { gte: firstDay, lte: lastDay },
        deletedAt: null,
      },
      select: { id: true, residentId: true, date: true },
    });

    const numerator = obitos.length;
    const rate = (numerator / denominator) * 100;

    await this.upsertIndicator({
      tenantClient,
      tenantId,
      year,
      month,
      indicatorType: RdcIndicatorType.MORTALIDADE,
      numerator,
      denominator,
      rate,
      incidentIds: obitos.map((o) => o.id),
      metadata: {
        residents: obitos.map((o) => ({
          residentId: o.residentId,
          date: o.date.toISOString(),
        })),
      } as Prisma.JsonValue,
      calculatedBy,
    });

    this.logger.debug(`Mortalidade: ${numerator}/${denominator} = ${rate.toFixed(2)}%`);
  }

  /**
   * Indicador 2: Taxa de Incidência de Doença Diarréica Aguda
   * Fórmula: (casos de diarreia / residentes no mês) × 100
   */
  private async calculateDiarreiaAguda(
    tenantClient: PrismaClient,
    tenantId: string,
    year: number,
    month: number,
    firstDay: Date,
    lastDay: Date,
    denominator: number,
    calculatedBy?: string,
  ): Promise<void> {
    const casos = await tenantClient.dailyRecord.findMany({
      where: {
        type: 'INTERCORRENCIA',
        incidentSubtypeClinical: IncidentSubtypeClinical.DOENCA_DIARREICA_AGUDA,
        date: { gte: firstDay, lte: lastDay },
        deletedAt: null,
      },
      select: { id: true, residentId: true, date: true },
    });

    // Contar residentes únicos (um residente pode ter múltiplos episódios)
    const residentesUnicos = new Set(casos.map((c) => c.residentId));
    const numerator = residentesUnicos.size;
    const rate = (numerator / denominator) * 100;

    await this.upsertIndicator({
      tenantClient,
      tenantId,
      year,
      month,
      indicatorType: RdcIndicatorType.DIARREIA_AGUDA,
      numerator,
      denominator,
      rate,
      incidentIds: casos.map((c) => c.id),
      metadata: {
        totalEpisodes: casos.length,
        uniqueResidents: Array.from(residentesUnicos),
      },
      calculatedBy,
    });

    this.logger.debug(`Diarreia Aguda: ${numerator}/${denominator} = ${rate.toFixed(2)}%`);
  }

  /**
   * Indicador 3: Taxa de Incidência de Escabiose
   * Fórmula: (casos de escabiose / residentes no mês) × 100
   */
  private async calculateEscabiose(
    tenantClient: PrismaClient,
    tenantId: string,
    year: number,
    month: number,
    firstDay: Date,
    lastDay: Date,
    denominator: number,
    calculatedBy?: string,
  ): Promise<void> {
    const casos = await tenantClient.dailyRecord.findMany({
      where: {
        type: 'INTERCORRENCIA',
        incidentSubtypeClinical: IncidentSubtypeClinical.ESCABIOSE,
        date: { gte: firstDay, lte: lastDay },
        deletedAt: null,
      },
      select: { id: true, residentId: true, date: true },
    });

    const residentesUnicos = new Set(casos.map((c) => c.residentId));
    const numerator = residentesUnicos.size;
    const rate = (numerator / denominator) * 100;

    await this.upsertIndicator({
      tenantClient,
      tenantId,
      year,
      month,
      indicatorType: RdcIndicatorType.ESCABIOSE,
      numerator,
      denominator,
      rate,
      incidentIds: casos.map((c) => c.id),
      metadata: {
        totalEpisodes: casos.length,
        uniqueResidents: Array.from(residentesUnicos),
      },
      calculatedBy,
    });

    this.logger.debug(`Escabiose: ${numerator}/${denominator} = ${rate.toFixed(2)}%`);
  }

  /**
   * Indicador 4: Taxa de Incidência de Desidratação
   * Fórmula: (casos de desidratação / residentes no mês) × 100
   */
  private async calculateDesidratacao(
    tenantClient: PrismaClient,
    tenantId: string,
    year: number,
    month: number,
    firstDay: Date,
    lastDay: Date,
    denominator: number,
    calculatedBy?: string,
  ): Promise<void> {
    const casos = await tenantClient.dailyRecord.findMany({
      where: {
        type: 'INTERCORRENCIA',
        incidentSubtypeClinical: IncidentSubtypeClinical.DESIDRATACAO,
        date: { gte: firstDay, lte: lastDay },
        deletedAt: null,
      },
      select: { id: true, residentId: true, date: true },
    });

    const residentesUnicos = new Set(casos.map((c) => c.residentId));
    const numerator = residentesUnicos.size;
    const rate = (numerator / denominator) * 100;

    await this.upsertIndicator({
      tenantClient,
      tenantId,
      year,
      month,
      indicatorType: RdcIndicatorType.DESIDRATACAO,
      numerator,
      denominator,
      rate,
      incidentIds: casos.map((c) => c.id),
      metadata: {
        totalEpisodes: casos.length,
        uniqueResidents: Array.from(residentesUnicos),
      },
      calculatedBy,
    });

    this.logger.debug(`Desidratação: ${numerator}/${denominator} = ${rate.toFixed(2)}%`);
  }

  /**
   * Indicador 5: Taxa de Prevalência de Úlcera de Decúbito
   * Fórmula: (residentes com úlcera / residentes no mês) × 100
   */
  private async calculateUlceraDecubito(
    tenantClient: PrismaClient,
    tenantId: string,
    year: number,
    month: number,
    firstDay: Date,
    lastDay: Date,
    denominator: number,
    calculatedBy?: string,
  ): Promise<void> {
    const casos = await tenantClient.dailyRecord.findMany({
      where: {
        type: 'INTERCORRENCIA',
        incidentSubtypeClinical: IncidentSubtypeClinical.ULCERA_DECUBITO,
        date: { gte: firstDay, lte: lastDay },
        deletedAt: null,
      },
      select: { id: true, residentId: true, date: true },
    });

    const residentesUnicos = new Set(casos.map((c) => c.residentId));
    const numerator = residentesUnicos.size;
    const rate = (numerator / denominator) * 100;

    await this.upsertIndicator({
      tenantClient,
      tenantId,
      year,
      month,
      indicatorType: RdcIndicatorType.ULCERA_DECUBITO,
      numerator,
      denominator,
      rate,
      incidentIds: casos.map((c) => c.id),
      metadata: {
        totalEpisodes: casos.length,
        uniqueResidents: Array.from(residentesUnicos),
      },
      calculatedBy,
    });

    this.logger.debug(`Úlcera Decúbito: ${numerator}/${denominator} = ${rate.toFixed(2)}%`);
  }

  /**
   * Indicador 6: Taxa de Prevalência de Desnutrição
   * Fórmula: (residentes com desnutrição / residentes no mês) × 100
   */
  private async calculateDesnutricao(
    tenantClient: PrismaClient,
    tenantId: string,
    year: number,
    month: number,
    firstDay: Date,
    lastDay: Date,
    denominator: number,
    calculatedBy?: string,
  ): Promise<void> {
    const casos = await tenantClient.dailyRecord.findMany({
      where: {
        type: 'INTERCORRENCIA',
        incidentSubtypeClinical: IncidentSubtypeClinical.DESNUTRICAO,
        date: { gte: firstDay, lte: lastDay },
        deletedAt: null,
      },
      select: { id: true, residentId: true, date: true },
    });

    const residentesUnicos = new Set(casos.map((c) => c.residentId));
    const numerator = residentesUnicos.size;
    const rate = (numerator / denominator) * 100;

    await this.upsertIndicator({
      tenantClient,
      tenantId,
      year,
      month,
      indicatorType: RdcIndicatorType.DESNUTRICAO,
      numerator,
      denominator,
      rate,
      incidentIds: casos.map((c) => c.id),
      metadata: {
        totalEpisodes: casos.length,
        uniqueResidents: Array.from(residentesUnicos),
      },
      calculatedBy,
    });

    this.logger.debug(`Desnutrição: ${numerator}/${denominator} = ${rate.toFixed(2)}%`);
  }

  /**
   * Obtém residentes ativos no período (admitidos antes do fim do mês e não saíram antes do início)
   */
  private async getActiveResidentsInPeriod(
    tenantClient: PrismaClient,
    firstDay: Date,
    lastDay: Date,
  ): Promise<{ id: string }[]> {
    return tenantClient.resident.findMany({
      where: {
        admissionDate: { lte: lastDay },
        OR: [
          { dischargeDate: null }, // Ainda está na ILPI
          { dischargeDate: { gte: firstDay } }, // Saiu durante ou depois do período
        ],
        deletedAt: null,
      },
      select: { id: true },
    });
  }

  /**
   * Cria ou atualiza um indicador mensal
   */
  private async upsertIndicator(params: {
    tenantClient: PrismaClient;
    tenantId: string;
    year: number;
    month: number;
    indicatorType: RdcIndicatorType;
    numerator: number;
    denominator: number;
    rate: number;
    incidentIds: string[];
    metadata?: Prisma.JsonValue;
    calculatedBy?: string;
  }): Promise<void> {
    const {
      tenantClient,
      tenantId,
      year,
      month,
      indicatorType,
      numerator,
      denominator,
      rate,
      incidentIds,
      metadata,
      calculatedBy,
    } = params;

    await tenantClient.incidentMonthlyIndicator.upsert({
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
        numerator,
        denominator,
        rate,
        incidentIds,
        metadata: metadata ?? Prisma.JsonNull,
        calculatedBy,
      },
      update: {
        numerator,
        denominator,
        rate,
        incidentIds,
        metadata: metadata ?? Prisma.JsonNull,
        calculatedAt: new Date(),
        calculatedBy,
      },
    });
  }

  /**
   * Obtém indicadores de um mês específico
   */
  async getIndicatorsByMonth(
    tenantId: string,
    year: number,
    month: number,
  ): Promise<RdcIndicatorsByType> {
    // Obter tenant client para acessar schema isolado
    const tenantClient = await this.getTenantClient(tenantId);

    const indicators = await tenantClient.incidentMonthlyIndicator.findMany({
      where: {
        year,
        month,
      },
      orderBy: {
        indicatorType: 'asc',
      },
    });

    // Transformar array em objeto por tipo de indicador
    const result: RdcIndicatorsByType = {};
    for (const indicator of indicators) {
      result[indicator.indicatorType] = {
        numerator: indicator.numerator,
        denominator: indicator.denominator,
        rate: indicator.rate,
        incidentIds: indicator.incidentIds as string[],
        metadata: indicator.metadata,
        calculatedAt: indicator.calculatedAt,
      };
    }

    return result;
  }

  /**
   * Obtém histórico de indicadores (últimos N meses)
   */
  async getIndicatorsHistory(
    tenantId: string,
    months: number = 12,
  ): Promise<RdcIndicatorHistoryMonth[]> {
    // Obter tenant client para acessar schema isolado
    const tenantClient = await this.getTenantClient(tenantId);

    const indicators = await tenantClient.incidentMonthlyIndicator.findMany({
      where: {},
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: months * 6, // 6 indicadores por mês
    });

    // Agrupar por ano/mês
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
      grouped[key].indicators[indicator.indicatorType] = {
        numerator: indicator.numerator,
        denominator: indicator.denominator,
        rate: indicator.rate,
        incidentIds: indicator.incidentIds as string[],
        metadata: indicator.metadata,
        calculatedAt: indicator.calculatedAt,
      };
    }

    return Object.values(grouped);
  }
}
