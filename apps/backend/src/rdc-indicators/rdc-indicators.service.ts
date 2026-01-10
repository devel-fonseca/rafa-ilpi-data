import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  RdcIndicatorType,
  IncidentSubtypeClinical,
} from '@prisma/client';
import { startOfMonth, endOfMonth } from 'date-fns';

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

  constructor(private readonly prisma: PrismaService) {}

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

    const firstDay = startOfMonth(new Date(year, month - 1, 1));
    const lastDay = endOfMonth(firstDay);

    // Obter residentes ativos no mês (média mensal)
    const activeResidents = await this.getActiveResidentsInPeriod(
      tenantId,
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
        tenantId,
        year,
        month,
        firstDay,
        lastDay,
        denominator,
        calculatedBy,
      ),
      this.calculateDiarreiaAguda(
        tenantId,
        year,
        month,
        firstDay,
        lastDay,
        denominator,
        calculatedBy,
      ),
      this.calculateEscabiose(
        tenantId,
        year,
        month,
        firstDay,
        lastDay,
        denominator,
        calculatedBy,
      ),
      this.calculateDesidratacao(
        tenantId,
        year,
        month,
        firstDay,
        lastDay,
        denominator,
        calculatedBy,
      ),
      this.calculateUlceraDecubito(
        tenantId,
        year,
        month,
        firstDay,
        lastDay,
        denominator,
        calculatedBy,
      ),
      this.calculateDesnutricao(
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
    tenantId: string,
    year: number,
    month: number,
    firstDay: Date,
    lastDay: Date,
    denominator: number,
    calculatedBy?: string,
  ): Promise<void> {
    const obitos = await this.prisma.dailyRecord.findMany({
      where: {
        tenantId,
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
          date: o.date,
        })),
      },
      calculatedBy,
    });

    this.logger.debug(`Mortalidade: ${numerator}/${denominator} = ${rate.toFixed(2)}%`);
  }

  /**
   * Indicador 2: Taxa de Incidência de Doença Diarréica Aguda
   * Fórmula: (casos de diarreia / residentes no mês) × 100
   */
  private async calculateDiarreiaAguda(
    tenantId: string,
    year: number,
    month: number,
    firstDay: Date,
    lastDay: Date,
    denominator: number,
    calculatedBy?: string,
  ): Promise<void> {
    const casos = await this.prisma.dailyRecord.findMany({
      where: {
        tenantId,
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
    tenantId: string,
    year: number,
    month: number,
    firstDay: Date,
    lastDay: Date,
    denominator: number,
    calculatedBy?: string,
  ): Promise<void> {
    const casos = await this.prisma.dailyRecord.findMany({
      where: {
        tenantId,
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
    tenantId: string,
    year: number,
    month: number,
    firstDay: Date,
    lastDay: Date,
    denominator: number,
    calculatedBy?: string,
  ): Promise<void> {
    const casos = await this.prisma.dailyRecord.findMany({
      where: {
        tenantId,
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
    tenantId: string,
    year: number,
    month: number,
    firstDay: Date,
    lastDay: Date,
    denominator: number,
    calculatedBy?: string,
  ): Promise<void> {
    const casos = await this.prisma.dailyRecord.findMany({
      where: {
        tenantId,
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
    tenantId: string,
    year: number,
    month: number,
    firstDay: Date,
    lastDay: Date,
    denominator: number,
    calculatedBy?: string,
  ): Promise<void> {
    const casos = await this.prisma.dailyRecord.findMany({
      where: {
        tenantId,
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
    tenantId: string,
    firstDay: Date,
    lastDay: Date,
  ): Promise<{ id: string }[]> {
    return this.prisma.resident.findMany({
      where: {
        tenantId,
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
    tenantId: string;
    year: number;
    month: number;
    indicatorType: RdcIndicatorType;
    numerator: number;
    denominator: number;
    rate: number;
    incidentIds: string[];
    metadata?: any;
    calculatedBy?: string;
  }): Promise<void> {
    const {
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

    await this.prisma.incidentMonthlyIndicator.upsert({
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
        metadata,
        calculatedBy,
      },
      update: {
        numerator,
        denominator,
        rate,
        incidentIds,
        metadata,
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
  ): Promise<any> {
    const indicators = await this.prisma.incidentMonthlyIndicator.findMany({
      where: {
        tenantId,
        year,
        month,
      },
      orderBy: {
        indicatorType: 'asc',
      },
    });

    // Transformar array em objeto por tipo de indicador
    const result: any = {};
    for (const indicator of indicators) {
      result[indicator.indicatorType] = {
        numerator: indicator.numerator,
        denominator: indicator.denominator,
        rate: indicator.rate,
        incidentIds: indicator.incidentIds,
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
  ): Promise<any[]> {
    const indicators = await this.prisma.incidentMonthlyIndicator.findMany({
      where: {
        tenantId,
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: months * 6, // 6 indicadores por mês
    });

    // Agrupar por ano/mês
    const grouped: any = {};
    for (const indicator of indicators) {
      const key = `${indicator.year}-${String(indicator.month).padStart(2, '0')}`;
      if (!grouped[key]) {
        grouped[key] = {
          year: indicator.year,
          month: indicator.month,
          indicators: {},
        };
      }
      grouped[key].indicators[indicator.indicatorType] = {
        numerator: indicator.numerator,
        denominator: indicator.denominator,
        rate: indicator.rate,
        calculatedAt: indicator.calculatedAt,
      };
    }

    return Object.values(grouped);
  }
}
