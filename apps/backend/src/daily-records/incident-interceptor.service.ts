import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  DailyRecord,
  IncidentCategory,
  IncidentSubtypeClinical,
  IncidentSubtypeAssistencial,
  IncidentSeverity,
  RdcIndicatorType,
  NotificationCategory,
  NotificationSeverity,
  SystemNotificationType,
} from '@prisma/client';
import { subDays } from 'date-fns';
import { formatIncidentSubtype } from './utils/incident-formatters';
import { DEFAULT_TIMEZONE, formatDateOnly, localToUTC } from '../utils/date.helpers';

interface TenantClientForIncidentWindowCheck {
  dailyRecord: {
    findMany: (args: unknown) => Promise<
      Array<{
        id: string;
        date: Date;
        time: string;
      }>
    >;
  };
}

/**
 * Serviço responsável por detectar automaticamente intercorrências
 * com base em registros diários e criar intercorrências quando necessário.
 *
 * Implementa as regras da RDC 502/2021 da ANVISA para detecção de
 * Eventos Sentinela e Indicadores obrigatórios.
 *
 * CONTEXTO ESPECIAL: Este serviço opera FORA do request scope normal.
 * Usa getTenantClient() para acessar schemas isolados, similar ao RdcIndicatorsService.
 */
@Injectable()
export class IncidentInterceptorService {
  private readonly logger = new Logger(IncidentInterceptorService.name);

  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED e obter tenant client
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Obtém o client específico do tenant usando getTenantClient
   * Necessário porque este serviço opera fora do REQUEST scope
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
   * Analisa um registro diário e cria intercorrências automaticamente
   * quando padrões específicos são detectados.
   */
  async analyzeAndCreateIncidents(
    record: DailyRecord,
    userId: string,
  ): Promise<void> {
    this.logger.debug(
      `Analisando registro ${record.type} para detecção de intercorrências`,
      {
        recordId: record.id,
        type: record.type,
        residentId: record.residentId,
      },
    );

    try {
      switch (record.type) {
        case 'ELIMINACAO':
          await this.checkEliminacao(record, userId);
          break;
        case 'MONITORAMENTO':
          await this.checkMonitoramento(record, userId);
          break;
        case 'ALIMENTACAO':
          await this.checkAlimentacao(record, userId);
          break;
        case 'COMPORTAMENTO':
          await this.checkComportamento(record, userId);
          break;
        case 'HIGIENE':
          await this.checkHigiene(record, userId);
          break;
        // Outros tipos podem ser adicionados conforme necessário
        default:
          this.logger.debug(
            `Tipo ${record.type} não possui regras de detecção automática`,
          );
      }
    } catch (error) {
      this.logger.error('Erro ao analisar registro para intercorrências', {
        error: error.message,
        stack: error.stack,
        recordId: record.id,
      });
      // Não propagar o erro para não falhar a criação do registro original
    }
  }

  /**
   * Verifica registros de MONITORAMENTO.
   *
   * Regra atual: NÃO cria intercorrência automática.
   * A detecção de anormalidade gera alerta médico persistente no módulo de Sinais Vitais,
   * e o Admin/RT decide se confirma ou descarta a intercorrência.
   */
  private async checkMonitoramento(
    record: DailyRecord,
    _userId: string,
  ): Promise<void> {
    // REGRA DE NEGÓCIO:
    // Monitoramento vital anormal NÃO deve gerar intercorrência automática.
    // O alerta médico persistente é criado no VitalSignsService, e o Admin/RT
    // decide posteriormente se confirma ou descarta a intercorrência.
    this.logger.debug(
      'MONITORAMENTO anormal processado sem criação automática de intercorrência',
      {
        recordId: record.id,
        residentId: record.residentId,
      },
    );
  }

