import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { FilesService } from '../files/files.service';
import {
  CreateBelongingDto,
  UpdateBelongingDto,
  QueryBelongingDto,
  ChangeStatusDto,
} from './dto';
import {
  BelongingAction,
  BelongingStatus,
  Prisma,
} from '@prisma/client';

/**
 * Serviço de gestão de pertences de residentes
 *
 * Responsável por:
 * - CRUD de pertences individuais
 * - Auditoria completa (histórico de alterações)
 * - Soft delete com preservação de dados
 * - Filtros e estatísticas por categoria/status
 */
@Injectable()
export class ResidentBelongingsService {
  private readonly logger = new Logger(ResidentBelongingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly filesService: FilesService,
  ) {}

  /**
   * Criar novo pertence
   */
  async create(
    residentId: string,
    userId: string,
    dto: CreateBelongingDto,
  ) {
    this.logger.log(`Criando pertence para residente ${residentId}`);

    // Validar residente
    const resident = await this.tenantContext.client.resident.findFirst({
      where: { id: residentId, deletedAt: null },
      select: { id: true, fullName: true },
    });

    if (!resident) {
      throw new NotFoundException('Residente não encontrado');
    }

    const belongingId = crypto.randomUUID();

    const belonging = await this.tenantContext.client.$transaction(async (tx) => {
      const created = await tx.residentBelonging.create({
        data: {
          id: belongingId,
          tenantId: this.tenantContext.tenantId,
          residentId,
          category: dto.category,
          description: dto.description,
          brandModel: dto.brandModel,
          quantity: dto.quantity ?? 1,
          conservationState: dto.conservationState,
          identification: dto.identification,
          declaredValue: dto.declaredValue,
          storageLocation: dto.storageLocation,
          entryDate: new Date(dto.entryDate),
          deliveredBy: dto.deliveredBy,
          receivedBy: dto.receivedBy,
          notes: dto.notes,
          status: BelongingStatus.EM_GUARDA,
          createdBy: userId,
        },
      });

      // Criar histórico
      await tx.belongingHistory.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          belongingId: created.id,
          action: BelongingAction.CREATED,
          reason: null,
          previousData: Prisma.JsonNull,
          newData: created as unknown as Prisma.InputJsonValue,
          changedFields: [],
          changedBy: userId,
        },
      });

