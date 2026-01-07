import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetAgendaItemsDto, ContentFilterType, StatusFilterType } from './dto/get-agenda-items.dto';
import { AgendaItem, AgendaItemType } from './interfaces/agenda-item.interface';
import { parseISO, startOfDay, endOfDay, isWithinInterval, eachDayOfInterval, format, isPast, isBefore } from 'date-fns';
import { RecordType, ScheduledEventType, InstitutionalEventVisibility } from '@prisma/client';
import { formatDateOnly } from '../utils/date.helpers';

@Injectable()
export class AgendaService {
  private readonly logger = new Logger(AgendaService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Busca todos os itens da agenda (medicamentos, eventos agendados e registros recorrentes)
   * consolidados em uma única lista
   *
   * Suporta 3 modos:
   * 1. Single date: dto.date fornecido (retrocompatível)
   * 2. Range query: dto.startDate e dto.endDate fornecidos
   * 3. Default: usa data atual
   */
  async getAgendaItems(
    dto: GetAgendaItemsDto,
    tenantId: string,
  ): Promise<AgendaItem[]> {
    // Determinar intervalo de datas baseado nos parâmetros
    let targetStartDate: Date;
    let targetEndDate: Date;

    if (dto.startDate && dto.endDate) {
      // Modo Range Query (para visualizações semanal/mensal)
      targetStartDate = parseISO(`${dto.startDate}T00:00:00.000`);
      targetEndDate = parseISO(`${dto.endDate}T23:59:59.999`);
      this.logger.log(
        `Buscando itens da agenda (RANGE) para tenant ${tenantId}, ${dto.startDate} a ${dto.endDate}, residentId: ${dto.residentId || 'todos'}`,
      );
    } else if (dto.date) {
      // Modo Single Date (retrocompatível - visualização diária)
      const singleDate = parseISO(`${dto.date}T12:00:00.000`);
      targetStartDate = startOfDay(singleDate);
      targetEndDate = endOfDay(singleDate);
      this.logger.log(
        `Buscando itens da agenda (SINGLE) para tenant ${tenantId}, data: ${dto.date}, residentId: ${dto.residentId || 'todos'}`,
      );
    } else {
      // Modo Default: usa hoje
      const today = new Date();
      targetStartDate = startOfDay(today);
      targetEndDate = endOfDay(today);
      this.logger.log(
        `Buscando itens da agenda (DEFAULT=hoje) para tenant ${tenantId}, residentId: ${dto.residentId || 'todos'}`,
      );
    }

    const items: AgendaItem[] = [];

    // Determinar quais categorias buscar (se não houver filtros, busca todas)
    const filters = dto.filters && dto.filters.length > 0 ? dto.filters : Object.values(ContentFilterType);

    // 1. Buscar medicamentos se incluído nos filtros
    if (filters.includes(ContentFilterType.MEDICATIONS)) {
      const medications = await this.getMedicationItems(
        targetStartDate,
        targetEndDate,
        tenantId,
        dto.residentId,
      );
      items.push(...medications);
    }

    // 2. Buscar eventos agendados (vacinas, consultas, exames, procedimentos)
    const eventTypes = this.getEventTypesFromFilters(filters);
    if (eventTypes.length > 0) {
      const events = await this.getScheduledEventItems(
        targetStartDate,
        targetEndDate,
        tenantId,
        dto.residentId,
        eventTypes,
      );
      items.push(...events);
    }

    // 3. Buscar registros obrigatórios recorrentes
    const recordTypes = this.getRecordTypesFromFilters(filters);
    if (recordTypes.length > 0) {
      const records = await this.getRecurringRecordItems(
        targetStartDate,
        targetEndDate,
        tenantId,
        dto.residentId,
        recordTypes,
      );
      items.push(...records);
    }

    // Aplicar filtro de status se fornecido
    const statusFilter = dto.statusFilter || StatusFilterType.ALL;
    let filteredItems = items;

    if (statusFilter !== StatusFilterType.ALL) {
      filteredItems = items.filter((item) => {
        // Aplicar lógica de status baseada no filtro
        switch (statusFilter) {
          case StatusFilterType.PENDING:
            return item.status === 'pending';
          case StatusFilterType.COMPLETED:
            return item.status === 'completed';
          case StatusFilterType.MISSED:
            return item.status === 'missed';
          case StatusFilterType.CANCELLED:
            return item.status === 'cancelled';
          default:
            return true;
        }
      });
    }

    // Ordenar por horário
    filteredItems.sort((a, b) => {
      const timeA = a.scheduledTime || '00:00';
      const timeB = b.scheduledTime || '00:00';
      return timeA.localeCompare(timeB);
    });

    this.logger.log(`Encontrados ${filteredItems.length} itens da agenda (total: ${items.length}, filtro: ${statusFilter})`);
    return filteredItems;
  }

  /**
   * Busca medicamentos agendados para o intervalo de datas
   */
  private async getMedicationItems(
    startDate: Date,
    endDate: Date,
    tenantId: string,
    residentId?: string,
  ): Promise<AgendaItem[]> {
    const items: AgendaItem[] = [];

    // Buscar prescrições ativas que estejam ativas em algum momento do intervalo
    const prescriptions = await this.prisma.prescription.findMany({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
        ...(residentId && { residentId }),
        medications: {
          some: {
            deletedAt: null,
            startDate: { lte: endDate }, // Começou antes ou durante o intervalo
            OR: [
              { endDate: null }, // Uso contínuo
              { endDate: { gte: startDate } }, // Termina depois ou durante o intervalo
            ],
          },
        },
      },
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
          },
        },
        medications: {
          where: {
            deletedAt: null,
            startDate: { lte: endDate },
            OR: [
              { endDate: null },
              { endDate: { gte: startDate } },
            ],
          },
        },
      },
    });

    // Processar cada medicamento e seus horários
    // Para cada dia do intervalo, criar os itens de medicação
    // Usar parseISO com T12:00 para cada dia, garantindo compatibilidade com MedicationAdministration
    const daysInRange = eachDayOfInterval({ start: startOfDay(startDate), end: startOfDay(endDate) }).map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return parseISO(`${dateStr}T12:00:00.000`);
    });

    const today = startOfDay(new Date());

    for (const prescription of prescriptions) {
      for (const medication of prescription.medications) {
        const scheduledTimes = medication.scheduledTimes as string[];

        if (scheduledTimes && Array.isArray(scheduledTimes) && scheduledTimes.length > 0) {
          // Para cada dia do intervalo
          for (const currentDay of daysInRange) {
            // ✅ Comparar datas em formato YYYY-MM-DD para evitar timezone shift
            const medicationStartStr = formatDateOnly(medication.startDate);
            const medicationEndStr = medication.endDate ? formatDateOnly(medication.endDate) : null;
            const currentDayStr = format(currentDay, 'yyyy-MM-dd');

            // Comparação de strings YYYY-MM-DD (timezone-safe)
            if (currentDayStr < medicationStartStr) continue;
            if (medicationEndStr && currentDayStr > medicationEndStr) continue;

            const currentDayStart = startOfDay(currentDay);

            const isPastDay = currentDayStart < today;

            // Criar um item para cada horário agendado
            for (const time of scheduledTimes) {
              // Verificar se já foi administrado neste horário e dia
              // Usar currentDay diretamente (T12:00) para match com medicationAdministration
              const administration = await this.prisma.medicationAdministration.findFirst({
                where: {
                  medicationId: medication.id,
                  date: currentDay,
                  scheduledTime: time,
                },
                include: {
                  user: {
                    select: { name: true },
                  },
                },
              });

              // Determinar o status do item
              let status: 'pending' | 'completed' | 'missed';
              if (administration && administration.wasAdministered) {
                status = 'completed';
              } else if (isPastDay) {
                // Se é um dia passado e não foi administrado, está missed
                status = 'missed';
              } else {
                status = 'pending';
              }

              items.push({
                id: `${medication.id}-${format(currentDay, 'yyyy-MM-dd')}-${time}`,
                type: AgendaItemType.MEDICATION,
                category: 'medications',
                residentId: prescription.residentId,
                residentName: prescription.resident.fullName,
                title: `${medication.name} ${medication.concentration}`,
                description: medication.instructions || undefined,
                scheduledDate: currentDay,
                scheduledTime: time,
                status,
                completedAt: administration?.createdAt,
                completedBy: administration?.user?.name || administration?.administeredBy,
                medicationName: medication.name,
                dosage: `${medication.dose} - ${medication.route}`,
                prescriptionId: prescription.id,
                metadata: {
                  presentation: medication.presentation,
                  frequency: medication.frequency,
                  isControlled: medication.isControlled,
                  isHighRisk: medication.isHighRisk,
                  requiresDoubleCheck: medication.requiresDoubleCheck,
                },
              });
            }
          }
        }
      }
    }

    return items;
  }

  /**
   * Busca eventos agendados (vacinas, consultas, exames, procedimentos) para o intervalo de datas
   */
  private async getScheduledEventItems(
    startDate: Date,
    endDate: Date,
    tenantId: string,
    residentId?: string,
    eventTypes?: ScheduledEventType[],
  ): Promise<AgendaItem[]> {
    const events = await this.prisma.residentScheduledEvent.findMany({
      where: {
        tenantId,
        deletedAt: null,
        scheduledDate: {
          gte: startOfDay(startDate),
          lte: endOfDay(endDate),
        },
        ...(residentId && { residentId }),
        ...(eventTypes && eventTypes.length > 0 && { eventType: { in: eventTypes } }),
      },
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
          },
        },
        updatedByUser: {
          select: { name: true },
        },
      },
      orderBy: {
        scheduledTime: 'asc',
      },
    });

    const now = new Date();

    return events.map((event) => {
      // Se o evento está SCHEDULED mas a data já passou, marcar como MISSED
      let eventStatus = event.status;
      if (eventStatus === 'SCHEDULED' && isBefore(event.scheduledDate, startOfDay(now))) {
        eventStatus = 'MISSED';
      }

      return {
        id: event.id,
        type: AgendaItemType.SCHEDULED_EVENT,
        category: this.mapEventTypeToCategory(event.eventType),
        residentId: event.residentId,
        residentName: event.resident.fullName,
        title: event.title,
        description: event.description || undefined,
        scheduledDate: event.scheduledDate,
        scheduledTime: event.scheduledTime || '00:00',
        status: this.mapEventStatus(eventStatus),
        completedAt: event.completedAt || undefined,
        completedBy: event.updatedByUser?.name,
        eventType: event.eventType,
        vaccineData: event.vaccineData as any,
        eventId: event.id,
        metadata: {
          notes: event.notes,
        },
      };
    });
  }

  /**
   * Busca registros obrigatórios recorrentes que devem ser feitos no intervalo de datas
   */
  private async getRecurringRecordItems(
    startDate: Date,
    endDate: Date,
    tenantId: string,
    residentId?: string,
    recordTypes?: RecordType[],
  ): Promise<AgendaItem[]> {
    const items: AgendaItem[] = [];

    // Buscar configurações ativas
    const configs = await this.prisma.residentScheduleConfig.findMany({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
        ...(residentId && { residentId }),
        ...(recordTypes && recordTypes.length > 0 && { recordType: { in: recordTypes } }),
      },
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    // Para cada dia do intervalo, verificar se deve gerar tarefa
    // Usar parseISO com T12:00 para cada dia, garantindo compatibilidade com DailyRecord
    const daysInRange = eachDayOfInterval({ start: startOfDay(startDate), end: startOfDay(endDate) }).map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return parseISO(`${dateStr}T12:00:00.000`);
    });

    const today = startOfDay(new Date());

    for (const config of configs) {
      for (const targetDate of daysInRange) {
        const dayOfWeek = targetDate.getDay();
        const dayOfMonth = targetDate.getDate();
        const targetDayStart = startOfDay(targetDate);
        const isPastDay = targetDayStart < today;
        let shouldGenerate = false;

        if (config.frequency === 'DAILY') {
          shouldGenerate = true;
        } else if (config.frequency === 'WEEKLY' && config.dayOfWeek === dayOfWeek) {
          shouldGenerate = true;
        } else if (config.frequency === 'MONTHLY') {
          if (config.dayOfMonth === dayOfMonth) {
            shouldGenerate = true;
          } else {
            // Fallback: se config pede dia que não existe no mês, usar último dia
            const lastDayOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
            if (config.dayOfMonth! > lastDayOfMonth && dayOfMonth === lastDayOfMonth) {
              shouldGenerate = true;
            }
          }
        }

        if (!shouldGenerate) continue;

        // Verificar se já foi realizado
        const mealType = config.metadata && typeof config.metadata === 'object' && 'mealType' in config.metadata
          ? (config.metadata as any).mealType
          : null;

        const record = await this.prisma.dailyRecord.findFirst({
          where: {
            tenantId,
            residentId: config.residentId,
            type: config.recordType,
            date: targetDate,
            deletedAt: null,
            ...(mealType && {
              data: {
                path: ['mealType'],
                equals: mealType,
              },
            }),
          },
          include: {
            user: {
              select: { name: true },
            },
          },
        });

        const suggestedTimes = config.suggestedTimes as string[] || [];
        const primaryTime = suggestedTimes.length > 0 ? suggestedTimes[0] : '00:00';

        // Determinar o status do registro
        let status: 'pending' | 'completed' | 'missed';
        if (record && !record.deletedAt) {
          status = 'completed';
        } else if (isPastDay) {
          // Se é um dia passado e não foi registrado, está missed
          status = 'missed';
        } else {
          status = 'pending';
        }

        items.push({
          id: `${config.id}-${format(targetDate, 'yyyy-MM-dd')}`,
          type: AgendaItemType.RECURRING_RECORD,
          category: this.mapRecordTypeToCategory(config.recordType),
          residentId: config.residentId,
          residentName: config.resident.fullName,
          title: this.getRecordTypeTitle(config.recordType, mealType),
          description: config.notes || undefined,
          scheduledDate: targetDate,
          scheduledTime: primaryTime,
          status,
          completedAt: record?.createdAt,
          completedBy: record?.user?.name || record?.recordedBy,
          recordType: config.recordType,
          suggestedTimes: suggestedTimes,
          configId: config.id,
          mealType: mealType,
          metadata: config.metadata as any,
        });
      }
    }

    return items;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Métodos auxiliares de mapeamento
  // ─────────────────────────────────────────────────────────────────────────────

  private getEventTypesFromFilters(filters: ContentFilterType[]): ScheduledEventType[] {
    const mapping: Record<ContentFilterType, ScheduledEventType | null> = {
      [ContentFilterType.VACCINATIONS]: 'VACCINATION',
      [ContentFilterType.CONSULTATIONS]: 'CONSULTATION',
      [ContentFilterType.EXAMS]: 'EXAM',
      [ContentFilterType.PROCEDURES]: 'PROCEDURE',
      [ContentFilterType.OTHER_EVENTS]: 'OTHER',
      [ContentFilterType.MEDICATIONS]: null,
      [ContentFilterType.HYGIENE]: null,
      [ContentFilterType.FEEDING]: null,
      [ContentFilterType.HYDRATION]: null,
      [ContentFilterType.WEIGHT]: null,
      [ContentFilterType.MONITORING]: null,
      [ContentFilterType.ELIMINATION]: null,
      [ContentFilterType.BEHAVIOR]: null,
      [ContentFilterType.SLEEP]: null,
      [ContentFilterType.ACTIVITIES]: null,
      [ContentFilterType.VISITS]: null,
      [ContentFilterType.OTHER_RECORDS]: null,
    };

    return filters
      .map((filter) => mapping[filter])
      .filter((type) => type !== null) as ScheduledEventType[];
  }

  private getRecordTypesFromFilters(filters: ContentFilterType[]): RecordType[] {
    const mapping: Record<ContentFilterType, RecordType | null> = {
      [ContentFilterType.HYGIENE]: 'HIGIENE',
      [ContentFilterType.FEEDING]: 'ALIMENTACAO',
      [ContentFilterType.HYDRATION]: 'HIDRATACAO',
      [ContentFilterType.WEIGHT]: 'PESO',
      [ContentFilterType.MONITORING]: 'MONITORAMENTO',
      [ContentFilterType.ELIMINATION]: 'ELIMINACAO',
      [ContentFilterType.BEHAVIOR]: 'COMPORTAMENTO',
      [ContentFilterType.SLEEP]: 'SONO',
      [ContentFilterType.ACTIVITIES]: 'ATIVIDADES',
      [ContentFilterType.VISITS]: 'VISITA',
      [ContentFilterType.OTHER_RECORDS]: 'OUTROS',
      [ContentFilterType.MEDICATIONS]: null,
      [ContentFilterType.VACCINATIONS]: null,
      [ContentFilterType.CONSULTATIONS]: null,
      [ContentFilterType.EXAMS]: null,
      [ContentFilterType.PROCEDURES]: null,
      [ContentFilterType.OTHER_EVENTS]: null,
    };

    return filters
      .map((filter) => mapping[filter])
      .filter((type) => type !== null) as RecordType[];
  }

  private mapEventTypeToCategory(eventType: ScheduledEventType): string {
    const mapping: Record<ScheduledEventType, string> = {
      VACCINATION: 'vaccinations',
      CONSULTATION: 'consultations',
      EXAM: 'exams',
      PROCEDURE: 'procedures',
      OTHER: 'other_events',
    };
    return mapping[eventType] || 'other_events';
  }

  private mapRecordTypeToCategory(recordType: RecordType): string {
    const mapping: Partial<Record<RecordType, string>> = {
      HIGIENE: 'hygiene',
      ALIMENTACAO: 'feeding',
      HIDRATACAO: 'hydration',
      PESO: 'weight',
      MONITORAMENTO: 'monitoring',
      ELIMINACAO: 'elimination',
      COMPORTAMENTO: 'behavior',
      SONO: 'sleep',
      ATIVIDADES: 'activities',
      VISITA: 'visits',
      OUTROS: 'other_records',
    };
    return mapping[recordType] || 'other_records';
  }

  private mapEventStatus(status: string): 'pending' | 'completed' | 'missed' | 'cancelled' {
    const mapping: Record<string, 'pending' | 'completed' | 'missed' | 'cancelled'> = {
      SCHEDULED: 'pending',
      COMPLETED: 'completed',
      MISSED: 'missed',
      CANCELLED: 'cancelled',
    };
    return mapping[status] || 'pending';
  }

  private getRecordTypeTitle(recordType: RecordType, mealType?: string | null): string {
    if (recordType === 'ALIMENTACAO' && mealType) {
      return `Alimentação - ${mealType}`;
    }

    const titles: Partial<Record<RecordType, string>> = {
      HIGIENE: 'Higiene',
      ALIMENTACAO: 'Alimentação',
      HIDRATACAO: 'Hidratação',
      PESO: 'Aferição de Peso',
      MONITORAMENTO: 'Monitoramento de Sinais Vitais',
      ELIMINACAO: 'Eliminação',
      COMPORTAMENTO: 'Registro de Comportamento',
      HUMOR: 'Registro de Humor',
      SONO: 'Registro de Sono',
      ATIVIDADES: 'Atividades',
      VISITA: 'Visita',
      INTERCORRENCIA: 'Intercorrência',
      OUTROS: 'Outros',
    };

    return titles[recordType] || recordType;
  }

  /**
   * Busca eventos institucionais para a agenda
   * Filtra por visibilidade baseado no role do usuário
   * Suporta intervalo de datas para visualizações semanal/mensal
   */
  async getInstitutionalEvents(
    startDate: Date,
    endDate: Date,
    tenantId: string,
    userRole: string,
    isRT: boolean = false,
  ): Promise<AgendaItem[]> {
    // Determinar quais visibilidades o usuário pode ver
    let visibilityFilter: InstitutionalEventVisibility[] = [];

    if (userRole === 'admin' || isRT) {
      // Admins e RT veem tudo
      visibilityFilter = [
        InstitutionalEventVisibility.ALL_USERS,
        InstitutionalEventVisibility.RT_ONLY,
        InstitutionalEventVisibility.ADMIN_ONLY,
      ];
    } else if (isRT) {
      // RT vê ALL_USERS e RT_ONLY
      visibilityFilter = [
        InstitutionalEventVisibility.ALL_USERS,
        InstitutionalEventVisibility.RT_ONLY,
      ];
    } else {
      // Outros usuários veem apenas ALL_USERS
      visibilityFilter = [InstitutionalEventVisibility.ALL_USERS];
    }

    const events = await this.prisma.institutionalEvent.findMany({
      where: {
        tenantId,
        deletedAt: null,
        scheduledDate: {
          gte: startOfDay(startDate),
          lte: endOfDay(endDate),
        },
        visibility: {
          in: visibilityFilter,
        },
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
          },
        },
        updatedByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        scheduledTime: 'asc',
      },
    });

    return events.map((event) => ({
      id: event.id,
      type: AgendaItemType.SCHEDULED_EVENT,
      category: 'institutional',
      residentId: '', // Eventos institucionais não têm residente
      residentName: 'Institucional',
      title: event.title,
      description: event.description || undefined,
      scheduledDate: event.scheduledDate,
      scheduledTime: event.scheduledTime || '00:00',
      status: this.mapEventStatus(event.status),
      completedAt: event.completedAt || undefined,
      completedBy: event.updatedByUser?.name,
      metadata: {
        eventType: event.eventType,
        visibility: event.visibility,
        documentType: event.documentType,
        documentNumber: event.documentNumber,
        expiryDate: event.expiryDate,
        responsible: event.responsible,
        trainingTopic: event.trainingTopic,
        instructor: event.instructor,
        targetAudience: event.targetAudience,
        location: event.location,
        ...((event.metadata as any) || {}),
      },
    }));
  }
}
