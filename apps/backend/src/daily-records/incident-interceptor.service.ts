import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DailyRecord,
  IncidentCategory,
  IncidentSubtypeClinical,
  IncidentSubtypeAssistencial,
  IncidentSeverity,
  RdcIndicatorType,
} from '@prisma/client';

/**
 * Serviço responsável por detectar automaticamente intercorrências
 * com base em registros diários e criar intercorrências quando necessário.
 *
 * Implementa as regras da RDC 502/2021 da ANVISA para detecção de
 * Eventos Sentinela e Indicadores obrigatórios.
 */
@Injectable()
export class IncidentInterceptorService {
  private readonly logger = new Logger(IncidentInterceptorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sentinelEventService?: any, // Injected later to avoid circular dependency
  ) {}

  /**
   * Analisa um registro diário e cria intercorrências automaticamente
   * quando padrões específicos são detectados.
   */
  async analyzeAndCreateIncidents(
    record: DailyRecord,
    tenantId: string,
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
          await this.checkEliminacao(record, tenantId, userId);
          break;
        case 'ALIMENTACAO':
          await this.checkAlimentacao(record, tenantId, userId);
          break;
        case 'COMPORTAMENTO':
          await this.checkComportamento(record, tenantId, userId);
          break;
        case 'HIGIENE':
          await this.checkHigiene(record, tenantId, userId);
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
   * Verifica registros de ELIMINACAO para detectar:
   * - Diarreia (Indicador RDC: DIARREIA_AGUDA)
   * - Desidratação (Indicador RDC: DESIDRATACAO)
   */
  private async checkEliminacao(
    record: DailyRecord,
    tenantId: string,
    userId: string,
  ): Promise<void> {
    const data = record.data as any;

    // Detectar diarreia (Indicador RDC obrigatório)
    if (data.tipo === 'Fezes') {
      const consistenciaDiarreica =
        data.consistencia?.toLowerCase().includes('diarr') ||
        data.consistencia?.toLowerCase().includes('líquida') ||
        data.consistencia?.toLowerCase().includes('liquida');

      // Critério: consistência diarréica OU múltiplas evacuações no mesmo dia
      if (consistenciaDiarreica) {
        await this.createAutoIncident({
          tenantId,
          residentId: record.residentId,
          date: record.date,
          time: record.time,
          userId,
          recordedBy: record.recordedBy,
          category: IncidentCategory.CLINICA,
          subtypeClinical: IncidentSubtypeClinical.DOENCA_DIARREICA_AGUDA,
          severity: IncidentSeverity.MODERADA,
          description: `Diarreia detectada automaticamente (consistência: ${data.consistencia || 'não especificada'})`,
          action:
            'Monitorar hidratação, frequência das evacuações e sinais de desidratação. Comunicar enfermagem e avaliar necessidade de soro oral.',
          rdcIndicators: [RdcIndicatorType.DIARREIA_AGUDA],
          sourceRecordId: record.id,
        });
      }

      // Verificar se há múltiplas evacuações diarreicas no mesmo dia
      const evacuacoesNoDia = await this.prisma.dailyRecord.count({
        where: {
          tenantId,
          residentId: record.residentId,
          type: 'ELIMINACAO',
          date: record.date,
          deletedAt: null,
        },
      });

      if (evacuacoesNoDia >= 3 && consistenciaDiarreica) {
        // Verificar se já não criamos um alerta de desidratação hoje
        const desidratacaoExiste = await this.prisma.dailyRecord.findFirst({
          where: {
            tenantId,
            residentId: record.residentId,
            type: 'INTERCORRENCIA',
            date: record.date,
            incidentSubtypeClinical:
              IncidentSubtypeClinical.DESIDRATACAO,
            deletedAt: null,
          },
        });

        if (!desidratacaoExiste) {
          await this.createAutoIncident({
            tenantId,
            residentId: record.residentId,
            date: record.date,
            time: record.time,
            userId,
            recordedBy: record.recordedBy,
            category: IncidentCategory.CLINICA,
            subtypeClinical: IncidentSubtypeClinical.DESIDRATACAO,
            severity: IncidentSeverity.GRAVE,
            description: `Risco de desidratação detectado (≥3 evacuações diarreicas no dia)`,
            action:
              'URGENTE: Avaliar sinais de desidratação (mucosas secas, turgor cutâneo, diurese). Iniciar reposição hídrica. Comunicar médico imediatamente.',
            rdcIndicators: [RdcIndicatorType.DESIDRATACAO],
            sourceRecordId: record.id,
          });
        }
      }
    }
  }

  /**
   * Verifica registros de ALIMENTACAO para detectar:
   * - Recusa alimentar (Intercorrência Assistencial: RECUSA_ALIMENTACAO)
   * - Desnutrição (Indicador RDC: DESNUTRICAO - requer análise de padrão)
   */
  private async checkAlimentacao(
    record: DailyRecord,
    tenantId: string,
    userId: string,
  ): Promise<void> {
    const data = record.data as any;

    // Detectar recusa alimentar (0% de ingestão)
    if (data.ingeriu === 'Recusou' || data.ingeriu === '<25%') {
      await this.createAutoIncident({
        tenantId,
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
      const recusasNoDia = await this.prisma.dailyRecord.count({
        where: {
          tenantId,
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
        const desnutricaoExiste = await this.prisma.dailyRecord.findFirst({
          where: {
            tenantId,
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
            tenantId,
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

      await this.createAutoIncident({
        tenantId,
        residentId: record.residentId,
        date: record.date,
        time: record.time,
        userId,
        recordedBy: record.recordedBy,
        category: IncidentCategory.CLINICA,
        subtypeClinical:
          data.intercorrencia === 'Vômito'
            ? IncidentSubtypeClinical.VOMITO
            : IncidentSubtypeClinical.OUTRA_CLINICA,
        severity:
          severityMap[data.intercorrencia] || IncidentSeverity.MODERADA,
        description: `Intercorrência durante alimentação: ${data.intercorrencia}`,
        action: `Avaliar causa e monitorar. ${data.intercorrencia === 'Engasgo' ? 'URGENTE: Verificar via aérea e saturação de O2.' : ''}`,
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
    tenantId: string,
    userId: string,
  ): Promise<void> {
    const data = record.data as any;

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

    if (data.estadoEmocional && estadoEmocionalMap[data.estadoEmocional]) {
      const mapping = estadoEmocionalMap[data.estadoEmocional];

      await this.createAutoIncident({
        tenantId,
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
    tenantId: string,
    userId: string,
  ): Promise<void> {
    const data = record.data as any;

    // Detectar menção a lesões, úlceras ou feridas nas observações
    const observacoes = data.observacoes?.toLowerCase() || '';
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
        tenantId,
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
    } = params;

    // Verificar se já não existe uma intercorrência idêntica
    const existingIncident = await this.prisma.dailyRecord.findFirst({
      where: {
        tenantId,
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

    const incidentRecord = await this.prisma.dailyRecord.create({
      data: {
        tenantId,
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
    });

    // Se for Evento Sentinela, trigger workflow automático
    if (isEventoSentinela && this.sentinelEventService) {
      try {
        await this.sentinelEventService.triggerSentinelEventWorkflow(
          incidentRecord.id,
          tenantId,
        );
      } catch (error) {
        this.logger.error('Erro ao processar Evento Sentinela', {
          incidentRecordId: incidentRecord.id,
          error: error instanceof Error ? error.message : String(error),
        });
        // Não propagar erro
      }
    }
  }
}
