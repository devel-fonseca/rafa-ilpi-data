import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { parseISO, startOfDay, endOfDay } from 'date-fns';
import { ScheduleFrequency } from '@prisma/client';
import { getCurrentDateInTz, DEFAULT_TIMEZONE, formatDateOnly } from '../utils/date.helpers';

export interface DailyTask {
  type: 'RECURRING' | 'EVENT';
  residentId: string;
  residentName: string;

  // Para tarefas recorrentes
  recordType?: string;
  suggestedTimes?: string[]; // Mantido para compatibilidade
  scheduledTime?: string; // Horário específico desta tarefa
  configId?: string;
  isCompleted?: boolean;
  completedAt?: Date;
  completedBy?: string;
  mealType?: string; // Tipo de refeição (apenas para ALIMENTACAO)

  // Para eventos agendados
  eventId?: string;
  eventType?: string;
  scheduledDate?: string; // YYYY-MM-DD (data civil do evento)
  title?: string;
  status?: string;
  description?: string;
}

export interface ScheduledRecordsStats {
  date: string;
  expected: number;
  completed: number;
  pending: number;
  compliancePercentage: number;
}

// Backward compatibility alias (deprecated)
export type MandatoryRecordsStats = ScheduledRecordsStats;

type RecordMatchCandidate = {
  time: string;
  createdAt: Date;
  user?: { name: string } | null;
};

type ExistingDailyRecord = {
  residentId: string;
  type: string;
  time: string;
  data: unknown;
  createdAt: Date;
  user?: { name: string } | null;
};

type ScheduleConfigForTaskMatching = {
  id: string;
  residentId: string;
  recordType: string;
  suggestedTimes: unknown;
  metadata: unknown;
  resident: {
    fullName: string;
  };
};

/**
 * Faz o matching de registros para horários sugeridos sem reutilizar registros.
 * Prioriza match exato por horário e usa fallback para o primeiro registro restante.
 */
