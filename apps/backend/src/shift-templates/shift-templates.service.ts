import {
  Injectable,
  Scope,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TenantContextService } from '../prisma/tenant-context.service';
import { UpdateTenantShiftConfigDto } from './dto';

@Injectable({ scope: Scope.REQUEST })
export class ShiftTemplatesService {
  constructor(private readonly tenantContext: TenantContextService) {}

  /**
   * Listar todos os turnos fixos (ShiftTemplate)
   * Inclui configuração do tenant (isEnabled, customName)
   */
  async findAll() {
    try {
      // ✅ CORREÇÃO: ShiftTemplate está em public.shift_templates (tabela SHARED)
      const templates = await this.tenantContext.publicClient.shiftTemplate.findMany(
        {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
      );

      // Buscar configs do tenant (agora está no tenant schema)
      const configs =
        await this.tenantContext.client.tenantShiftConfig.findMany({
          where: {
            tenantId: this.tenantContext.tenantId,
            deletedAt: null,
          },
        });

      // Criar mapa de configs por shiftTemplateId
      const configMap = new Map(
        configs.map((c) => [c.shiftTemplateId, c]),
      );

      // Transformar para incluir config do tenant no nível raiz
      return templates.map((template) => {
        const tenantConfig = configMap.get(template.id) || null;
        return {
          id: template.id,
          type: template.type,
          name: tenantConfig?.customName || template.name,
          startTime: tenantConfig?.customStartTime || template.startTime,
          endTime: tenantConfig?.customEndTime || template.endTime,
          duration: tenantConfig?.customDuration || template.duration,
          displayOrder: template.displayOrder,
          isActive: template.isActive,
          tenantConfig: tenantConfig
            ? {
                id: tenantConfig.id,
                isEnabled: tenantConfig.isEnabled,
                customName: tenantConfig.customName,
                customStartTime: tenantConfig.customStartTime,
                customEndTime: tenantConfig.customEndTime,
                customDuration: tenantConfig.customDuration,
              }
            : {
                id: null,
                isEnabled: true, // Por padrão, todos os turnos estão habilitados
                customName: null,
                customStartTime: null,
                customEndTime: null,
                customDuration: null,
              },
        };
      });
    } catch (error) {
      console.error('Erro ao buscar shift templates:', error);
      throw error;
    }
  }

  /**
   * Buscar turno fixo específico por ID
   */
  async findOne(id: string) {
    // ✅ CORREÇÃO: ShiftTemplate está em public.shift_templates (tabela SHARED)
    const template = await this.tenantContext.publicClient.shiftTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Turno com ID "${id}" não encontrado`);
    }

    if (!template.isActive) {
      throw new BadRequestException(
        `Turno "${template.name}" não está ativo no sistema`,
      );
    }

    // Buscar config do tenant separadamente
    const tenantConfig =
      await this.tenantContext.client.tenantShiftConfig.findFirst({
        where: {
          shiftTemplateId: id,
          tenantId: this.tenantContext.tenantId,
          deletedAt: null,
        },
      });

    return {
      id: template.id,
      type: template.type,
      name: tenantConfig?.customName || template.name,
      startTime: tenantConfig?.customStartTime || template.startTime,
      endTime: tenantConfig?.customEndTime || template.endTime,
      duration: tenantConfig?.customDuration || template.duration,
      displayOrder: template.displayOrder,
      isActive: template.isActive,
      tenantConfig: tenantConfig
        ? {
            id: tenantConfig.id,
            isEnabled: tenantConfig.isEnabled,
            customName: tenantConfig.customName,
            customStartTime: tenantConfig.customStartTime,
            customEndTime: tenantConfig.customEndTime,
            customDuration: tenantConfig.customDuration,
          }
        : {
            id: null,
            isEnabled: true,
            customName: null,
            customStartTime: null,
            customEndTime: null,
            customDuration: null,
          },
    };
  }

  /**
   * Atualizar configuração do tenant para um turno específico
   * (habilitar/desabilitar, ou customizar nome)
   */
  async updateTenantConfig(
    shiftTemplateId: string,
    updateDto: UpdateTenantShiftConfigDto,
    userId: string,
  ) {
    // ✅ CORREÇÃO: ShiftTemplate está em public.shift_templates (tabela SHARED)
    const template = await this.tenantContext.publicClient.shiftTemplate.findUnique({
      where: { id: shiftTemplateId },
    });

    if (!template) {
      throw new NotFoundException(
        `Turno com ID "${shiftTemplateId}" não encontrado`,
      );
    }

    if (!template.isActive) {
      throw new BadRequestException(
        `Turno "${template.name}" não está ativo no sistema`,
      );
    }

    // Buscar config existente do tenant
    const existingConfig =
      await this.tenantContext.client.tenantShiftConfig.findFirst({
        where: {
          tenantId: this.tenantContext.tenantId,
          shiftTemplateId,
          deletedAt: null,
        },
      });

    let config;

    if (existingConfig) {
      // Atualizar config existente
      config = await this.tenantContext.client.tenantShiftConfig.update({
        where: { id: existingConfig.id },
        data: {
          ...updateDto,
          updatedBy: userId,
        },
      });
    } else {
      // Criar novo config
      config = await this.tenantContext.client.tenantShiftConfig.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          shiftTemplateId,
          isEnabled: updateDto.isEnabled ?? true,
          customName: updateDto.customName ?? null,
          customStartTime: updateDto.customStartTime ?? null,
          customEndTime: updateDto.customEndTime ?? null,
          customDuration: updateDto.customDuration ?? null,
          createdBy: userId,
        },
      });
    }

    // Retornar config mesclado com dados do template (busca separada - cross-schema)
    return {
      id: config.id,
      shiftTemplate: {
        id: template.id,
        type: template.type,
        name: config.customName || template.name,
        startTime: config.customStartTime || template.startTime,
        endTime: config.customEndTime || template.endTime,
        duration: config.customDuration || template.duration,
      },
      isEnabled: config.isEnabled,
      customName: config.customName,
      customStartTime: config.customStartTime,
      customEndTime: config.customEndTime,
      customDuration: config.customDuration,
      updatedAt: config.updatedAt,
    };
  }

  /**
   * Buscar apenas turnos habilitados para o tenant
   * (usado em dropdowns de seleção de turno)
   */
  async findEnabledForTenant() {
    // ✅ CORREÇÃO: ShiftTemplate está em public.shift_templates (tabela SHARED)
    const templates = await this.tenantContext.publicClient.shiftTemplate.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    // Buscar configs do tenant separadamente
    const configs =
      await this.tenantContext.client.tenantShiftConfig.findMany({
        where: {
          tenantId: this.tenantContext.tenantId,
          deletedAt: null,
        },
      });

    // Criar mapa de configs por shiftTemplateId
    const configMap = new Map(configs.map((c) => [c.shiftTemplateId, c]));

    // Filtrar apenas habilitados
    return templates
      .filter((template) => {
        const tenantConfig = configMap.get(template.id);
        // Se não existe config, considera habilitado por padrão
        if (!tenantConfig) return true;
        return tenantConfig.isEnabled;
      })
      .map((template) => {
        const tenantConfig = configMap.get(template.id) || null;
        return {
          id: template.id,
          type: template.type,
          name: tenantConfig?.customName || template.name,
          startTime: tenantConfig?.customStartTime || template.startTime,
          endTime: tenantConfig?.customEndTime || template.endTime,
          duration: tenantConfig?.customDuration || template.duration,
        };
      });
  }
}
