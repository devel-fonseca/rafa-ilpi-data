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
        createdAt: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    const existingRecordTypesMap = new Map(
      existingRecords.map((record) => [
        record.type,
        { createdAt: record.createdAt, createdBy: record.user.name },
      ]),
    );

    // Mapear tarefas incluindo status de conclusão
    const recurringTasks: DailyTask[] = filteredConfigs.map((config) => {
      const recordData = existingRecordTypesMap.get(config.recordType);
      const metadata = config.metadata as { mealType?: string } | null;

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

    // 2. Filtrar configurações que devem gerar tarefa na data
    const recurringTasks: DailyTask[] = configs
      .filter((config) => this.shouldGenerateTask(config, targetDate))
      .map((config) => {
        const metadata = config.metadata as { mealType?: string } | null;

        return {
          type: 'RECURRING' as const,
          residentId: config.residentId,
          residentName: config.resident.fullName,
          recordType: config.recordType,
          suggestedTimes: config.suggestedTimes as string[],
          configId: config.id,
          mealType: metadata?.mealType, // Incluir tipo de refeição se disponível
        };
      });

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