export function matchRecordsToSuggestedTimes<T extends RecordMatchCandidate>(
  matchingRecords: T[],
  timesToUse: string[],
): Array<T | undefined> {
  const unmatchedRecords = [...matchingRecords].sort((a, b) => {
    const byTime = a.time.localeCompare(b.time);
    if (byTime !== 0) return byTime;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  return timesToUse.map((scheduledTime) => {
    const exactMatchIndex = unmatchedRecords.findIndex(
      (record) => record.time === scheduledTime,
    );

    const fallbackIndex = exactMatchIndex >= 0
      ? exactMatchIndex
      : unmatchedRecords.length > 0
        ? 0
        : -1;

    return fallbackIndex >= 0
      ? unmatchedRecords.splice(fallbackIndex, 1)[0]
      : undefined;
  });
}

@Injectable()
export class ResidentScheduleTasksService {
  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema)
    private readonly tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  private normalize(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value).trim().toLowerCase();
  }

  private matchesMealType(
    recordType: string,
    expectedMealType: string | undefined,
    recordData: unknown,
  ): boolean {
    if (recordType !== 'ALIMENTACAO' || !expectedMealType) {
      return true;
    }

    const details = (recordData as Record<string, unknown>) || {};
    const rawRecordMealType = details.mealType ?? details.refeicao;
    const normalizedRecordMealType = this.normalize(rawRecordMealType);

    // Fallback compatível: registros sem refeição explícita ainda podem cumprir uma tarefa de alimentação.
    if (!normalizedRecordMealType) {
      return true;
    }

    return normalizedRecordMealType === this.normalize(expectedMealType);
  }

  private buildRecurringTasks(
    configs: ScheduleConfigForTaskMatching[],
    existingRecords: ExistingDailyRecord[],
  ): DailyTask[] {
    const indexedRecords = existingRecords.map((record, index) => ({
      ...record,
      _idx: index,
    }));
    const consumedRecordIndexes = new Set<number>();
    const recurringTasks: DailyTask[] = [];

    for (const config of configs) {
      const metadata = (config.metadata as { mealType?: string } | null) || null;
      const suggestedTimesRaw = Array.isArray(config.suggestedTimes)
        ? config.suggestedTimes
        : [];
      const suggestedTimes = suggestedTimesRaw.map((time) => String(time));
      const timesToUse = suggestedTimes.length > 0 ? suggestedTimes : ['00:00'];

      for (const scheduledTime of timesToUse) {
        const candidates = indexedRecords.filter((record) => {
          if (consumedRecordIndexes.has(record._idx)) return false;
          if (record.residentId !== config.residentId) return false;
          if (record.type !== config.recordType) return false;
          return this.matchesMealType(
            config.recordType,
            metadata?.mealType,
            record.data,
          );
        });

        const [matchingRecord] = matchRecordsToSuggestedTimes(candidates, [
          scheduledTime,
        ]);
        if (matchingRecord) {
          consumedRecordIndexes.add(matchingRecord._idx);
        }

        recurringTasks.push({
          type: 'RECURRING' as const,
          residentId: config.residentId,
          residentName: config.resident.fullName,
          recordType: config.recordType,
          suggestedTimes,
          scheduledTime,
          configId: config.id,
          isCompleted: !!matchingRecord,
          completedAt: matchingRecord?.createdAt,
          completedBy: matchingRecord?.user?.name,
          mealType: metadata?.mealType,
        });
      }
    }

    return recurringTasks;
  }

  /**
   * Buscar tarefas diárias de um residente específico
   */
  async getDailyTasksByResident(
    residentId: string,
    dateStr?: string,
  ): Promise<DailyTask[]> {
    // ✅ Parse da data (usa data atual no timezone do tenant se não informada)
    let targetDateStr: string;
    if (dateStr) {
      targetDateStr = dateStr; // YYYY-MM-DD já fornecido
    } else {
      // Obter tenant para pegar timezone (tabela SHARED)
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: this.tenantContext.tenantId },
        select: { timezone: true },
      });
      targetDateStr = getCurrentDateInTz(tenant?.timezone || DEFAULT_TIMEZONE);
    }

    // ✅ Normalizar data para meio-dia UTC (mesmo padrão usado ao criar registros)
    // Isso garante comparação correta com registros existentes
    const targetDate = parseISO(`${targetDateStr}T12:00:00.000`);
    const _dayOfWeek = targetDate.getDay(); // 0 = Domingo, 6 = Sábado
    const _dayOfMonth = targetDate.getDate(); // 1-31

    // 1. Buscar configurações ativas do residente
    const configs = await this.tenantContext.client.residentScheduleConfig.findMany({
      where: {
        residentId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        resident: {
          select: {
            fullName: true,
          },
        },
      },
    });

    // 2. Filtrar configurações que devem gerar tarefa na data
    const filteredConfigs = configs.filter((config) =>
      this.shouldGenerateTask(config, targetDate),
    );

    // 3. Buscar registros já feitos no dia
    // Usar range query gte/lte pois campo DateTime @db.Date precisa de range para comparação correta
    const existingRecords = await this.tenantContext.client.dailyRecord.findMany({
      where: {
        residentId,
        date: {
          gte: startOfDay(targetDate),
          lte: endOfDay(targetDate),
        },
        deletedAt: null,
      },
      select: {
        residentId: true,
        type: true,
        time: true,
        data: true, // ✅ Buscar data para comparar mealType em ALIMENTACAO
        createdAt: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    // 🔍 DEBUG: Log para verificar se registros estão sendo encontrados
    console.log(
      `[getDailyTasksByResident] Buscando existingRecords para residentId=${residentId}, date=${targetDateStr}, targetDate=${targetDate.toISOString()}`,
    );
    console.log(
      `[getDailyTasksByResident] Encontrados ${existingRecords.length} registros existentes`,
    );
    if (existingRecords.length > 0) {
      console.log(
        `[getDailyTasksByResident] Tipos encontrados: ${existingRecords.map((r) => r.type).join(', ')}`,
      );
    }

    const recurringTasks = this.buildRecurringTasks(
      filteredConfigs as ScheduleConfigForTaskMatching[],
      existingRecords as ExistingDailyRecord[],
    );

    // 4. Buscar eventos agendados para a data
    const events = await this.tenantContext.client.residentScheduledEvent.findMany({
      where: {
        residentId,
        scheduledDate: {
          gte: startOfDay(targetDate),
          lte: endOfDay(targetDate),
        },
        deletedAt: null,
      },
      include: {
        resident: {
          select: {
            fullName: true,
          },
        },
      },
    });

    const eventTasks: DailyTask[] = events.map((event) => ({
      type: 'EVENT' as const,
      residentId: event.residentId,
      residentName: event.resident.fullName,
      eventId: event.id,
      eventType: event.eventType,
      scheduledDate: formatDateOnly(event.scheduledDate),
      scheduledTime: event.scheduledTime,
      title: event.title,
      status: event.status,
      description: event.description || undefined,
    }));

    // 5. Unir e retornar
    return [...recurringTasks, ...eventTasks];
  }

  /**
   * Estatísticas canônicas de registros obrigatórios para uma data.
   * Baseado na mesma geração de tarefas recorrentes do dia.
   */
  async getScheduledRecordsStats(dateStr?: string): Promise<ScheduledRecordsStats> {
    let targetDateStr: string;
    if (dateStr) {
      targetDateStr = dateStr;
    } else {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: this.tenantContext.tenantId },
        select: { timezone: true },
      });
      targetDateStr = getCurrentDateInTz(tenant?.timezone || DEFAULT_TIMEZONE);
    }

    const dailyTasks = await this.getDailyTasks(targetDateStr);
    const recurringTasks = dailyTasks.filter((task) => task.type === 'RECURRING');

    const expected = recurringTasks.length;
    const completed = recurringTasks.filter((task) => task.isCompleted).length;
    const pending = expected - completed;
    const compliancePercentage = expected > 0
      ? Math.round((completed / expected) * 100)
      : 100;

    return {
      date: targetDateStr,
      expected,
      completed,
      pending,
      compliancePercentage,
    };
  }

  /**
   * @deprecated Use getScheduledRecordsStats
   */
  async getMandatoryRecordsStats(dateStr?: string): Promise<ScheduledRecordsStats> {
    return this.getScheduledRecordsStats(dateStr);
  }

  /**
   * Buscar tarefas diárias de todos os residentes do tenant
   */
  async getDailyTasks(
    dateStr?: string,
  ): Promise<DailyTask[]> {
    // ✅ Parse da data (usa data atual no timezone do tenant se não informada)
    let targetDateStr: string;
    if (dateStr) {
      targetDateStr = dateStr; // YYYY-MM-DD já fornecido
    } else {
      // Obter tenant para pegar timezone (tabela SHARED)
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: this.tenantContext.tenantId },
        select: { timezone: true },
      });
      targetDateStr = getCurrentDateInTz(tenant?.timezone || DEFAULT_TIMEZONE);
    }

    // ✅ Normalizar data para meio-dia UTC (mesmo padrão usado ao criar registros)
    const targetDate = parseISO(`${targetDateStr}T12:00:00.000`);
    const _dayOfWeek = targetDate.getDay();
    const _dayOfMonth = targetDate.getDate();

    // 1. Buscar todas as configurações ativas do tenant
    const configs = await this.tenantContext.client.residentScheduleConfig.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      include: {
        resident: {
          select: {
            fullName: true,
          },
        },
      },
    });

    // 2. Buscar TODOS os registros existentes na data para verificar conclusão
    // Usar range query gte/lte pois campo DateTime @db.Date precisa de range para comparação correta
    const existingRecords = await this.tenantContext.client.dailyRecord.findMany({
      where: {
        date: {
          gte: startOfDay(targetDate),
          lte: endOfDay(targetDate),
        },
        deletedAt: null,
      },
      select: {
        residentId: true,
        type: true,
        time: true,
        data: true,
        createdAt: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    console.log(
      `[getDailyTasks] Buscando registros para data=${dateStr}, targetDate=${targetDate.toISOString()}, encontrados=${existingRecords.length}`,
    );
    if (existingRecords.length > 0) {
      console.log(
        `[getDailyTasks] Registros encontrados:`,
        existingRecords.map((r) => ({
          residentId: r.residentId,
          type: r.type,
          mealType: (r.data as Record<string, unknown>)?.mealType,
        })),
      );
    }

    // 3. Filtrar configurações que devem gerar tarefa na data
    // Criar uma tarefa para CADA horário sugerido
    const filteredConfigs = configs.filter((config) => this.shouldGenerateTask(config, targetDate));
    const recurringTasks = this.buildRecurringTasks(
      filteredConfigs as ScheduleConfigForTaskMatching[],
      existingRecords as ExistingDailyRecord[],
    );

    // Log das tarefas retornadas
    console.log(
      `[getDailyTasks] Retornando ${recurringTasks.length} tarefas. Completas: ${recurringTasks.filter((t) => t.isCompleted).length}, Pendentes: ${recurringTasks.filter((t) => !t.isCompleted).length}`,
    );

    // 5. Buscar todos eventos agendados para a data
    const events = await this.tenantContext.client.residentScheduledEvent.findMany({
      where: {
        scheduledDate: {
          gte: startOfDay(targetDate),
          lte: endOfDay(targetDate),
        },
        deletedAt: null,
      },
      include: {
        resident: {
          select: {
            fullName: true,
          },
        },
      },
    });

    const eventTasks: DailyTask[] = events.map((event) => ({
      type: 'EVENT' as const,
      residentId: event.residentId,
      residentName: event.resident.fullName,
      eventId: event.id,
      eventType: event.eventType,
      scheduledDate: formatDateOnly(event.scheduledDate),
      scheduledTime: event.scheduledTime,
      title: event.title,
      status: event.status,
      description: event.description || undefined,
    }));

    // 4. Unir e retornar
    return [...recurringTasks, ...eventTasks];
  }

  /**
   * Verifica se uma configuração deve gerar tarefa na data especificada
   */
  private shouldGenerateTask(
    config: {
      frequency: ScheduleFrequency;
      dayOfWeek: number | null;
      dayOfMonth: number | null;
    },
    targetDate: Date,
  ): boolean {
    const dayOfWeek = targetDate.getDay(); // 0-6
    const dayOfMonth = targetDate.getDate(); // 1-31

    switch (config.frequency) {
      case ScheduleFrequency.DAILY:
        return true;

      case ScheduleFrequency.WEEKLY:
        return config.dayOfWeek === dayOfWeek;

      case ScheduleFrequency.MONTHLY:
        // Obter o último dia do mês atual
        const daysInMonth = new Date(
          targetDate.getFullYear(),
          targetDate.getMonth() + 1,
          0,
        ).getDate();

        // Se config pede dia que não existe no mês (ex: dia 31 em fevereiro),
        // usa o último dia do mês como fallback
        if (config.dayOfMonth! > daysInMonth) {
          // Gera tarefa apenas se hoje for o último dia do mês
          return dayOfMonth === daysInMonth;
        }

        // Caso normal: gera se for exatamente o dia configurado
        return config.dayOfMonth === dayOfMonth;

      default:
        return false;
    }
  }
}
