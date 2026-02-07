import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { parseISO, startOfDay, endOfDay } from 'date-fns';
import { ScheduleFrequency } from '@prisma/client';
import { getCurrentDateInTz, DEFAULT_TIMEZONE } from '../utils/date.helpers';

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
  title?: string;
  status?: string;
  description?: string;
}

@Injectable()
export class ResidentScheduleTasksService {
  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema)
    private readonly tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

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
        type: true,
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

    // ✅ CORREÇÃO: Para ALIMENTACAO, precisamos comparar type + mealType
    // ✅ CORREÇÃO 2: Criar uma tarefa para CADA horário sugerido
    const recurringTasks: DailyTask[] = [];

    for (const config of filteredConfigs) {
      const metadata = config.metadata as { mealType?: string } | null;
      const suggestedTimes = (config.suggestedTimes as string[]) || [];
      const timesToUse = suggestedTimes.length > 0 ? suggestedTimes : ['00:00'];

      // Buscar todos os registros correspondentes ao tipo
      let matchingRecords: typeof existingRecords = [];

      if (config.recordType === 'ALIMENTACAO' && metadata?.mealType) {
        // Para ALIMENTACAO com mealType configurado:
        // 1. Primeiro tentar match exato por mealType
        // 2. Se não encontrar, aceitar registros sem mealType definido (fallback)
        const exactMatches = existingRecords.filter(
          (record) =>
            record.type === 'ALIMENTACAO' &&
            (record.data as Record<string, unknown>)?.mealType === metadata.mealType,
        );

        if (exactMatches.length > 0) {
          matchingRecords = exactMatches;
        } else {
          // Fallback: aceitar ALIMENTACAO sem mealType específico
          // Isso permite que registros feitos sem especificar a refeição contem como concluídos
          matchingRecords = existingRecords.filter(
            (record) =>
              record.type === 'ALIMENTACAO' &&
              !(record.data as Record<string, unknown>)?.mealType,
          );
        }
      } else {
        // Para outros tipos, filtrar pelo tipo
        matchingRecords = existingRecords.filter(
          (record) => record.type === config.recordType,
        );
      }

      // 🔍 DEBUG
      console.log(
        `[getDailyTasksByResident] ${config.recordType}${metadata?.mealType ? ` (${metadata.mealType})` : ''}: ${matchingRecords.length} registros, ${timesToUse.length} horários`,
      );

      // Criar uma tarefa para CADA horário
      for (let i = 0; i < timesToUse.length; i++) {
        const scheduledTime = timesToUse[i];
        // Verificar se existe um registro correspondente a este índice
        const matchingRecord = matchingRecords[i];

        recurringTasks.push({
          type: 'RECURRING' as const,
          residentId: config.residentId,
          residentName: config.resident.fullName,
          recordType: config.recordType,
          suggestedTimes: suggestedTimes, // Mantém array completo para referência
          scheduledTime, // Horário específico desta tarefa
          configId: config.id,
          isCompleted: !!matchingRecord,
          completedAt: matchingRecord?.createdAt,
          completedBy: matchingRecord?.user?.name,
          mealType: metadata?.mealType,
        });
      }
    }

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
      scheduledTime: event.scheduledTime,
      title: event.title,
      status: event.status,
      description: event.description || undefined,
    }));

    // 5. Unir e retornar
    return [...recurringTasks, ...eventTasks];
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
    const recurringTasks: DailyTask[] = [];

    for (const config of filteredConfigs) {
      const metadata = config.metadata as { mealType?: string } | null;
      const suggestedTimes = (config.suggestedTimes as string[]) || [];
      const timesToUse = suggestedTimes.length > 0 ? suggestedTimes : ['00:00'];

      // Buscar todos os registros correspondentes ao tipo para este residente
      let matchingRecords: typeof existingRecords = [];

      if (config.recordType === 'ALIMENTACAO' && metadata?.mealType) {
        // Para ALIMENTACAO com mealType configurado:
        // 1. Primeiro tentar match exato por mealType
        // 2. Se não encontrar, aceitar registros sem mealType definido (fallback)
        const exactMatches = existingRecords.filter(
          (record) =>
            record.residentId === config.residentId &&
            record.type === 'ALIMENTACAO' &&
            (record.data as Record<string, unknown>)?.mealType === metadata.mealType,
        );

        if (exactMatches.length > 0) {
          matchingRecords = exactMatches;
        } else {
          // Fallback: aceitar ALIMENTACAO sem mealType específico
          matchingRecords = existingRecords.filter(
            (record) =>
              record.residentId === config.residentId &&
              record.type === 'ALIMENTACAO' &&
              !(record.data as Record<string, unknown>)?.mealType,
          );
        }
      } else {
        // Para outros tipos, filtrar por residentId + type
        matchingRecords = existingRecords.filter(
          (record) =>
            record.residentId === config.residentId &&
            record.type === config.recordType,
        );
      }

      // Criar uma tarefa para CADA horário
      for (let i = 0; i < timesToUse.length; i++) {
        const scheduledTime = timesToUse[i];
        // Verificar se existe um registro correspondente a este índice
        const matchingRecord = matchingRecords[i];

        recurringTasks.push({
          type: 'RECURRING' as const,
          residentId: config.residentId,
          residentName: config.resident.fullName,
          recordType: config.recordType,
          suggestedTimes: suggestedTimes,
          scheduledTime,
          configId: config.id,
          isCompleted: !!matchingRecord,
          completedAt: matchingRecord?.createdAt,
          completedBy: matchingRecord?.user?.name,
          mealType: metadata?.mealType,
        });
      }
    }

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
