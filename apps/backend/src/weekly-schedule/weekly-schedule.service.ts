import {
  Injectable,
  Scope,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { parseISO } from 'date-fns';
import { TenantContextService } from '../prisma/tenant-context.service';
import {
  CreateWeeklyPatternDto,
  UpdateWeeklyPatternDto,
  CreatePatternAssignmentDto,
  UpdatePatternAssignmentDto,
} from './dto';

@Injectable({ scope: Scope.REQUEST })
export class WeeklyScheduleService {
  constructor(private readonly tenantContext: TenantContextService) {}

  /**
   * Criar novo padrão semanal
   * REGRA: Ao criar um novo padrão ativo, desativa o padrão anterior
   */
  async createPattern(
    createDto: CreateWeeklyPatternDto,
    userId: string,
  ) {
    const { name, description, startDate, endDate, numberOfWeeks = 1 } = createDto;

    // Validar numberOfWeeks (1-4)
    if (numberOfWeeks < 1 || numberOfWeeks > 4) {
      throw new BadRequestException('numberOfWeeks deve estar entre 1 e 4');
    }

    // Validar datas
    const start = parseISO(`${startDate}T12:00:00.000`);
    const end = endDate ? parseISO(`${endDate}T12:00:00.000`) : null;

    if (end && end <= start) {
      throw new BadRequestException(
        'A data de término deve ser posterior à data de início',
      );
    }

    // Verificar se já existe padrão ativo
    const activePattern =
      await this.tenantContext.client.weeklySchedulePattern.findFirst({
        where: {
          isActive: true,
          deletedAt: null,
        },
      });

    // Se existe padrão ativo, desativar
    if (activePattern) {
      await this.tenantContext.client.weeklySchedulePattern.update({
        where: { id: activePattern.id },
        data: {
          isActive: false,
          updatedBy: userId,
        },
      });
    }

    // Criar novo padrão (sempre ativo ao criar)
    const pattern =
      await this.tenantContext.client.weeklySchedulePattern.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          name,
          description,
          startDate: start,
          endDate: end,
          numberOfWeeks,
          isActive: true,
          createdBy: userId,
        },
        include: {
          assignments: {
            include: {
              shiftTemplate: true,
              team: true,
            },
            orderBy: [{ dayOfWeek: 'asc' }, { shiftTemplate: { displayOrder: 'asc' } }],
          },
        },
      });

    return pattern;
  }

  /**
   * Buscar padrão ativo atual
   */
  async getActivePattern() {
    const pattern =
      await this.tenantContext.client.weeklySchedulePattern.findFirst({
        where: {
          isActive: true,
          deletedAt: null,
        },
        include: {
          assignments: {
            include: {
              shiftTemplate: true,
              team: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                  isActive: true,
                },
              },
            },
            orderBy: [{ dayOfWeek: 'asc' }, { shiftTemplate: { displayOrder: 'asc' } }],
          },
        },
      });

    if (!pattern) {
      throw new NotFoundException('Nenhum padrão semanal ativo encontrado');
    }

    return pattern;
  }

  /**
   * Buscar padrão por ID
   */
  async findOne(id: string) {
    const pattern =
      await this.tenantContext.client.weeklySchedulePattern.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        include: {
          assignments: {
            include: {
              shiftTemplate: true,
              team: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                  isActive: true,
                },
              },
            },
            orderBy: [{ dayOfWeek: 'asc' }, { shiftTemplate: { displayOrder: 'asc' } }],
          },
        },
      });

    if (!pattern) {
      throw new NotFoundException(
        `Padrão semanal com ID "${id}" não encontrado`,
      );
    }

    return pattern;
  }

  /**
   * Listar todos os padrões (histórico)
   */
  async findAll() {
    const patterns =
      await this.tenantContext.client.weeklySchedulePattern.findMany({
        where: {
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        include: {
          assignments: {
            include: {
              shiftTemplate: true,
              team: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          },
        },
      });

    return patterns;
  }

  /**
   * Atualizar padrão semanal
   */
  async updatePattern(
    id: string,
    updateDto: UpdateWeeklyPatternDto,
    userId: string,
  ) {
    // Verificar se padrão existe
    await this.findOne(id);

    // Se mudando para ativo, desativar outros
    if (updateDto.isActive === true) {
      await this.tenantContext.client.weeklySchedulePattern.updateMany({
        where: {
          id: { not: id },
          isActive: true,
          deletedAt: null,
        },
        data: {
          isActive: false,
          updatedBy: userId,
        },
      });
    }

    // Validar datas se fornecidas
    if (updateDto.startDate || updateDto.endDate) {
      const current = await this.tenantContext.client.weeklySchedulePattern.findUnique({
        where: { id },
      });

      const start = updateDto.startDate ? new Date(updateDto.startDate) : current!.startDate;
      const end = updateDto.endDate ? new Date(updateDto.endDate) : current!.endDate;

      if (end && end <= start) {
        throw new BadRequestException(
          'A data de término deve ser posterior à data de início',
        );
      }
    }

    // Atualizar padrão
    const updated =
      await this.tenantContext.client.weeklySchedulePattern.update({
        where: { id },
        data: {
          ...updateDto,
          startDate: updateDto.startDate ? new Date(updateDto.startDate) : undefined,
          endDate: updateDto.endDate ? new Date(updateDto.endDate) : undefined,
          updatedBy: userId,
        },
        include: {
          assignments: {
            include: {
              shiftTemplate: true,
              team: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
            orderBy: [{ dayOfWeek: 'asc' }, { shiftTemplate: { displayOrder: 'asc' } }],
          },
        },
      });

    return updated;
  }

  /**
   * Deletar padrão semanal (soft delete)
   */
  async remove(id: string, userId: string) {
    // Verificar se padrão existe
    const pattern = await this.findOne(id);

    // Não permitir deletar padrão ativo
    if (pattern.isActive) {
      throw new BadRequestException(
        'Não é possível deletar o padrão semanal ativo. Desative-o primeiro.',
      );
    }

    // Soft delete
    await this.tenantContext.client.weeklySchedulePattern.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });

    return { message: 'Padrão semanal deletado com sucesso' };
  }

  /**
   * Criar assignment (designar equipe a um dia+turno)
   */
  async createAssignment(
    patternId: string,
    createDto: CreatePatternAssignmentDto,
    userId: string,
  ) {
    const { weekNumber = 0, dayOfWeek, shiftTemplateId, teamId } = createDto;

    // Verificar se padrão existe
    const pattern = await this.findOne(patternId);

    // Validar weekNumber vs numberOfWeeks
    if (weekNumber >= pattern.numberOfWeeks) {
      throw new BadRequestException(
        `weekNumber ${weekNumber} inválido. O padrão tem apenas ${pattern.numberOfWeeks} semana(s) (0-${pattern.numberOfWeeks - 1})`,
      );
    }

    // Verificar se ShiftTemplate existe e está habilitado
    const shiftTemplate =
      await this.tenantContext.client.shiftTemplate.findUnique({
        where: { id: shiftTemplateId },
      });

    if (!shiftTemplate || !shiftTemplate.isActive) {
      throw new NotFoundException(
        `Turno com ID "${shiftTemplateId}" não encontrado ou inativo`,
      );
    }

    // Buscar config do tenant separadamente (evita erro de JOIN em multi-tenancy)
    const tenantConfig =
      await this.tenantContext.client.tenantShiftConfig.findFirst({
        where: {
          shiftTemplateId,
          tenantId: this.tenantContext.tenantId,
          deletedAt: null,
        },
      });

    if (tenantConfig && !tenantConfig.isEnabled) {
      throw new BadRequestException(
        `Turno "${shiftTemplate.name}" está desabilitado para este tenant`,
      );
    }

    // Se teamId fornecido, verificar se equipe existe e está ativa
    if (teamId) {
      const team = await this.tenantContext.client.team.findFirst({
        where: {
          id: teamId,
          deletedAt: null,
        },
      });

      if (!team) {
        throw new NotFoundException(`Equipe com ID "${teamId}" não encontrada`);
      }

      if (!team.isActive) {
        throw new BadRequestException(
          `Equipe "${team.name}" está inativa e não pode ser designada`,
        );
      }
    }

    // Verificar se já existe assignment para este weekNumber+dia+turno
    const existing =
      await this.tenantContext.client.weeklySchedulePatternAssignment.findFirst(
        {
          where: {
            patternId,
            weekNumber,
            dayOfWeek,
            shiftTemplateId,
          },
        },
      );

    if (existing) {
      throw new ConflictException(
        `Já existe uma designação para Semana ${weekNumber + 1}, ${this.getDayName(dayOfWeek)} no turno ${shiftTemplate.name}`,
      );
    }

    // Criar assignment
    const assignment =
      await this.tenantContext.client.weeklySchedulePatternAssignment.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          patternId,
          weekNumber,
          dayOfWeek,
          shiftTemplateId,
          teamId: teamId || null,
          createdBy: userId,
        },
        include: {
          shiftTemplate: true,
          team: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      });

    return assignment;
  }

  /**
   * Atualizar assignment (trocar equipe)
   */
  async updateAssignment(
    assignmentId: string,
    updateDto: UpdatePatternAssignmentDto,
    userId: string,
  ) {
    // Verificar se assignment existe
    const assignment =
      await this.tenantContext.client.weeklySchedulePatternAssignment.findUnique(
        {
          where: { id: assignmentId },
          include: {
            shiftTemplate: true,
          },
        },
      );

    if (!assignment) {
      throw new NotFoundException(
        `Assignment com ID "${assignmentId}" não encontrado`,
      );
    }

    // Se teamId fornecido, verificar se equipe existe e está ativa
    if (updateDto.teamId) {
      const team = await this.tenantContext.client.team.findFirst({
        where: {
          id: updateDto.teamId,
          deletedAt: null,
        },
      });

      if (!team) {
        throw new NotFoundException(
          `Equipe com ID "${updateDto.teamId}" não encontrada`,
        );
      }

      if (!team.isActive) {
        throw new BadRequestException(
          `Equipe "${team.name}" está inativa e não pode ser designada`,
        );
      }
    }

    // Atualizar assignment
    const updated =
      await this.tenantContext.client.weeklySchedulePatternAssignment.update({
        where: { id: assignmentId },
        data: {
          teamId: updateDto.teamId === null ? null : updateDto.teamId,
          updatedBy: userId,
        },
        include: {
          shiftTemplate: true,
          team: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      });

    return updated;
  }

  /**
   * Deletar assignment
   */
  async removeAssignment(assignmentId: string) {
    // Verificar se assignment existe
    const assignment =
      await this.tenantContext.client.weeklySchedulePatternAssignment.findUnique(
        {
          where: { id: assignmentId },
        },
      );

    if (!assignment) {
      throw new NotFoundException(
        `Assignment com ID "${assignmentId}" não encontrado`,
      );
    }

    // Hard delete (não é soft delete)
    await this.tenantContext.client.weeklySchedulePatternAssignment.delete({
      where: { id: assignmentId },
    });

    return { message: 'Assignment deletado com sucesso' };
  }

  /**
   * Helper: Retornar nome do dia da semana
   */
  private getDayName(dayOfWeek: number): string {
    const days = [
      'Domingo',
      'Segunda-feira',
      'Terça-feira',
      'Quarta-feira',
      'Quinta-feira',
      'Sexta-feira',
      'Sábado',
    ];
    return days[dayOfWeek] || 'Dia inválido';
  }
}