  /**
   * Verifica registros de ELIMINACAO para detectar:
   * - Diarreia (Indicador RDC: DIARREIA_AGUDA)
   * - Desidratação (Indicador RDC: DESIDRATACAO)
   */
  private async checkEliminacao(
    record: DailyRecord,
    userId: string,
  ): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: record.tenantId },
      select: { schemaName: true, timezone: true },
    });

    if (!tenant) {
      throw new Error(`Tenant ${record.tenantId} não encontrado`);
    }

    const tenantClient = this.prisma.getTenantClient(tenant.schemaName);
    const tenantTimezone = tenant.timezone || DEFAULT_TIMEZONE;
    const data = record.data as Record<string, unknown>;

    if (data.tipo !== 'Fezes') {
      return;
    }

    const consistencia = data.consistencia as string | undefined;
    if (!this.isDiarreicConsistency(consistencia)) {
      return;
    }

    const currentOccurrenceAt = this.buildRecordTimestamp(
      record.date,
      record.time,
      tenantTimezone,
    );
    const windowStart = new Date(currentOccurrenceAt.getTime() - 24 * 60 * 60 * 1000);

    const eliminationCandidates: Array<{
      id: string;
      date: Date;
      time: string;
      data: unknown;
    }> = await tenantClient.dailyRecord.findMany({
      where: {
        residentId: record.residentId,
        type: 'ELIMINACAO',
        date: {
          gte: subDays(record.date, 1),
          lte: record.date,
        },
        deletedAt: null,
      },
      select: {
        id: true,
        date: true,
        time: true,
        data: true,
      },
    });

    const diarreicEpisodesIn24h = eliminationCandidates.reduce((count, candidate) => {
      const candidateData = candidate.data as Record<string, unknown>;
      if (candidateData.tipo !== 'Fezes') {
        return count;
      }

      if (!this.isDiarreicConsistency(candidateData.consistencia as string | undefined)) {
        return count;
      }

      const candidateTimestamp = this.buildRecordTimestamp(
        candidate.date,
        candidate.time,
        tenantTimezone,
      );

      if (candidateTimestamp >= windowStart && candidateTimestamp <= currentOccurrenceAt) {
        return count + 1;
      }

      return count;
    }, 0);

    // Regra clínica: episódio único ou duplo em 24h = alerta, sem abrir intercorrência automaticamente.
    if (diarreicEpisodesIn24h < 3) {
      await this.createAutoClinicalAlert({
        tenantId: record.tenantId,
        residentId: record.residentId,
        userId,
        sourceRecordId: record.id,
        title: 'Alerta clínico: evacuação diarreica',
        message: `${diarreicEpisodesIn24h}/3 episódios diarreicos nas últimas 24h. Manter monitoramento clínico.`,
        metadata: {
          alertType: 'DIARRHEA_EPISODE_MONITORING',
          episodesIn24h: diarreicEpisodesIn24h,
          threshold: 3,
          consistencia: consistencia || 'não especificada',
        },
      });
      return;
    }

    const diarreaIncidentExists = await this.hasIncidentSubtypeInLast24Hours({
      tenantClient,
      residentId: record.residentId,
      subtypeClinical: IncidentSubtypeClinical.DOENCA_DIARREICA_AGUDA,
      referenceDate: record.date,
      windowStart,
      windowEnd: currentOccurrenceAt,
      tenantTimezone,
    });

    if (!diarreaIncidentExists) {
      await this.createAutoIncident({
        tenantId: record.tenantId,
        residentId: record.residentId,
        date: record.date,
        time: record.time,
        userId,
        recordedBy: record.recordedBy,
        category: IncidentCategory.CLINICA,
        subtypeClinical: IncidentSubtypeClinical.DOENCA_DIARREICA_AGUDA,
        severity: IncidentSeverity.MODERADA,
        description: 'Doença diarreica aguda detectada automaticamente (≥3 episódios em 24h)',
        action:
          'Monitorar hidratação, frequência das evacuações e sinais de desidratação. Comunicar enfermagem e avaliar necessidade de soro oral.',
        rdcIndicators: [RdcIndicatorType.DIARREIA_AGUDA],
        sourceRecordId: record.id,
      });
    }

    const dehydrationIncidentExists = await this.hasIncidentSubtypeInLast24Hours({
      tenantClient,
      residentId: record.residentId,
      subtypeClinical: IncidentSubtypeClinical.DESIDRATACAO,
      referenceDate: record.date,
      windowStart,
      windowEnd: currentOccurrenceAt,
      tenantTimezone,
    });

    if (!dehydrationIncidentExists) {
      await this.createAutoIncident({
        tenantId: record.tenantId,
        residentId: record.residentId,
        date: record.date,
        time: record.time,
        userId,
        recordedBy: record.recordedBy,
        category: IncidentCategory.CLINICA,
        subtypeClinical: IncidentSubtypeClinical.DESIDRATACAO,
        severity: IncidentSeverity.GRAVE,
        description: 'Risco de desidratação detectado (≥3 episódios diarreicos em 24h)',
        action:
          'URGENTE: Avaliar sinais de desidratação (mucosas secas, turgor cutâneo, diurese). Iniciar reposição hídrica. Comunicar médico imediatamente.',
        rdcIndicators: [RdcIndicatorType.DESIDRATACAO],
        sourceRecordId: record.id,
      });
    }
  }

  /**
   * Verifica registros de ALIMENTACAO para detectar:
   * - Recusa alimentar (Intercorrência Assistencial: RECUSA_ALIMENTACAO)
   * - Desnutrição (Indicador RDC: DESNUTRICAO - requer análise de padrão)
   */
  private async checkAlimentacao(
    record: DailyRecord,
    userId: string,
  ): Promise<void> {
    // Obter tenant client baseado no tenantId do record
    const tenantClient = await this.getTenantClient(record.tenantId);
    const data = record.data as Record<string, unknown>;

    // Detectar recusa alimentar (0% de ingestão)
    if (data.ingeriu === 'Recusou' || data.ingeriu === '<25%') {
      await this.createAutoIncident({
        tenantId: record.tenantId,
        residentId: record.residentId,
        date: record.date,
        time: record.time,
        userId,
        recordedBy: record.recordedBy,
        category: IncidentCategory.ASSISTENCIAL,
        subtypeAssist: IncidentSubtypeAssistencial.RECUSA_ALIMENTACAO,
        severity:
          data.ingeriu === 'Recusou'
            ? IncidentSeverity.MODERADA
            : IncidentSeverity.LEVE,
        description: `Recusa alimentar detectada (${data.ingeriu} - refeição: ${data.refeicao || 'não especificada'})`,
        action:
          'Investigar causa da recusa (dor, náusea, preferências, depressão). Oferecer alternativas. Monitorar padrão de aceitação alimentar.',
        rdcIndicators: [], // Não é indicador RDC direto
        sourceRecordId: record.id,
      });

      // Verificar padrão de recusa alimentar (múltiplas refeições no dia)
      const recusasNoDia = await tenantClient.dailyRecord.count({
        where: {
          residentId: record.residentId,
          type: 'ALIMENTACAO',
          date: record.date,
          data: {
            path: ['ingeriu'],
            string_contains: 'Recusou',
          },
          deletedAt: null,
        },
      });

      if (recusasNoDia >= 2) {
        // Verificar se já não criamos um alerta de desnutrição hoje
        const desnutricaoExiste = await tenantClient.dailyRecord.findFirst({
          where: {
            residentId: record.residentId,
            type: 'INTERCORRENCIA',
            date: record.date,
            incidentSubtypeClinical:
              IncidentSubtypeClinical.DESNUTRICAO,
            deletedAt: null,
          },
        });

        if (!desnutricaoExiste) {
          await this.createAutoIncident({
            tenantId: record.tenantId,
            residentId: record.residentId,
            date: record.date,
            time: record.time,
            userId,
            recordedBy: record.recordedBy,
            category: IncidentCategory.CLINICA,
            subtypeClinical: IncidentSubtypeClinical.DESNUTRICAO,
            severity: IncidentSeverity.GRAVE,
            description: `Risco de desnutrição detectado (≥2 recusas alimentares no dia)`,
            action:
              'URGENTE: Avaliar sinais de desnutrição (perda de peso, IMC, albumina). Avaliar necessidade de suplementação. Comunicar nutricionista e médico.',
            rdcIndicators: [RdcIndicatorType.DESNUTRICAO],
            sourceRecordId: record.id,
          });
        }
      }
    }

    // Detectar intercorrências durante alimentação
    // IMPORTANTE: Não duplicar se já criamos RECUSA_ALIMENTACAO acima
    if (
      data.intercorrencia &&
      data.intercorrencia !== 'Nenhuma' &&
      !(
        data.intercorrencia === 'Recusa' &&
        (data.ingeriu === 'Recusou' || data.ingeriu === '<25%')
      )
    ) {
      const severityMap: Record<string, IncidentSeverity> = {
        Engasgo: IncidentSeverity.GRAVE,
        Vômito: IncidentSeverity.MODERADA,
        Náusea: IncidentSeverity.LEVE,
        Recusa: IncidentSeverity.LEVE,
      };

      const intercorrencia = data.intercorrencia as string;
      await this.createAutoIncident({
        tenantId: record.tenantId,
        residentId: record.residentId,
        date: record.date,
        time: record.time,
        userId,
        recordedBy: record.recordedBy,
        category: IncidentCategory.CLINICA,
        subtypeClinical:
          intercorrencia === 'Vômito'
            ? IncidentSubtypeClinical.VOMITO
            : IncidentSubtypeClinical.OUTRA_CLINICA,
        severity:
          severityMap[intercorrencia] || IncidentSeverity.MODERADA,
        description: `Intercorrência durante alimentação: ${intercorrencia}`,
        action: `Avaliar causa e monitorar. ${intercorrencia === 'Engasgo' ? 'URGENTE: Verificar via aérea e saturação de O2.' : ''}`,
        rdcIndicators: [],
        sourceRecordId: record.id,
      });
    }
  }

  /**
   * Verifica registros de COMPORTAMENTO para detectar:
   * - Agitação psicomotora (Intercorrência Assistencial: AGITACAO_PSICOMOTORA)
   * - Agressividade (Intercorrência Assistencial: AGRESSIVIDADE)
   */
  private async checkComportamento(
    record: DailyRecord,
    userId: string,
  ): Promise<void> {
    const data = record.data as Record<string, unknown>;

    // Mapear estados emocionais para subtipos de intercorrência
    const estadoEmocionalMap: Record<
      string,
      {
        subtype: IncidentSubtypeAssistencial;
        severity: IncidentSeverity;
        action: string;
      }
    > = {
      Ansioso: {
        subtype: IncidentSubtypeAssistencial.AGITACAO_PSICOMOTORA,
        severity: IncidentSeverity.LEVE,
        action:
          'Oferecer ambiente calmo e atividades relaxantes. Avaliar necessidade de medicação SOS para ansiedade.',
      },
      Irritado: {
        subtype: IncidentSubtypeAssistencial.AGRESSIVIDADE,
        severity: IncidentSeverity.MODERADA,
        action:
          'Manter distância segura. Usar comunicação calma e não-confrontacional. Avaliar causa da irritabilidade.',
      },
      Eufórico: {
        subtype: IncidentSubtypeAssistencial.AGITACAO_PSICOMOTORA,
        severity: IncidentSeverity.MODERADA,
        action:
          'Monitorar para evitar riscos (quedas, conflitos). Avaliar necessidade de ajuste medicamentoso.',
      },
    };

    const estadoEmocional = data.estadoEmocional as string | undefined;
    if (estadoEmocional && estadoEmocionalMap[estadoEmocional]) {
      const mapping = estadoEmocionalMap[estadoEmocional];

      await this.createAutoIncident({
        tenantId: record.tenantId,
        residentId: record.residentId,
        date: record.date,
        time: record.time,
        userId,
        recordedBy: record.recordedBy,
        category: IncidentCategory.ASSISTENCIAL,
        subtypeAssist: mapping.subtype,
        severity: mapping.severity,
        description: `Alteração comportamental detectada: ${data.estadoEmocional}${data.outroEstado ? ` - ${data.outroEstado}` : ''}`,
        action: mapping.action,
        rdcIndicators: [],
        sourceRecordId: record.id,
      });
    }
  }

  /**
   * Verifica registros de HIGIENE para detectar:
   * - Úlcera de decúbito (Indicador RDC: ULCERA_DECUBITO)
   */
  private async checkHigiene(
    record: DailyRecord,
    userId: string,
  ): Promise<void> {
    const data = record.data as Record<string, unknown>;

    // Detectar menção a lesões, úlceras ou feridas nas observações
    const observacoes = (data.observacoes as string | undefined)?.toLowerCase() || '';
    const keywords = [
      'lesão',
      'lesao',
      'úlcera',
      'ulcera',
      'ferida',
      'escara',
      'decúbito',
      'decubito',
      'vermelhidão',
      'vermelhidao',
      'bolha',
    ];

    const encontrouLesao = keywords.some((keyword) =>
      observacoes.includes(keyword),
    );

    if (encontrouLesao) {
      await this.createAutoIncident({
        tenantId: record.tenantId,
        residentId: record.residentId,
        date: record.date,
        time: record.time,
        userId,
        recordedBy: record.recordedBy,
        category: IncidentCategory.CLINICA,
        subtypeClinical: IncidentSubtypeClinical.ULCERA_DECUBITO,
        severity: IncidentSeverity.GRAVE,
        description: `Possível lesão de pele/úlcera detectada durante higiene`,
        action:
          'URGENTE: Avaliar lesão (localização, estágio, tamanho). Documentar com foto. Iniciar protocolo de prevenção/tratamento. Comunicar enfermagem e médico.',
        rdcIndicators: [RdcIndicatorType.ULCERA_DECUBITO],
        sourceRecordId: record.id,
      });
    }
  }

  private isDiarreicConsistency(consistency?: string): boolean {
    if (!consistency) {
      return false;
    }

    const normalized = consistency.toLowerCase();
    return (
      normalized.includes('diarr') ||
      normalized.includes('líquida') ||
      normalized.includes('liquida')
    );
  }

  private normalizeRecordTime(time?: string | null): string {
    if (!time) {
      return '00:00';
    }

    return /^([0-1]\d|2[0-3]):[0-5]\d$/.test(time) ? time : '00:00';
  }

  private buildRecordTimestamp(
    date: Date,
    time: string | null | undefined,
    tenantTimezone: string,
  ): Date {
    return localToUTC(
      formatDateOnly(date),
      this.normalizeRecordTime(time),
      tenantTimezone,
    );
  }

  private async hasIncidentSubtypeInLast24Hours(params: {
    tenantClient: TenantClientForIncidentWindowCheck;
    residentId: string;
    subtypeClinical: IncidentSubtypeClinical;
    referenceDate: Date;
    windowStart: Date;
    windowEnd: Date;
    tenantTimezone: string;
  }): Promise<boolean> {
    const {
      tenantClient,
      residentId,
      subtypeClinical,
      referenceDate,
      windowStart,
      windowEnd,
      tenantTimezone,
    } = params;

    const incidentCandidates: Array<{
      id: string;
      date: Date;
      time: string;
    }> = await tenantClient.dailyRecord.findMany({
      where: {
        residentId,
        type: 'INTERCORRENCIA',
        incidentSubtypeClinical: subtypeClinical,
        date: {
          gte: subDays(referenceDate, 1),
          lte: referenceDate,
        },
        deletedAt: null,
      },
      select: {
        id: true,
        date: true,
        time: true,
      },
    });

    return incidentCandidates.some((incident) => {
      const incidentTimestamp = this.buildRecordTimestamp(
        incident.date,
        incident.time,
        tenantTimezone,
      );
      return incidentTimestamp >= windowStart && incidentTimestamp <= windowEnd;
    });
  }

  private async createAutoClinicalAlert(params: {
    tenantId: string;
    residentId: string;
    userId: string;
    sourceRecordId: string;
    title: string;
    message: string;
    severity?: NotificationSeverity;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const {
      tenantId,
      residentId,
      userId,
      sourceRecordId,
      title,
      message,
      severity = NotificationSeverity.WARNING,
      metadata,
    } = params;

    try {
      const tenantClient = await this.getTenantClient(tenantId);
      const resident = await tenantClient.resident.findUnique({
        where: { id: residentId },
        select: { fullName: true },
      });

      if (!resident) {
        return;
      }

      const recipientIds =
        await this.notificationsService.getIncidentNotificationRecipients(
          tenantId,
          userId,
        );

      await this.notificationsService.createDirectedNotification(
        tenantId,
        recipientIds,
        {
          type: SystemNotificationType.INCIDENT_RDC_INDICATOR_ALERT,
          category: NotificationCategory.INCIDENT,
          severity,
          title,
          message: `${resident.fullName}: ${message}`,
          actionUrl: `/dashboard/intercorrencias/${residentId}`,
          entityType: 'DAILY_RECORD',
          entityId: sourceRecordId,
          metadata: {
            residentId,
            residentName: resident.fullName,
            alertOnly: true,
            ...metadata,
          },
        },
      );
    } catch (error) {
      this.logger.error('Erro ao criar alerta clínico automático', {
        error: error.message,
        stack: error.stack,
        tenantId,
        residentId,
      });
    }
  }

  /**
   * Cria uma intercorrência automática com base na detecção
   */
  private async createAutoIncident(params: {
    tenantId: string;
    residentId: string;
    date: Date;
    time: string;
    userId: string;
    recordedBy: string;
    category: IncidentCategory;
    subtypeClinical?: IncidentSubtypeClinical;
    subtypeAssist?: IncidentSubtypeAssistencial;
    severity: IncidentSeverity;
    description: string;
    action: string;
    rdcIndicators: RdcIndicatorType[];
    sourceRecordId: string;
    dedupeBySourceRecord?: boolean;
    additionalData?: Record<string, unknown>;
  }): Promise<void> {
    const {
      tenantId,
      residentId,
      date,
      time,
      userId,
      recordedBy,
      category,
      subtypeClinical,
      subtypeAssist,
      severity,
      description,
      action,
      rdcIndicators,
      sourceRecordId,
      dedupeBySourceRecord = false,
      additionalData,
    } = params;

    // Obter tenant client usando getTenantClient
    const tenantClient = await this.getTenantClient(tenantId);

    // Verificar se já não existe uma intercorrência idêntica
    const existingIncident = await tenantClient.dailyRecord.findFirst({
      where: dedupeBySourceRecord
        ? {
            residentId,
            type: 'INTERCORRENCIA',
            incidentCategory: category,
            ...(subtypeClinical && { incidentSubtypeClinical: subtypeClinical }),
            ...(subtypeAssist && { incidentSubtypeAssist: subtypeAssist }),
            data: {
              path: ['registroOrigemId'],
              equals: sourceRecordId,
            },
            deletedAt: null,
          }
        : {
            residentId,
            type: 'INTERCORRENCIA',
            date,
            incidentCategory: category,
            ...(subtypeClinical && { incidentSubtypeClinical: subtypeClinical }),
            ...(subtypeAssist && { incidentSubtypeAssist: subtypeAssist }),
            deletedAt: null,
          },
    });

    if (existingIncident) {
      this.logger.debug(
        'Intercorrência similar já existe, pulando criação automática',
        {
          residentId,
          date,
          category,
          subtypeClinical,
          subtypeAssist,
        },
      );
      return;
    }

    // Determinar se é Evento Sentinela
    const isEventoSentinela =
      subtypeClinical === IncidentSubtypeClinical.QUEDA_COM_LESAO ||
      subtypeClinical === IncidentSubtypeClinical.TENTATIVA_SUICIDIO;

    this.logger.log('Criando intercorrência automática', {
      residentId,
      category,
      subtypeClinical,
      subtypeAssist,
      severity,
      isEventoSentinela,
      rdcIndicators,
    });

    const incidentRecord = await tenantClient.dailyRecord.create({
      data: {
        tenantId, // ⚠️ TEMPORARY: Schema ainda não migrado
        residentId,
        type: 'INTERCORRENCIA',
        date,
        time,
        userId,
        recordedBy: `${recordedBy} (Detecção Automática)`,
        data: {
          descricao: description,
          acaoTomada: action,
          deteccaoAutomatica: true,
          registroOrigemId: sourceRecordId,
          ...(additionalData || {}),
        },
        incidentCategory: category,
        incidentSubtypeClinical: subtypeClinical,
        incidentSubtypeAssist: subtypeAssist,
        incidentSeverity: severity,
        isEventoSentinela,
        rdcIndicators,
        notes: 'Intercorrência criada automaticamente pelo sistema',
      },
    });

    this.logger.log('Intercorrência automática criada com sucesso', {
      residentId,
      category,
      subtypeClinical,
      subtypeAssist,
      isEventoSentinela,
      incidentRecordId: incidentRecord.id,
    });

    // Buscar dados do residente e criar notificação DIRECIONADA
    try {
      const resident = await tenantClient.resident.findUnique({
        where: { id: residentId },
        select: { fullName: true },
      });

      if (resident) {
        // Buscar destinatários (Admin e Autor do registro original)
        const recipientIds = await this.notificationsService.getIncidentNotificationRecipients(
          tenantId,
          userId,
        );

        // Mapear severidade do incident para severidade da notificação
        const notificationSeverity =
          severity === IncidentSeverity.GRAVE
            ? NotificationSeverity.CRITICAL
            : severity === IncidentSeverity.MODERADA
              ? NotificationSeverity.WARNING
              : NotificationSeverity.INFO;

        // Formatar subtipo para exibição amigável
        const formattedSubtype = formatIncidentSubtype(
          subtypeClinical,
          subtypeAssist,
          undefined, // Não há subtipo administrativo em detecção automática
        );

        // Criar notificação DIRECIONADA sobre a intercorrência automática
        await this.notificationsService.createDirectedNotification(
          tenantId,
          recipientIds,
          {
            type: SystemNotificationType.INCIDENT_CREATED,
            category: NotificationCategory.INCIDENT,
            severity: notificationSeverity,
            title: 'Intercorrência Detectada Automaticamente',
            message: `${resident.fullName}: ${formattedSubtype}`,
            actionUrl: `/dashboard/intercorrencias/${residentId}`,
            entityType: 'DAILY_RECORD',
            entityId: incidentRecord.id,
            metadata: {
              residentId,
              residentName: resident.fullName,
              category,
              subtypeClinical,
              subtypeAssist,
              severity,
              isEventoSentinela,
              deteccaoAutomatica: true,
            },
          },
        );

        this.logger.log('Notificação de intercorrência criada (direcionada)', {
          incidentRecordId: incidentRecord.id,
          residentName: resident.fullName,
          recipientsCount: recipientIds.length,
        });
      }
    } catch (notificationError) {
      this.logger.error('Erro ao criar notificação de intercorrência', {
        error: notificationError.message,
        stack: notificationError.stack,
        incidentRecordId: incidentRecord.id,
      });
      // Não propagar o erro - a intercorrência já foi criada com sucesso
    }

    // Nota: O workflow de Evento Sentinela é processado automaticamente pelo
    // SentinelEventsService via @OnEvent('daily-record.created')
  }
}
