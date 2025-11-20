import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDailyRecordDto } from './dto/create-daily-record.dto';
import { UpdateDailyRecordDto } from './dto/update-daily-record.dto';
import { QueryDailyRecordDto } from './dto/query-daily-record.dto';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class DailyRecordsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async create(dto: CreateDailyRecordDto, tenantId: string, userId: string) {
    // Verificar se residente existe e pertence ao tenant
    const resident = await this.prisma.resident.findFirst({
      where: {
        id: dto.residentId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!resident) {
      throw new NotFoundException('Residente não encontrado');
    }

    // Validar formato de hora (HH:mm) - redundante com class-validator, mas garante
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(dto.time)) {
      throw new BadRequestException('Formato de hora inválido. Use HH:mm');
    }

    // Criar registro
    const record = await this.prisma.dailyRecord.create({
      data: {
        type: dto.type as any, // Cast para RecordType
        date: new Date(dto.date),
        time: dto.time,
        data: dto.data as any,
        recordedBy: dto.recordedBy,
        notes: dto.notes,
        tenant: {
          connect: { id: tenantId },
        },
        resident: {
          connect: { id: dto.residentId },
        },
        user: {
          connect: { id: userId },
        },
      },
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
            fotoUrl: true,
          },
        },
      },
    });

    this.logger.info('Registro diário criado', {
      recordId: record.id,
      residentId: dto.residentId,
      type: dto.type,
      tenantId,
      userId,
    });

    return record;
  }

  async findAll(query: QueryDailyRecordDto, tenantId: string) {
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '50');
    const skip = (page - 1) * limit;

    // Construir filtros
    const where: any = {
      tenantId,
      deletedAt: null,
    };

    if (query.residentId) {
      where.residentId = query.residentId;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.date) {
      // Filtrar por data exata
      const date = new Date(query.date);
      where.date = date;
    } else if (query.startDate || query.endDate) {
      // Filtrar por período
      where.date = {};
      if (query.startDate) {
        where.date.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.date.lte = new Date(query.endDate);
      }
    }

    const [records, total] = await Promise.all([
      this.prisma.dailyRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { date: query.sortOrder || 'desc' },
          { time: query.sortOrder || 'desc' },
        ],
        include: {
          resident: {
            select: {
              id: true,
              fullName: true,
              fotoUrl: true,
            },
          },
        },
      }),
      this.prisma.dailyRecord.count({ where }),
    ]);

    return {
      data: records,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, tenantId: string) {
    const record = await this.prisma.dailyRecord.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
            fotoUrl: true,
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('Registro não encontrado');
    }

    return record;
  }

  async findByResidentAndDate(
    residentId: string,
    date: string,
    tenantId: string,
  ) {
    // Verificar se residente existe e pertence ao tenant
    const resident = await this.prisma.resident.findFirst({
      where: {
        id: residentId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!resident) {
      throw new NotFoundException('Residente não encontrado');
    }

    const records = await this.prisma.dailyRecord.findMany({
      where: {
        residentId,
        tenantId,
        date: new Date(date),
        deletedAt: null,
      },
      orderBy: {
        time: 'asc',
      },
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
            fotoUrl: true,
          },
        },
      },
    });

    return records;
  }

  async update(
    id: string,
    dto: UpdateDailyRecordDto,
    tenantId: string,
    userId: string,
  ) {
    // Verificar se registro existe e pertence ao tenant
    const existing = await this.prisma.dailyRecord.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException('Registro não encontrado');
    }

    // Se time foi fornecido, validar formato
    if (dto.time) {
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(dto.time)) {
        throw new BadRequestException('Formato de hora inválido. Use HH:mm');
      }
    }

    // Atualizar registro
    const updated = await this.prisma.dailyRecord.update({
      where: { id },
      data: {
        type: dto.type as any, // Cast para RecordType
        date: dto.date ? new Date(dto.date) : undefined,
        time: dto.time,
        data: dto.data as any,
        recordedBy: dto.recordedBy,
        notes: dto.notes,
      },
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
            fotoUrl: true,
          },
        },
      },
    });

    this.logger.info('Registro diário atualizado', {
      recordId: id,
      tenantId,
      userId,
    });

    return updated;
  }

  async remove(id: string, tenantId: string, userId: string) {
    // Verificar se registro existe e pertence ao tenant
    const existing = await this.prisma.dailyRecord.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException('Registro não encontrado');
    }

    // Soft delete
    await this.prisma.dailyRecord.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    this.logger.info('Registro diário removido (soft delete)', {
      recordId: id,
      tenantId,
      userId,
    });

    return { message: 'Registro removido com sucesso' };
  }

  /**
   * Busca o último registro diário de cada residente do tenant
   * Query otimizada usando SQL RAW para melhor performance
   */
  async findLatestByResidents(tenantId: string) {
    // Query SQL otimizada que busca o último registro de cada residente
    // usando window function DISTINCT ON (mais eficiente que GROUP BY + subquery)
    const latestRecords = await this.prisma.$queryRaw<
      Array<{
        residentId: string;
        type: string;
        date: Date;
        time: string;
        createdAt: Date;
      }>
    >`
      SELECT DISTINCT ON (dr."residentId")
        dr."residentId",
        dr.type,
        dr.date,
        dr.time,
        dr."createdAt"
      FROM daily_records dr
      WHERE dr."tenantId" = ${tenantId}::uuid
        AND dr."deletedAt" IS NULL
      ORDER BY dr."residentId", dr.date DESC, dr.time DESC, dr."createdAt" DESC
    `;

    // Retornar resultado diretamente (já está no formato correto)
    return latestRecords;
  }

  /**
   * Busca todas as datas que possuem registros para um residente em um período (mês)
   * Usado para indicadores no calendário
   */
  async findDatesWithRecordsByResident(
    residentId: string,
    tenantId: string,
    year: number,
    month: number,
  ) {
    // Verificar se residente existe e pertence ao tenant
    const resident = await this.prisma.resident.findFirst({
      where: {
        id: residentId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!resident) {
      throw new NotFoundException('Residente não encontrado');
    }

    // Calcular primeiro e último dia do mês
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0, 23, 59, 59);

    // Buscar datas únicas que têm registros
    const datesWithRecords = await this.prisma.dailyRecord.findMany({
      where: {
        residentId,
        tenantId,
        date: {
          gte: firstDay,
          lte: lastDay,
        },
        deletedAt: null,
      },
      distinct: ['date'],
      select: {
        date: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Retornar apenas as datas em formato YYYY-MM-DD
    return datesWithRecords.map((record) => {
      const date = new Date(record.date);
      return date.toISOString().split('T')[0];
    });
  }

  /**
   * Busca o último registro de Monitoramento Vital de um residente
   * Otimizado para não carregar todos os registros (apenas o mais recente)
   */
  async findLastVitalSign(residentId: string, tenantId: string) {
    // Verificar se residente existe e pertence ao tenant
    const resident = await this.prisma.resident.findFirst({
      where: {
        id: residentId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!resident) {
      throw new NotFoundException('Residente não encontrado');
    }

    const record = await this.prisma.dailyRecord.findFirst({
      where: {
        residentId,
        tenantId,
        type: 'MONITORAMENTO',
        deletedAt: null,
      },
      orderBy: [
        { date: 'desc' },
        { time: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
            fotoUrl: true,
          },
        },
      },
    });

    return record || null;
  }
}
