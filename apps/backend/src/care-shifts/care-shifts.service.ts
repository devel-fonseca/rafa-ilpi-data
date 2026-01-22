import {
  Injectable,
  Scope,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { TenantContextService } from '../prisma/tenant-context.service';
import { ChangeType, SubstitutionType, Prisma } from '@prisma/client';
import { parseISO } from 'date-fns';
import {
  CreateShiftDto,
  UpdateShiftDto,
  ListShiftsQueryDto,
  AssignTeamDto,
  SubstituteTeamDto,
  SubstituteMemberDto,
  AddMemberDto,
} from './dto';

/**
 * Service principal para gerenciamento de plantões (Shifts)
 *
 * VALIDAÇÕES BLOQUEANTES (lançam exceção):
 * 1. Conflito de turno: Usuário não pode estar em 2 turnos no mesmo dia
 * 2. Usuário inativo: Apenas isActive: true podem ser designados
 * 3. PositionCode inválido: Apenas CAREGIVER + profissionais de enfermagem
 * 4. Equipe inativa: Apenas equipes ativas podem ser designadas
 * 5. Membro original não está no plantão (substituição)
 */
@Injectable({ scope: Scope.REQUEST })
export class CareShiftsService {
  constructor(private readonly tenantContext: TenantContextService) {}

  /**
   * Criar plantão manual (ajuste pontual, fora do padrão semanal)
   */
  async create(createDto: CreateShiftDto, userId: string) {
    const { date, shiftTemplateId, teamId, notes } = createDto;

    // Validar se ShiftTemplate existe e está ativo
    const shiftTemplate =
      await this.tenantContext.client.shiftTemplate.findUnique({
        where: { id: shiftTemplateId },
        include: {
          tenantConfigs: {
            where: {
              tenantId: this.tenantContext.tenantId,
              deletedAt: null,
            },
          },
        },
      });

    if (!shiftTemplate || !shiftTemplate.isActive) {
      throw new NotFoundException(
        `Turno com ID "${shiftTemplateId}" não encontrado ou inativo`,
      );
    }

    const tenantConfig = shiftTemplate.tenantConfigs[0];
    if (tenantConfig && !tenantConfig.isEnabled) {
      throw new BadRequestException(
        `Turno "${shiftTemplate.name}" está desabilitado para este tenant`,
      );
    }

    // Verificar se já existe plantão para esta data+turno
    const existing = await this.tenantContext.client.shift.findFirst({
      where: {
        date,
        shiftTemplateId,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Já existe um plantão para ${date} no turno ${shiftTemplate.name}`,
      );
    }

    // Se teamId fornecido, validar equipe
    if (teamId) {
      await this.validateTeam(teamId);
    }

    // Criar plantão
    const shift = await this.tenantContext.client.shift.create({
      data: {
        tenantId: this.tenantContext.tenantId,
        date,
        shiftTemplateId,
        teamId: teamId || null,
        status: teamId ? 'CONFIRMED' : 'SCHEDULED',
        isFromPattern: false, // Criado manualmente
        notes,
        createdBy: userId,
        versionNumber: 1,
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
        members: {
          where: { removedAt: null },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                profile: {
                  select: {
                    positionCode: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Se tem equipe, adicionar membros automaticamente
    if (teamId) {
      await this.assignTeamMembersToShift(shift.id, teamId, userId);
    }

    return this.findOne(shift.id); // Retornar com membros atualizados
  }

  /**
   * Listar plantões de um período
   */
  async findAll(query: ListShiftsQueryDto) {
    const { startDate, endDate, shiftTemplateId, teamId } = query;

    // Converter strings para DateTime (Prisma espera DateTime mesmo para @db.Date)
    const startDateObj = parseISO(`${startDate}T12:00:00.000`);
    const endDateObj = parseISO(`${endDate}T12:00:00.000`);

    const where: Prisma.ShiftWhereInput = {
      date: {
        gte: startDateObj,
        lte: endDateObj,
      },
      deletedAt: null,
    };

    if (shiftTemplateId) {
      where.shiftTemplateId = shiftTemplateId;
    }

    if (teamId) {
      where.teamId = teamId;
    }

    const shifts = await this.tenantContext.client.shift.findMany({
      where,
      orderBy: [{ date: 'asc' }, { shiftTemplate: { displayOrder: 'asc' } }],
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
        members: {
          where: { removedAt: null },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                isActive: true,
                profile: {
                  select: {
                    positionCode: true,
                  },
                },
              },
            },
          },
          orderBy: { assignedAt: 'asc' },
        },
      },
    });

    return shifts;
  }

  /**
   * Buscar plantão por ID
   */
  async findOne(id: string) {
    const shift = await this.tenantContext.client.shift.findFirst({
      where: {
        id,
        deletedAt: null,
      },
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
        members: {
          where: { removedAt: null },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                isActive: true,
                profile: {
                  select: {
                    positionCode: true,
                    phone: true,
                  },
                },
              },
            },
          },
          orderBy: { assignedAt: 'asc' },
        },
        substitutions: {
          include: {
            originalTeam: {
              select: { id: true, name: true },
            },
            newTeam: {
              select: { id: true, name: true },
            },
            originalUser: {
              select: { id: true, name: true },
            },
            newUser: {
              select: { id: true, name: true },
            },
          },
          orderBy: { substitutedAt: 'desc' },
        },
      },
    });

    if (!shift) {
      throw new NotFoundException(`Plantão com ID "${id}" não encontrado`);
    }

    return shift;
  }

  /**
   * Atualizar plantão
   */
  async update(id: string, updateDto: UpdateShiftDto, userId: string) {
    // Verificar se plantão existe
    const shift = await this.findOne(id);

    // Se alterando equipe, validar
    if (updateDto.teamId !== undefined) {
      if (updateDto.teamId) {
        await this.validateTeam(updateDto.teamId);
      }
    }

    // Atualizar plantão
    const updated = await this.tenantContext.client.shift.update({
      where: { id },
      data: {
        ...updateDto,
        updatedBy: userId,
        versionNumber: shift.versionNumber + 1,
      },
    });

    // Criar histórico
    await this.createHistory(
      id,
      userId,
      ChangeType.UPDATE,
      'Atualização de plantão',
      shift as Prisma.InputJsonValue,
      updated as Prisma.InputJsonValue,
    );

    return this.findOne(id);
  }

  /**
   * Deletar plantão (soft delete)
   */
  async remove(id: string, userId: string) {
    // Verificar se plantão existe
    await this.findOne(id);

    // Soft delete
    await this.tenantContext.client.shift.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });

    return { message: 'Plantão deletado com sucesso' };
  }

  /**
   * Designar equipe ao plantão
   */
  async assignTeam(shiftId: string, assignDto: AssignTeamDto, userId: string) {
    const { teamId } = assignDto;

    // Verificar se plantão existe
    const shift = await this.findOne(shiftId);

    // Validar equipe
    await this.validateTeam(teamId);

    // Atualizar plantão (via transação para incluir histórico)
    await this.tenantContext.client.$transaction(async (tx) => {
      // Atualizar shift
      await tx.shift.update({
        where: { id: shiftId },
        data: {
          teamId,
          status: 'CONFIRMED',
          updatedBy: userId,
          versionNumber: shift.versionNumber + 1,
        },
      });

      // Criar histórico
      await this.createHistoryInTransaction(
        tx,
        shiftId,
        userId,
        ChangeType.TEAM_ASSIGNMENT,
        `Equipe designada ao plantão`,
        shift as Prisma.InputJsonValue,
        { ...shift, teamId } as Prisma.InputJsonValue,
      );
    });

    // Adicionar membros da equipe
    await this.assignTeamMembersToShift(shiftId, teamId, userId);

    return this.findOne(shiftId);
  }

  /**
   * Substituir equipe inteira
   */
  async substituteTeam(
    shiftId: string,
    substituteDto: SubstituteTeamDto,
    userId: string,
  ) {
    const { originalTeamId, newTeamId, reason } = substituteDto;

    // Verificar se plantão existe
    const shift = await this.findOne(shiftId);

    // Validar que plantão tem equipe original
    if (shift.teamId !== originalTeamId) {
      throw new BadRequestException(
        'Equipe original não corresponde à equipe do plantão',
      );
    }

    // Validar nova equipe
    await this.validateTeam(newTeamId);

    await this.tenantContext.client.$transaction(async (tx) => {
      // Remover membros da equipe original (soft delete)
      await tx.shiftAssignment.updateMany({
        where: {
          shiftId,
          removedAt: null,
        },
        data: {
          removedBy: userId,
          removedAt: new Date(),
        },
      });

      // Atualizar shift com nova equipe
      await tx.shift.update({
        where: { id: shiftId },
        data: {
          teamId: newTeamId,
          updatedBy: userId,
          versionNumber: shift.versionNumber + 1,
        },
      });

      // Registrar substituição
      await tx.shiftSubstitution.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          shiftId,
          type: SubstitutionType.TEAM_REPLACEMENT,
          reason,
          originalTeamId,
          newTeamId,
          substitutedBy: userId,
        },
      });

      // Criar histórico
      await this.createHistoryInTransaction(
        tx,
        shiftId,
        userId,
        ChangeType.TEAM_SUBSTITUTION,
        `Equipe substituída: ${reason}`,
        shift as Prisma.InputJsonValue,
        { ...shift, teamId: newTeamId } as Prisma.InputJsonValue,
      );
    });

    // Adicionar membros da nova equipe
    await this.assignTeamMembersToShift(shiftId, newTeamId, userId);

    return this.findOne(shiftId);
  }

  /**
   * Substituir membro individual
   *
   * 🚫 VALIDAÇÃO BLOQUEANTE: Conflito de turno no mesmo dia
   */
  async substituteMember(
    shiftId: string,
    substituteDto: SubstituteMemberDto,
    userId: string,
  ) {
    const { originalUserId, newUserId, reason } = substituteDto;

    // Verificar se plantão existe
    const shift = await this.findOne(shiftId);

    // ✅ 1. Validar que usuário original está no plantão
    const originalMember = shift.members.find(
      (m) => m.userId === originalUserId,
    );
    if (!originalMember) {
      throw new BadRequestException(
        'Usuário original não está designado a este plantão',
      );
    }

    // ✅ 2. Buscar novo usuário
    const newUser = await this.tenantContext.client.user.findUnique({
      where: { id: newUserId },
      select: {
        id: true,
        name: true,
        isActive: true,
        profile: {
          select: {
            positionCode: true,
          },
        },
      },
    });

    if (!newUser) {
      throw new NotFoundException(
        `Usuário com ID "${newUserId}" não encontrado`,
      );
    }

    // 🚫 BLOQUEANTE: Usuário inativo
    if (!newUser.isActive) {
      throw new BadRequestException(
        `${newUser.name} está inativo e não pode ser designado a plantões`,
      );
    }

    // 🚫 BLOQUEANTE: PositionCode inadequado
    const allowedPositions = [
      'CAREGIVER',
      'NURSE',
      'NURSING_TECHNICIAN',
      'NURSING_ASSISTANT',
    ];
    if (!allowedPositions.includes(newUser.profile?.positionCode || '')) {
      throw new BadRequestException(
        `${newUser.name} não tem cargo adequado para escalas de cuidados`,
      );
    }

    // 🚫 BLOQUEANTE: Conflito de turno no mesmo dia
    const dateStr = shift.date as unknown as string;
    const conflict = await this.tenantContext.client.shift.findFirst({
      where: {
        date: dateStr,
        deletedAt: null,
        members: {
          some: {
            userId: newUserId,
            removedAt: null,
          },
        },
      },
      include: {
        shiftTemplate: {
          select: { name: true },
        },
      },
    });

    if (conflict) {
      throw new BadRequestException(
        `${newUser.name} já está designado ao turno ${conflict.shiftTemplate.name} no dia ${dateStr}`,
      );
    }

    // ✅ Executar substituição (transação)
    await this.tenantContext.client.$transaction(async (tx) => {
      // Remover original (soft delete)
      await tx.shiftAssignment.update({
        where: { id: originalMember.id },
        data: {
          removedBy: userId,
          removedAt: new Date(),
        },
      });

      // Adicionar novo
      await tx.shiftAssignment.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          shiftId,
          userId: newUserId,
          isFromTeam: false, // Substituição manual
          assignedBy: userId,
        },
      });

      // Registrar substituição
      await tx.shiftSubstitution.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          shiftId,
          type: SubstitutionType.MEMBER_REPLACEMENT,
          reason,
          originalUserId,
          newUserId,
          substitutedBy: userId,
        },
      });

      // Incrementar versão + criar histórico
      await tx.shift.update({
        where: { id: shiftId },
        data: {
          versionNumber: shift.versionNumber + 1,
          updatedBy: userId,
        },
      });

      await this.createHistoryInTransaction(
        tx,
        shiftId,
        userId,
        ChangeType.MEMBER_SUBSTITUTION,
        `Membro substituído: ${reason}`,
        shift as Prisma.InputJsonValue,
        shift as Prisma.InputJsonValue, // Mudança está nos members, não no shift
      );
    });

    return this.findOne(shiftId);
  }

  /**
   * Adicionar membro extra ao plantão
   *
   * 🚫 VALIDAÇÃO BLOQUEANTE: Conflito de turno no mesmo dia
   */
  async addMember(shiftId: string, addDto: AddMemberDto, userId: string) {
    const { userId: memberId, reason } = addDto;

    // Verificar se plantão existe
    const shift = await this.findOne(shiftId);

    // Buscar usuário
    const user = await this.tenantContext.client.user.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        name: true,
        isActive: true,
        profile: {
          select: {
            positionCode: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(
        `Usuário com ID "${memberId}" não encontrado`,
      );
    }

    // 🚫 BLOQUEANTE: Usuário inativo
    if (!user.isActive) {
      throw new BadRequestException(
        `${user.name} está inativo e não pode ser designado a plantões`,
      );
    }

    // 🚫 BLOQUEANTE: PositionCode inadequado
    const allowedPositions = [
      'CAREGIVER',
      'NURSE',
      'NURSING_TECHNICIAN',
      'NURSING_ASSISTANT',
    ];
    if (!allowedPositions.includes(user.profile?.positionCode || '')) {
      throw new BadRequestException(
        `${user.name} não tem cargo adequado para escalas de cuidados`,
      );
    }

    // Verificar se já é membro ativo
    const existingMember = shift.members.find((m) => m.userId === memberId);
    if (existingMember) {
      throw new ConflictException(
        `${user.name} já está designado a este plantão`,
      );
    }

    // 🚫 BLOQUEANTE: Conflito de turno no mesmo dia
    const dateStr = shift.date as unknown as string;
    const conflict = await this.tenantContext.client.shift.findFirst({
      where: {
        date: dateStr,
        deletedAt: null,
        members: {
          some: {
            userId: memberId,
            removedAt: null,
          },
        },
      },
      include: {
        shiftTemplate: {
          select: { name: true },
        },
      },
    });

    if (conflict) {
      throw new BadRequestException(
        `${user.name} já está designado ao turno ${conflict.shiftTemplate.name} no dia ${dateStr}`,
      );
    }

    // Adicionar membro
    await this.tenantContext.client.$transaction(async (tx) => {
      await tx.shiftAssignment.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          shiftId,
          userId: memberId,
          isFromTeam: false, // Adição manual
          assignedBy: userId,
        },
      });

      // Registrar como "substituição" tipo MEMBER_ADDITION
      await tx.shiftSubstitution.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          shiftId,
          type: SubstitutionType.MEMBER_ADDITION,
          reason: reason || 'Reforço de equipe',
          newUserId: memberId,
          substitutedBy: userId,
        },
      });

      // Incrementar versão + criar histórico
      await tx.shift.update({
        where: { id: shiftId },
        data: {
          versionNumber: shift.versionNumber + 1,
          updatedBy: userId,
        },
      });

      await this.createHistoryInTransaction(
        tx,
        shiftId,
        userId,
        ChangeType.MEMBER_ADDITION,
        `Membro adicionado: ${reason || 'Reforço de equipe'}`,
        shift as Prisma.InputJsonValue,
        shift as Prisma.InputJsonValue,
      );
    });

    return this.findOne(shiftId);
  }

  /**
   * Remover membro do plantão
   */
  async removeMember(shiftId: string, memberId: string, userId: string) {
    // Verificar se plantão existe
    const shift = await this.findOne(shiftId);

    // Buscar membro ativo
    const member = shift.members.find((m) => m.userId === memberId);
    if (!member) {
      throw new NotFoundException(
        'Usuário não está designado a este plantão',
      );
    }

    // Soft delete do membro
    await this.tenantContext.client.$transaction(async (tx) => {
      await tx.shiftAssignment.update({
        where: { id: member.id },
        data: {
          removedBy: userId,
          removedAt: new Date(),
        },
      });

      // Incrementar versão + criar histórico
      await tx.shift.update({
        where: { id: shiftId },
        data: {
          versionNumber: shift.versionNumber + 1,
          updatedBy: userId,
        },
      });

      await this.createHistoryInTransaction(
        tx,
        shiftId,
        userId,
        ChangeType.MEMBER_REMOVAL,
        `Membro removido do plantão`,
        shift as Prisma.InputJsonValue,
        shift as Prisma.InputJsonValue,
      );
    });

    return { message: 'Membro removido do plantão com sucesso' };
  }

  /**
   * Buscar histórico de versões de um plantão
   */
  async getHistory(shiftId: string) {
    // Verificar se plantão existe
    await this.findOne(shiftId);

    const history = await this.tenantContext.client.shiftHistory.findMany({
      where: { shiftId },
      orderBy: { changedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return history;
  }

  // ========== MÉTODOS AUXILIARES ==========

  /**
   * Validar se equipe existe e está ativa
   */
  private async validateTeam(teamId: string) {
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
        `Equipe "${team.name}" está inativa e não pode ser designada a plantões`,
      );
    }

    return team;
  }

  /**
   * Adicionar membros de uma equipe ao plantão
   */
  private async assignTeamMembersToShift(
    shiftId: string,
    teamId: string,
    userId: string,
  ) {
    const members = await this.tenantContext.client.teamMember.findMany({
      where: {
        teamId,
        removedAt: null,
      },
    });

    // Buscar usuários dos membros para verificar se estão ativos
    const userIds = members.map((m) => m.userId);
    const users = await this.tenantContext.client.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, isActive: true },
    });

    const activeUserIds = new Set(
      users.filter((u) => u.isActive).map((u) => u.id),
    );

    // Apenas adicionar membros ativos
    const activeMembers = members.filter((m) =>
      activeUserIds.has(m.userId),
    );

    for (const member of activeMembers) {
      await this.tenantContext.client.shiftAssignment.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          shiftId,
          userId: member.userId,
          isFromTeam: true,
          assignedBy: userId,
        },
      });
    }
  }

  /**
   * Criar registro de histórico (fora de transação)
   */
  private async createHistory(
    shiftId: string,
    userId: string,
    changeType: ChangeType,
    changeReason: string,
    previousData: Prisma.InputJsonValue | null,
    newData: Prisma.InputJsonValue,
  ) {
    const shift = await this.tenantContext.client.shift.findUnique({
      where: { id: shiftId },
    });

    await this.tenantContext.client.shiftHistory.create({
      data: {
        tenantId: this.tenantContext.tenantId,
        shiftId,
        versionNumber: shift!.versionNumber,
        changeType,
        changeReason,
        previousData: previousData || Prisma.JsonNull,
        newData: newData || Prisma.JsonNull,
        changedFields: this.getChangedFields(previousData, newData),
        changedBy: userId,
      },
    });
  }

  /**
   * Criar registro de histórico (dentro de transação)
   */
  private async createHistoryInTransaction(
    tx: Prisma.TransactionClient,
    shiftId: string,
    userId: string,
    changeType: ChangeType,
    changeReason: string,
    previousData: Prisma.InputJsonValue | null,
    newData: Prisma.InputJsonValue,
  ) {
    const shift = await tx.shift.findUnique({
      where: { id: shiftId },
    });

    await tx.shiftHistory.create({
      data: {
        tenantId: this.tenantContext.tenantId,
        shiftId,
        versionNumber: shift!.versionNumber,
        changeType,
        changeReason,
        previousData: previousData || Prisma.JsonNull,
        newData: newData || Prisma.JsonNull,
        changedFields: this.getChangedFields(previousData, newData),
        changedBy: userId,
      },
    });
  }

  /**
   * Identificar campos alterados
   */
  private getChangedFields(previousData: Prisma.InputJsonValue | null, newData: Prisma.InputJsonValue): string[] {
    if (!previousData || !newData || typeof previousData !== 'object' || typeof newData !== 'object') return [];
    if (Array.isArray(previousData) || Array.isArray(newData)) return [];

    const fields: string[] = [];
    const allKeys = new Set([
      ...Object.keys(previousData as Record<string, unknown>),
      ...Object.keys(newData as Record<string, unknown>),
    ]);

    const prevObj = previousData as Record<string, unknown>;
    const newObj = newData as Record<string, unknown>;

    for (const key of allKeys) {
      if (prevObj[key] !== newObj[key]) {
        fields.push(key);
      }
    }

    return fields;
  }
}