      return created;
    });

    this.logger.log(`Pertence ${belongingId} criado com sucesso`);
    return belonging;
  }

  /**
   * Listar pertences de um residente com filtros
   */
  async findAll(residentId: string, query: QueryBelongingDto) {
    // Validar residente
    const resident = await this.tenantContext.client.resident.findFirst({
      where: { id: residentId, deletedAt: null },
      select: { id: true },
    });

    if (!resident) {
      throw new NotFoundException('Residente não encontrado');
    }

    const where: Prisma.ResidentBelongingWhereInput = {
      residentId,
      ...(query.includeDeleted ? {} : { deletedAt: null }),
      ...(query.category && { category: query.category }),
      ...(query.status && { status: query.status }),
      ...(query.entryDateFrom && {
        entryDate: { gte: new Date(query.entryDateFrom) },
      }),
      ...(query.entryDateTo && {
        entryDate: { lte: new Date(query.entryDateTo) },
      }),
      ...(query.search && {
        OR: [
          { description: { contains: query.search, mode: 'insensitive' } },
          { identification: { contains: query.search, mode: 'insensitive' } },
          { brandModel: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.tenantContext.client.residentBelonging.findMany({
        where,
        orderBy: { [query.sortBy || 'entryDate']: query.sortOrder || 'desc' },
        skip: ((query.page || 1) - 1) * (query.limit || 20),
        take: query.limit || 20,
        include: {
          creator: { select: { id: true, name: true } },
          updater: { select: { id: true, name: true } },
        },
      }),
      this.tenantContext.client.residentBelonging.count({ where }),
    ]);

    // Gerar URLs assinadas para fotos
    const itemsWithUrls = await Promise.all(
      items.map(async (item) => {
        if (item.photoUrl) {
          const photoUrl = await this.filesService.getFileUrl(item.photoUrl);
          return { ...item, photoUrl };
        }
        return item;
      }),
    );

    return {
      items: itemsWithUrls,
      total,
      page: query.page || 1,
      limit: query.limit || 20,
      totalPages: Math.ceil(total / (query.limit || 20)),
    };
  }

  /**
   * Buscar pertence por ID
   */
  async findOne(belongingId: string) {
    const belonging = await this.tenantContext.client.residentBelonging.findFirst({
      where: { id: belongingId, deletedAt: null },
      include: {
        resident: { select: { id: true, fullName: true } },
        creator: { select: { id: true, name: true } },
        updater: { select: { id: true, name: true } },
        entryTerm: { select: { id: true, termNumber: true, type: true } },
        exitTerm: { select: { id: true, termNumber: true, type: true } },
      },
    });

    if (!belonging) {
      throw new NotFoundException('Pertence não encontrado');
    }

    // Gerar URL assinada para foto
    if (belonging.photoUrl) {
      const photoUrl = await this.filesService.getFileUrl(belonging.photoUrl);
      return { ...belonging, photoUrl };
    }

    return belonging;
  }

  /**
   * Atualizar pertence
   */
  async update(
    belongingId: string,
    userId: string,
    dto: UpdateBelongingDto,
  ) {
    const current = await this.tenantContext.client.residentBelonging.findFirst({
      where: { id: belongingId, deletedAt: null },
    });

    if (!current) {
      throw new NotFoundException('Pertence não encontrado');
    }

    // Não permitir edição de itens que já saíram
    if (current.status !== BelongingStatus.EM_GUARDA) {
      throw new BadRequestException(
        'Não é possível editar pertences que não estão em guarda',
      );
    }

    const changedFields: string[] = [];
    const updates: Prisma.ResidentBelongingUpdateInput = {
      updater: { connect: { id: userId } },
    };

    // Detectar campos alterados
    if (dto.description && dto.description !== current.description) {
      changedFields.push('description');
      updates.description = dto.description;
    }

    if (dto.brandModel !== undefined && dto.brandModel !== current.brandModel) {
      changedFields.push('brandModel');
      updates.brandModel = dto.brandModel;
    }

    if (dto.quantity !== undefined && dto.quantity !== current.quantity) {
      changedFields.push('quantity');
      updates.quantity = dto.quantity;
    }

    if (dto.conservationState && dto.conservationState !== current.conservationState) {
      changedFields.push('conservationState');
      updates.conservationState = dto.conservationState;
    }

    if (dto.identification !== undefined && dto.identification !== current.identification) {
      changedFields.push('identification');
      updates.identification = dto.identification;
    }

    if (dto.declaredValue !== undefined && Number(dto.declaredValue) !== Number(current.declaredValue)) {
      changedFields.push('declaredValue');
      updates.declaredValue = dto.declaredValue;
    }

    if (dto.storageLocation !== undefined && dto.storageLocation !== current.storageLocation) {
      changedFields.push('storageLocation');
      updates.storageLocation = dto.storageLocation;
    }

    if (dto.notes !== undefined && dto.notes !== current.notes) {
      changedFields.push('notes');
      updates.notes = dto.notes;
    }

    if (changedFields.length === 0) {
      return this.findOne(belongingId);
    }

    const updated = await this.tenantContext.client.$transaction(async (tx) => {
      const updatedBelonging = await tx.residentBelonging.update({
        where: { id: belongingId },
        data: updates,
      });

      await tx.belongingHistory.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          belongingId,
          action: BelongingAction.UPDATED,
          reason: dto.changeReason,
          previousData: current as unknown as Prisma.InputJsonValue,
          newData: updatedBelonging as unknown as Prisma.InputJsonValue,
          changedFields,
          changedBy: userId,
        },
      });

      return updatedBelonging;
    });

    this.logger.log(`Pertence ${belongingId} atualizado: ${changedFields.join(', ')}`);
    return this.findOne(updated.id);
  }

  /**
   * Alterar status do pertence (DEVOLVIDO, EXTRAVIADO, DESCARTADO)
   */
  async changeStatus(
    belongingId: string,
    userId: string,
    dto: ChangeStatusDto,
  ) {
    const current = await this.tenantContext.client.residentBelonging.findFirst({
      where: { id: belongingId, deletedAt: null },
    });

    if (!current) {
      throw new NotFoundException('Pertence não encontrado');
    }

    // Não permitir voltar para EM_GUARDA (usar outro fluxo se necessário)
    if (dto.status === BelongingStatus.EM_GUARDA) {
      throw new BadRequestException(
        'Não é possível retornar status para EM_GUARDA através desta operação',
      );
    }

    // Não permitir alterar status de item que já saiu
    if (current.status !== BelongingStatus.EM_GUARDA) {
      throw new BadRequestException(
        `Pertence já está com status ${current.status}`,
      );
    }

    const updated = await this.tenantContext.client.$transaction(async (tx) => {
      const updatedBelonging = await tx.residentBelonging.update({
        where: { id: belongingId },
        data: {
          status: dto.status,
          exitDate: dto.exitDate ? new Date(dto.exitDate) : new Date(),
          exitReceivedBy: dto.exitReceivedBy,
          exitReason: dto.reason,
          updater: { connect: { id: userId } },
        },
      });

      await tx.belongingHistory.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          belongingId,
          action: BelongingAction.STATUS_CHANGED,
          reason: dto.reason,
          previousData: current as unknown as Prisma.InputJsonValue,
          newData: updatedBelonging as unknown as Prisma.InputJsonValue,
          changedFields: ['status', 'exitDate', 'exitReceivedBy', 'exitReason'],
          changedBy: userId,
        },
      });

      return updatedBelonging;
    });

    this.logger.log(`Status do pertence ${belongingId} alterado para ${dto.status}`);
    return this.findOne(updated.id);
  }

  /**
   * Upload de foto do pertence
   */
  async uploadPhoto(
    belongingId: string,
    userId: string,
    file: Express.Multer.File,
  ) {
    const current = await this.tenantContext.client.residentBelonging.findFirst({
      where: { id: belongingId, deletedAt: null },
    });

    if (!current) {
      throw new NotFoundException('Pertence não encontrado');
    }

    // Upload da foto
    const upload = await this.filesService.uploadFile(
      this.tenantContext.tenantId,
      file,
      'belongings-photos',
      current.residentId,
    );

    // Deletar foto anterior se existir
    if (current.photoKey) {
      try {
        await this.filesService.deleteFile(current.photoKey);
      } catch (error) {
        this.logger.warn(`Falha ao deletar foto anterior: ${error}`);
      }
    }

    const updated = await this.tenantContext.client.$transaction(async (tx) => {
      const updatedBelonging = await tx.residentBelonging.update({
        where: { id: belongingId },
        data: {
          photoUrl: upload.fileUrl,
          photoKey: upload.fileUrl,
          updater: { connect: { id: userId } },
        },
      });

      await tx.belongingHistory.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          belongingId,
          action: BelongingAction.UPDATED,
          reason: 'Upload de foto do pertence',
          previousData: current as unknown as Prisma.InputJsonValue,
          newData: updatedBelonging as unknown as Prisma.InputJsonValue,
          changedFields: ['photoUrl', 'photoKey'],
          changedBy: userId,
        },
      });

      return updatedBelonging;
    });

    this.logger.log(`Foto do pertence ${belongingId} atualizada`);
    return this.findOne(updated.id);
  }

  /**
   * Deletar pertence (soft delete)
   */
  async delete(belongingId: string, userId: string) {
    const belonging = await this.tenantContext.client.residentBelonging.findFirst({
      where: { id: belongingId, deletedAt: null },
    });

    if (!belonging) {
      throw new NotFoundException('Pertence não encontrado');
    }

    await this.tenantContext.client.$transaction(async (tx) => {
      await tx.residentBelonging.update({
        where: { id: belongingId },
        data: { deletedAt: new Date(), updater: { connect: { id: userId } } },
      });

      await tx.belongingHistory.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          belongingId,
          action: BelongingAction.DELETED,
          reason: null,
          previousData: belonging as unknown as Prisma.InputJsonValue,
          newData: Prisma.JsonNull,
          changedFields: [],
          changedBy: userId,
        },
      });
    });

    this.logger.log(`Pertence ${belongingId} deletado (soft delete)`);
    return { message: 'Pertence deletado com sucesso' };
  }

  /**
   * Buscar histórico de um pertence
   */
  async findHistory(belongingId: string) {
    const belonging = await this.tenantContext.client.residentBelonging.findFirst({
      where: { id: belongingId },
    });

    if (!belonging) {
      throw new NotFoundException('Pertence não encontrado');
    }

    return this.tenantContext.client.belongingHistory.findMany({
      where: { belongingId },
      include: { changer: { select: { id: true, name: true } } },
      orderBy: { changedAt: 'desc' },
    });
  }

  /**
   * Estatísticas de pertences de um residente
   */
  async getStats(residentId: string) {
    // Validar residente
    const resident = await this.tenantContext.client.resident.findFirst({
      where: { id: residentId, deletedAt: null },
      select: { id: true },
    });

    if (!resident) {
      throw new NotFoundException('Residente não encontrado');
    }

    const [byCategory, byStatus, totals] = await Promise.all([
      // Por categoria
      this.tenantContext.client.residentBelonging.groupBy({
        by: ['category'],
        where: { residentId, deletedAt: null },
        _count: { id: true },
      }),
      // Por status
      this.tenantContext.client.residentBelonging.groupBy({
        by: ['status'],
        where: { residentId, deletedAt: null },
        _count: { id: true },
      }),
      // Totais
      this.tenantContext.client.residentBelonging.aggregate({
        where: { residentId, deletedAt: null },
        _count: { id: true },
        _sum: { declaredValue: true, quantity: true },
      }),
    ]);

    return {
      byCategory: byCategory.map((c) => ({
        category: c.category,
        count: c._count.id,
      })),
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      totals: {
        totalItems: totals._count.id,
        totalQuantity: totals._sum.quantity || 0,
        totalDeclaredValue: Number(totals._sum.declaredValue) || 0,
      },
    };
  }
}
