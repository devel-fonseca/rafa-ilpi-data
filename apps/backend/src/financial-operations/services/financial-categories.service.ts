import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantContextService } from '../../prisma/tenant-context.service';
import {
  CreateCategoryDto,
  QueryCategoriesDto,
  UpdateCategoryDto,
} from '../dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class FinancialCategoriesService {
  constructor(
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(dto: CreateCategoryDto, userId: string) {
    if (dto.parentCategoryId) {
      const parent = await this.tenantContext.client.financialCategory.findFirst({
        where: {
          id: dto.parentCategoryId,
          tenantId: this.tenantContext.tenantId,
          deletedAt: null,
        },
        select: { id: true, type: true },
      });

      if (!parent) {
        throw new NotFoundException('Categoria pai não encontrada');
      }

      if (parent.type !== dto.type) {
        throw new BadRequestException(
          'Categoria filha deve ter o mesmo tipo da categoria pai',
        );
      }
    }

    try {
      return await this.tenantContext.client.financialCategory.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          name: dto.name,
          description: dto.description,
          type: dto.type,
          parentCategoryId: dto.parentCategoryId,
          isActive: dto.isActive ?? true,
          createdBy: userId,
          updatedBy: userId,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Já existe categoria com este nome');
      }
      throw error;
    }
  }

  async findAll(query: QueryCategoriesDto) {
    return this.tenantContext.client.financialCategory.findMany({
      where: {
        tenantId: this.tenantContext.tenantId,
        deletedAt: null,
        ...(query.type ? { type: query.type } : {}),
        ...(query.activeOnly ? { isActive: true } : {}),
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                { description: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const category = await this.tenantContext.client.financialCategory.findFirst({
      where: {
        id,
        tenantId: this.tenantContext.tenantId,
        deletedAt: null,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    return category;
  }

  async update(id: string, dto: UpdateCategoryDto, userId: string) {
    const current = await this.findOne(id);

    if (current.isSystemDefault) {
      throw new BadRequestException('Categorias padrão do sistema não podem ser editadas');
    }

    if (dto.parentCategoryId && dto.parentCategoryId === id) {
      throw new BadRequestException('Categoria não pode ser pai dela mesma');
    }

    if (dto.parentCategoryId) {
      const parent = await this.tenantContext.client.financialCategory.findFirst({
        where: {
          id: dto.parentCategoryId,
          tenantId: this.tenantContext.tenantId,
          deletedAt: null,
        },
        select: { id: true, type: true },
      });

      if (!parent) {
        throw new NotFoundException('Categoria pai não encontrada');
      }

      if (parent.type !== (dto.type ?? current.type)) {
        throw new BadRequestException(
          'Categoria filha deve ter o mesmo tipo da categoria pai',
        );
      }
    }

    try {
      return await this.tenantContext.client.financialCategory.update({
        where: { id },
        data: {
          ...dto,
          updatedBy: userId,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Já existe categoria com este nome');
      }
      throw error;
    }
  }

  async remove(id: string, userId: string) {
    const current = await this.findOne(id);

    if (current.isSystemDefault) {
      throw new BadRequestException('Categorias padrão do sistema não podem ser removidas');
    }

    const inUse = await this.tenantContext.client.financialTransaction.count({
      where: {
        tenantId: this.tenantContext.tenantId,
        categoryId: id,
        deletedAt: null,
      },
    });

    if (inUse > 0) {
      throw new BadRequestException(
        'Categoria está em uso por transações e não pode ser removida',
      );
    }

    return this.tenantContext.client.financialCategory.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });
  }
}
