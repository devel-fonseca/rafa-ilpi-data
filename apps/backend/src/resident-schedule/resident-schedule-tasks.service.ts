import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { parseISO, startOfDay } from 'date-fns';
import { ScheduleFrequency, ScheduledEventStatus } from '@prisma/client';

export interface DailyTask {
  type: 'RECURRING' | 'EVENT';
  residentId: string;
  residentName: string;

  // Para tarefas recorrentes
  recordType?: string;
  suggestedTimes?: string[];
  configId?: string;
  isCompleted?: boolean;
  completedAt?: Date;
  completedBy?: string;
  mealType?: string; // Tipo de refeição (apenas para ALIMENTACAO)

  // Para eventos agendados
  eventId?: string;
  eventType?: string;
  scheduledTime?: string;
  title?: string;
  status?: string;
  description?: string;
}

@Injectable()
export class ResidentScheduleTasksService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * Buscar tarefas diárias de um residente específico
   */
  async getDailyTasksByResident(
    residentId: string,
    tenantId: string,
    dateStr?: string,
  ): Promise<DailyTask[]> {
    // Parse da data (usa data atual se não informada)
    const targetDate = dateStr
      ? parseISO(`${dateStr}T12:00:00.000`)
      : startOfDay(new Date());

    const dayOfWeek = targetDate.getDay(); // 0 = Domingo, 6 = Sábado
    const dayOfMonth = targetDate.getDate(); // 1-31

    // 1. Buscar configurações ativas do residente
    const configs = await this.prisma.residentScheduleConfig.findMany({
      where: {
        tenantId,
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
    const existingRecords = await this.prisma.dailyRecord.findMany({
      where: {
        tenantId,
        residentId,
        date: targetDate,
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
      `[getDailyTasksByResident] Buscando existingRecords para residentId=${residentId}, date=${targetDate}`,
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
    // Mapear tarefas incluindo status de conclusão
    const recurringTasks: DailyTask[] = filteredConfigs.map((config) => {
      const metadata = config.metadata as { mealType?: string } | null;

      // Buscar registro correspondente
      let recordData: { createdAt: Date; createdBy: string } | undefined;

      if (config.recordType === 'ALIMENTACAO' && metadata?.mealType) {
        // Para ALIMENTACAO, verificar se existe registro com mesmo mealType
        const matchingRecord = existingRecords.find(
          (record) =>
            record.type === 'ALIMENTACAO' &&
            (record.data as any)?.mealType === metadata.mealType,
        );

        // 🔍 DEBUG
        console.log(
          `[getDailyTasksByResident] Verificando ALIMENTACAO - mealType=${metadata.mealType}, encontrado=${!!matchingRecord}`,
        );

        if (matchingRecord) {
          recordData = {
            createdAt: matchingRecord.createdAt,
            createdBy: matchingRecord.user.name,
          };
        }
      } else {
        // Para outros tipos, basta verificar o tipo
        const matchingRecord = existingRecords.find(
          (record) => record.type === config.recordType,
        );

        // 🔍 DEBUG
        console.log(
          `[getDailyTasksByResident] Verificando ${config.recordType}, encontrado=${!!matchingRecord}`,
        );

        if (matchingRecord) {
          recordData = {
            createdAt: matchingRecord.createdAt,
            createdBy: matchingRecord.user.name,
          };
        }
      }

      return {
        type: 'RECURRING' as const,
        residentId: config.residentId,
        residentName: config.resident.fullName,
        recordType: config.recordType,
        suggestedTimes: config.suggestedTimes as string[],
        configId: config.id,
        isCompleted: !!recordData,
        completedAt: recordData?.createdAt,
        completedBy: recordData?.createdBy,
        mealType: metadata?.mealType, // Incluir tipo de refeição se disponível
      };
    });

    // 4. Buscar eventos agendados para a data
    const events = await this.prisma.residentScheduledEvent.findMany({
      where: {
        tenantId,
        residentId,
        scheduledDate: targetDate,
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
    tenantId: string,
    dateStr?: string,
  ): Promise<DailyTask[]> {
    // Parse da data (usa data atual se não informada)
    const targetDate = dateStr
      ? parseISO(`${dateStr}T12:00:00.000`)
      : startOfDay(new Date());

    const dayOfWeek = targetDate.getDay();
    const dayOfMonth = targetDate.getDate();

    // 1. Buscar todas as configurações ativas do tenant
    const configs = await this.prisma.residentScheduleConfig.findMany({
      where: {
        tenantId,
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
    const existingRecords = await this.prisma.dailyRecord.findMany({
      where: {
        tenantId,
        date: targetDate,
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
          mealType: (r.data as any)?.mealType,
        })),
      );
    }

    // 3. Filtrar configurações que devem gerar tarefa na data
    const recurringTasks: DailyTask[] = configs
      .filter((config) => this.shouldGenerateTask(config, targetDate))
      .map((config) => {
        const metadata = config.metadata as { mealType?: string } | null;

        // Verificar se existe registro correspondente para este residente
        let recordData: { createdAt: Date; createdBy: string } | undefined;

        if (config.recordType === 'ALIMENTACAO' && metadata?.mealType) {
          // Para ALIMENTACAO, verificar residentId + type + mealType
          const matchingRecord = existingRecords.find(
            (record) =>
              record.residentId === config.residentId &&
              record.type === 'ALIMENTACAO' &&
              (record.data as any)?.mealType === metadata.mealType,
          );

          if (matchingRecord) {
            recordData = {
              createdAt: matchingRecord.createdAt,
              createdBy: matchingRecord.user.name,
            };
          }
        } else {
          // Para outros tipos, verificar residentId + type
          const matchingRecord = existingRecords.find(
            (record) =>
              record.residentId === config.residentId &&
              record.type === config.recordType,
          );

          if (matchingRecord) {
            recordData = {
              createdAt: matchingRecord.createdAt,
              createdBy: matchingRecord.user.name,
            };
          }
        }

        return {
          type: 'RECURRING' as const,
          residentId: config.residentId,
          residentName: config.resident.fullName,
          recordType: config.recordType,
          suggestedTimes: config.suggestedTimes as string[],
          configId: config.id,
          isCompleted: !!recordData,
          completedAt: recordData?.createdAt,
          completedBy: recordData?.createdBy,
          mealType: metadata?.mealType,
        };
      });

    // Log das tarefas retornadas
    console.log(
      `[getDailyTasks] Retornando ${recurringTasks.length} tarefas. Completas: ${recurringTasks.filter((t) => t.isCompleted).length}, Pendentes: ${recurringTasks.filter((t) => !t.isCompleted).length}`,
    );

    // 3. Buscar todos eventos agendados para a data
    const events = await this.prisma.residentScheduledEvent.findMany({
      where: {
        tenantId,
        scheduledDate: targetDate,
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
