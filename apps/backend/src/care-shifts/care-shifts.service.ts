import {
  Injectable,
  Scope,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { TenantContextService } from '../prisma/tenant-context.service';
import {
  ChangeType,
  SubstitutionType,
  Prisma,
  ShiftStatus,
  PositionCode,
} from '@prisma/client';
import {
  parseISO,
  addMinutes,
  isBefore,
  isAfter,
  parse,
  format,
  addDays,
  subDays,
} from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import {
  DEFAULT_TIMEZONE,
  getCurrentDateInTz,
  localToUTC,
  parseDateOnly,
  formatDateOnly,
} from '../utils/date.helpers';
import {
  CreateShiftDto,
  UpdateShiftDto,
  ListShiftsQueryDto,
  AssignTeamDto,
  SubstituteTeamDto,
  SubstituteMemberDto,
  AddMemberDto,
  CreateHandoverDto,
} from './dto';

/**
 * Valores padronizados para TeamMember.role
 */
const TEAM_MEMBER_ROLES = {
  LEADER: 'Líder',
  SUBSTITUTE: 'Suplente',
  MEMBER: 'Membro',
} as const;

/**
 * Tolerância de horário para check-in e registros
 */
const SHIFT_TOLERANCE = {
  BEFORE_START_MINUTES: 0, // Não permitir antes do início
  AFTER_END_MINUTES: 30, // 30 minutos após o fim
} as const;

/**
 * Cargos que podem registrar sem estar de plantão
 */
const BYPASS_POSITIONS: PositionCode[] = [
  PositionCode.NURSE,
  PositionCode.NURSING_COORDINATOR,
  PositionCode.TECHNICAL_MANAGER,
  PositionCode.DOCTOR,
];

/**
 * Cargos que precisam estar de plantão para registrar
 */
const SHIFT_REQUIRED_POSITIONS: PositionCode[] = [
  PositionCode.CAREGIVER,
  PositionCode.NURSING_TECHNICIAN,
  PositionCode.NURSING_ASSISTANT,
];

export interface ShiftRegistrationContext {
  canRegister: boolean;
  reason: string | null;
  positionCode: PositionCode | null;
  hasBypass: boolean;
  isLeaderOrSubstitute: boolean;
  activeShift: Awaited<ReturnType<CareShiftsService['findAll']>>[number] | null;
  currentShift: Awaited<ReturnType<CareShiftsService['findAll']>>[number] | null;
}

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
  private tenantTimezoneCache: string | null = null;

  constructor(private readonly tenantContext: TenantContextService) {}

  private async getTenantTimezone(): Promise<string> {
    if (this.tenantTimezoneCache) {
      return this.tenantTimezoneCache;
    }

    const tenant = await this.tenantContext.publicClient.tenant.findUnique({
      where: { id: this.tenantContext.tenantId },
      select: { timezone: true },
    });

    this.tenantTimezoneCache = tenant?.timezone || DEFAULT_TIMEZONE;
    return this.tenantTimezoneCache;
  }

  /**
   * Enriquecer membros com dados do usuário (busca manual sem FK)
   */
  private async enrichMembersWithUserData(
    members: Prisma.ShiftAssignmentGetPayload<Record<string, never>>[],
  ) {
    if (!members || members.length === 0) return [];

    const userIds = members.map((m) => m.userId);
    const users = await this.tenantContext.client.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        profile: {
          select: { positionCode: true },
        },
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return members.map((member) => ({
      ...member,
      user: userMap.get(member.userId) || null,
    }));
  }

  /**
   * Calcula janela temporal real do plantão, considerando turnos que cruzam meia-noite.
   */
  private buildShiftWindow(
    shiftDate: Date | string,
    startTime: string,
    endTime: string,
    tenantTimezone: string,
  ) {
    // Padrão DATE: sempre normalizar para YYYY-MM-DD antes de combinar com HH:mm.
    const shiftDateStr = formatDateOnly(shiftDate);
    const start = localToUTC(shiftDateStr, startTime, tenantTimezone);
    let end = localToUTC(shiftDateStr, endTime, tenantTimezone);
    const crossesMidnight = end <= start;
    if (crossesMidnight) {
      end = addDays(end, 1);
    }

    return { start, end, crossesMidnight };
  }

  /**
   * Resolve datetime de registro para comparação com janela do plantão.
   * Tradeoff: sem fuso por usuário, segue o padrão local já adotado no módulo.
   */
  private buildRecordDateTime(
    recordDate: Date | string,
    recordTime: string,
    shiftWindow: { start: Date; crossesMidnight: boolean },
    tenantTimezone: string,
  ) {
    const recordDateStr = formatDateOnly(recordDate);
    let recordDateTime = localToUTC(recordDateStr, recordTime, tenantTimezone);

    if (shiftWindow.crossesMidnight && recordDateTime < shiftWindow.start) {
      recordDateTime = addDays(recordDateTime, 1);
    }

    return recordDateTime;
  }

  /**
   * Busca contexto de permissão de registro diário.
   * Reutilizado pelo guard e por endpoint de UI para evitar drift de regra.
   */
  async getRegistrationContext(
    userId: string,
    options?: { date?: string; time?: string },
  ): Promise<ShiftRegistrationContext> {
    const tenantTimezone = await this.getTenantTimezone();
    const userProfile = await this.tenantContext.client.userProfile.findFirst({
      where: { userId },
      select: { positionCode: true },
    });

    if (!userProfile?.positionCode) {
      return {
        canRegister: false,
        reason: 'Seu perfil não tem um cargo definido. Contate o administrador.',
        positionCode: null,
        hasBypass: false,
        isLeaderOrSubstitute: false,
        activeShift: null,
        currentShift: null,
      };
    }

    const positionCode = userProfile.positionCode;
    const hasBypass = BYPASS_POSITIONS.includes(positionCode);
    if (hasBypass) {
      return {
        canRegister: true,
        reason: null,
        positionCode,
        hasBypass: true,
        isLeaderOrSubstitute: false,
        activeShift: null,
        currentShift: null,
      };
    }

    if (!SHIFT_REQUIRED_POSITIONS.includes(positionCode)) {
      return {
        canRegister: true,
        reason: null,
        positionCode,
        hasBypass: false,
        isLeaderOrSubstitute: false,
        activeShift: null,
        currentShift: null,
      };
    }

    const referenceDateStr = parseDateOnly(
      options?.date || getCurrentDateInTz(tenantTimezone),
    );
    const referenceDate = parse(
      `${referenceDateStr} 12:00`,
      'yyyy-MM-dd HH:mm',
      new Date(),
    );
    const recordTime =
      options?.time || formatInTimeZone(new Date(), tenantTimezone, 'HH:mm');

    // Tradeoff: inclui o dia anterior para cobrir turno noturno que cruza meia-noite.
    const startDate = subDays(referenceDate, 1);
    const shifts = await this.findAll({
      startDate: formatDateOnly(startDate),
      endDate: formatDateOnly(referenceDate),
    });

    const userShifts = shifts
      .filter((shift) =>
        shift.members?.some((member) => member.userId === userId && !member.removedAt),
      )
      .filter((shift) =>
        shift.status === ShiftStatus.CONFIRMED ||
        shift.status === ShiftStatus.IN_PROGRESS,
      );

    if (!userShifts.length) {
      return {
        canRegister: false,
        reason: 'Você não está escalado para nenhum plantão hoje.',
        positionCode,
        hasBypass: false,
        isLeaderOrSubstitute: false,
        activeShift: null,
        currentShift: null,
      };
    }

    const now = new Date();
    const inProgressShifts = userShifts.filter(
      (shift) => shift.status === ShiftStatus.IN_PROGRESS,
    );

    let activeShift: ShiftRegistrationContext['activeShift'] = null;
    for (const shift of inProgressShifts) {
      if (!shift.shiftTemplate) continue;

      const shiftDate = shift.date;
      const window = this.buildShiftWindow(
        shiftDate,
        shift.shiftTemplate.startTime,
        shift.shiftTemplate.endTime,
        tenantTimezone,
      );
      const minAllowed = addMinutes(window.start, -SHIFT_TOLERANCE.BEFORE_START_MINUTES);
      const maxAllowed = addMinutes(window.end, SHIFT_TOLERANCE.AFTER_END_MINUTES);
      const recordDateTime = this.buildRecordDateTime(
        referenceDate,
        recordTime,
        window,
        tenantTimezone,
      );

      if (!isBefore(recordDateTime, minAllowed) && !isAfter(recordDateTime, maxAllowed)) {
        activeShift = shift;
        break;
      }
    }

    const currentShift =
      activeShift ||
      inProgressShifts.find((shift) => {
        if (!shift.shiftTemplate) return false;
        const shiftDate = shift.date;
        const window = this.buildShiftWindow(
          shiftDate,
          shift.shiftTemplate.startTime,
          shift.shiftTemplate.endTime,
          tenantTimezone,
        );
        return now >= window.start && now <= addMinutes(window.end, SHIFT_TOLERANCE.AFTER_END_MINUTES);
      }) ||
      userShifts.find((shift) => shift.status === ShiftStatus.CONFIRMED) ||
      null;

    const isLeaderOrSubstitute = currentShift
      ? await this.isUserLeaderOrSubstitute(userId, currentShift.teamId)
      : false;

    if (activeShift) {
      return {
        canRegister: true,
        reason: null,
        positionCode,
        hasBypass: false,
        isLeaderOrSubstitute,
        activeShift,
        currentShift: currentShift || activeShift,
      };
    }

    const confirmedShift = userShifts.find(
      (shift) => shift.status === ShiftStatus.CONFIRMED,
    );
    if (confirmedShift) {
      return {
        canRegister: false,
        reason: 'Seu plantão ainda não foi iniciado. Aguarde o líder fazer o check-in.',
        positionCode,
        hasBypass: false,
        isLeaderOrSubstitute,
        activeShift: null,
        currentShift: confirmedShift,
      };
    }

    return {
      canRegister: false,
      reason: 'Você não tem plantão ativo no momento.',
      positionCode,
      hasBypass: false,
      isLeaderOrSubstitute,
      activeShift: null,
      currentShift,
    };
  }

  /**
   * Criar plantão manual (ajuste pontual, fora do padrão semanal)
   */
  async create(createDto: CreateShiftDto, userId: string) {
    const { date, shiftTemplateId, teamId, notes } = createDto;

    // Validar se ShiftTemplate existe e está ativo (public schema)
    const shiftTemplate =
      await this.tenantContext.publicClient.shiftTemplate.findUnique({
        where: { id: shiftTemplateId },
      });

    if (!shiftTemplate || !shiftTemplate.isActive) {
      throw new NotFoundException(
        `Turno com ID "${shiftTemplateId}" não encontrado ou inativo`,
      );
    }

    // Buscar configuração do tenant separadamente (cross-schema)
    const tenantConfig =
      await this.tenantContext.client.tenantShiftConfig.findFirst({
        where: {
          shiftTemplateId,
          deletedAt: null,
        },
      });

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
        notes,
        createdBy: userId,
        versionNumber: 1,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        members: {
          where: { removedAt: null },
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
      orderBy: [{ date: 'asc' }, { shiftTemplateId: 'asc' }],
      include: {
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
          orderBy: { assignedAt: 'asc' },
        },
        handover: true,
      },
    });

    // Buscar shift templates do public schema
    const shiftTemplateIds = [...new Set(shifts.map((s) => s.shiftTemplateId))];
    const shiftTemplates =
      await this.tenantContext.publicClient.shiftTemplate.findMany({
        where: { id: { in: shiftTemplateIds } },
      });
    const templateMap = new Map(shiftTemplates.map((t) => [t.id, t]));

    // Buscar configurações customizadas do tenant (cross-schema)
    const tenantConfigs =
      await this.tenantContext.client.tenantShiftConfig.findMany({
        where: {
          shiftTemplateId: { in: shiftTemplateIds },
          deletedAt: null,
        },
      });
    const configMap = new Map(tenantConfigs.map((c) => [c.shiftTemplateId, c]));

    const handoverUserIds = Array.from(
      new Set(
        shifts.flatMap((shift) =>
          shift.handover
            ? [shift.handover.handedOverBy, shift.handover.receivedBy].filter(
                (id): id is string => !!id,
              )
            : [],
        ),
      ),
    );
    const handoverUsers =
      handoverUserIds.length > 0
        ? await this.tenantContext.client.user.findMany({
            where: { id: { in: handoverUserIds } },
            select: { id: true, name: true, email: true },
          })
        : [];
    const handoverUserMap = new Map(handoverUsers.map((u) => [u.id, u]));

    // Enriquecer todos os shifts com dados do usuário e shift template (com customizações)
    const enrichedShifts = await Promise.all(
      shifts.map(async (shift) => {
        const template = templateMap.get(shift.shiftTemplateId);
        const config = configMap.get(shift.shiftTemplateId);

        return {
          ...shift,
          shiftTemplate: template
            ? {
                id: template.id,
                type: template.type,
                name: config?.customName || template.name,
                startTime: config?.customStartTime || template.startTime,
                endTime: config?.customEndTime || template.endTime,
                duration: config?.customDuration || template.duration,
                description: template.description,
                isActive: template.isActive,
                displayOrder: template.displayOrder,
              }
            : null,
          handover: shift.handover
            ? {
                ...shift.handover,
                handedOverByUser: handoverUserMap.get(shift.handover.handedOverBy) || null,
                receivedByUser: shift.handover.receivedBy
                  ? handoverUserMap.get(shift.handover.receivedBy) || null
                  : null,
              }
            : null,
          members: await this.enrichMembersWithUserData(shift.members),
        };
      }),
    );

    return enrichedShifts;
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
          },
          orderBy: { substitutedAt: 'desc' },
        },
        handover: true,
      },
    });

    if (!shift) {
      throw new NotFoundException(`Plantão com ID "${id}" não encontrado`);
    }

    // Buscar shift template do public schema (fallback)
    const shiftTemplate =
      await this.tenantContext.publicClient.shiftTemplate.findUnique({
        where: { id: shift.shiftTemplateId },
      });

    // Buscar configuração customizada do tenant (primária)
    const tenantConfig =
      await this.tenantContext.client.tenantShiftConfig.findFirst({
        where: {
          shiftTemplateId: shift.shiftTemplateId,
          deletedAt: null,
        },
      });

    // Enriquecer membros com dados do usuário
    const enrichedMembers = await this.enrichMembersWithUserData(shift.members);
    const handoverUserIds = shift.handover
      ? [shift.handover.handedOverBy, shift.handover.receivedBy].filter(
          (id): id is string => !!id,
        )
      : [];
    const handoverUsers =
      handoverUserIds.length > 0
        ? await this.tenantContext.client.user.findMany({
            where: { id: { in: handoverUserIds } },
            select: { id: true, name: true, email: true },
          })
        : [];
    const handoverUserMap = new Map(handoverUsers.map((u) => [u.id, u]));

    return {
      ...shift,
      shiftTemplate: shiftTemplate
        ? {
            id: shiftTemplate.id,
            type: shiftTemplate.type,
            name: tenantConfig?.customName || shiftTemplate.name,
            startTime: tenantConfig?.customStartTime || shiftTemplate.startTime,
            endTime: tenantConfig?.customEndTime || shiftTemplate.endTime,
            duration: tenantConfig?.customDuration || shiftTemplate.duration,
            description: shiftTemplate.description,
            isActive: shiftTemplate.isActive,
            displayOrder: shiftTemplate.displayOrder,
          }
        : null,
      handover: shift.handover
        ? {
            ...shift.handover,
            handedOverByUser: handoverUserMap.get(shift.handover.handedOverBy) || null,
            receivedByUser: shift.handover.receivedBy
              ? handoverUserMap.get(shift.handover.receivedBy) || null
              : null,
          }
        : null,
      members: enrichedMembers,
    };
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
    const originalMember = await this.tenantContext.client.shiftAssignment.findFirst({
      where: {
        shiftId,
        userId: originalUserId,
        removedAt: null,
      },
    });
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
    const shiftDate = shift.date instanceof Date ? shift.date : new Date(shift.date);
    const conflict = await this.tenantContext.client.shift.findFirst({
      where: {
        date: shiftDate,
        deletedAt: null,
        members: {
          some: {
            userId: newUserId,
            removedAt: null,
          },
        },
      },
    });

    if (conflict) {
      const dateStr = shiftDate.toISOString().split('T')[0];
      throw new BadRequestException(
        `${newUser.name} já está designado a outro turno no dia ${dateStr}`,
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
    const existingMember = await this.tenantContext.client.shiftAssignment.findFirst({
      where: {
        shiftId,
        userId: memberId,
        removedAt: null,
      },
    });
    if (existingMember) {
      throw new ConflictException(
        `${user.name} já está designado a este plantão`,
      );
    }

    // 🚫 BLOQUEANTE: Conflito de turno no mesmo dia
    const shiftDate = shift.date instanceof Date ? shift.date : new Date(shift.date);
    const conflict = await this.tenantContext.client.shift.findFirst({
      where: {
        date: shiftDate,
        deletedAt: null,
        members: {
          some: {
            userId: memberId,
            removedAt: null,
          },
        },
      },
    });

    if (conflict) {
      const dateStr = shiftDate.toISOString().split('T')[0];
      throw new BadRequestException(
        `${user.name} já está designado a outro turno no dia ${dateStr}`,
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
    const member = await this.tenantContext.client.shiftAssignment.findFirst({
      where: {
        shiftId,
        userId: memberId,
        removedAt: null,
      },
    });
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

  /**
   * Criar plantões em lote (bulk create)
   * Usado para designação rápida via calendário com seleção múltipla
   */
  async bulkCreate(
    shifts: Array<{ date: string; shiftTemplateId: string; teamId: string }>,
    userId: string,
  ) {
    const results = {
      created: [] as Array<{ id: string; date: Date; shiftTemplateId: string; teamId: string | null }>,
      skipped: [] as Array<{ date: string; shiftTemplateId: string; reason: string }>,
      errors: [] as Array<{ date: string; shiftTemplateId: string; error: string }>,
    };

    for (const shiftData of shifts) {
      try {
        const { date, shiftTemplateId, teamId } = shiftData;

        // Verificar se já existe plantão para este dia + turno
        const existing = await this.tenantContext.client.shift.findFirst({
          where: {
            date: parseDateOnly(date),
            shiftTemplateId,
            deletedAt: null,
          },
        });

        if (existing) {
          results.skipped.push({
            date,
            shiftTemplateId,
            reason: 'Plantão já existe',
          });
          continue;
        }

        // Validar team
        const team = await this.tenantContext.client.team.findUnique({
          where: { id: teamId },
          include: {
            members: {
              where: { removedAt: null },
              select: { userId: true },
            },
          },
        });

        if (!team) {
          results.errors.push({
            date,
            shiftTemplateId,
            error: 'Equipe não encontrada',
          });
          continue;
        }

        // Criar plantão (CONFIRMED se tem equipe, SCHEDULED caso contrário)
        const shift = await this.tenantContext.client.shift.create({
          data: {
            tenantId: this.tenantContext.tenantId,
            date: parseDateOnly(date),
            shiftTemplateId,
            teamId,
            status: teamId ? 'CONFIRMED' : 'SCHEDULED',
            versionNumber: 1,
            createdBy: userId,
            updatedAt: new Date(),
          },
        });

        // Criar assignments para todos os membros ativos da equipe
        const memberAssignments = team.members.map((member) => ({
          tenantId: this.tenantContext.tenantId,
          shiftId: shift.id,
          userId: member.userId,
          isFromTeam: true,
          assignedBy: userId,
          assignedAt: new Date(),
        }));

        if (memberAssignments.length > 0) {
          await this.tenantContext.client.shiftAssignment.createMany({
            data: memberAssignments,
          });
        }

        // Criar histórico
        await this.tenantContext.client.shiftHistory.create({
          data: {
            tenantId: this.tenantContext.tenantId,
            shiftId: shift.id,
            versionNumber: 1,
            changeType: 'CREATE',
            changeReason: 'Criação em lote via calendário',
            newData: shift as unknown as Prisma.InputJsonValue,
            changedFields: [],
            changedBy: userId,
          },
        });

        results.created.push({
          id: shift.id,
          date: shift.date,
          shiftTemplateId,
          teamId,
        });
      } catch (error) {
        results.errors.push({
          date: shiftData.date,
          shiftTemplateId: shiftData.shiftTemplateId,
          error: error.message || 'Erro desconhecido',
        });
      }
    }

    return results;
  }

  // ========== CHECK-IN E HANDOVER ==========

  /**
   * Fazer check-in do plantão (transição CONFIRMED → IN_PROGRESS)
   *
   * Regras:
   * 1. Plantão deve estar no status CONFIRMED
   * 2. Usuário deve ser LEADER ou SUBSTITUTE da equipe
   * 3. Não pode fazer check-in antes do horário de início do plantão
   */
  async checkIn(shiftId: string, userId: string) {
    // 1. Buscar plantão com dados necessários
    const shift = await this.tenantContext.client.shift.findFirst({
      where: {
        id: shiftId,
        deletedAt: null,
      },
      include: {
        members: {
          where: { removedAt: null },
        },
        team: true,
      },
    });

    if (!shift) {
      throw new NotFoundException(`Plantão com ID "${shiftId}" não encontrado`);
    }

    // 2. Validar status
    if (shift.status !== ShiftStatus.CONFIRMED) {
      throw new BadRequestException(
        `Check-in só pode ser feito em plantões CONFIRMED. Status atual: ${shift.status}`,
      );
    }

    // 3. Validar que usuário está designado ao plantão
    const userMember = shift.members.find((m) => m.userId === userId);
    if (!userMember) {
      throw new ForbiddenException(
        'Você não está designado a este plantão',
      );
    }

    // 4. Verificar se usuário é LEADER ou SUBSTITUTE na equipe
    const isLeaderOrSubstitute = await this.isUserLeaderOrSubstitute(
      userId,
      shift.teamId,
    );

    if (!isLeaderOrSubstitute) {
      throw new ForbiddenException(
        'Apenas o Líder ou Suplente pode fazer check-in do plantão',
      );
    }

    // 5. Buscar horários do turno (shift template)
    const shiftTemplate =
      await this.tenantContext.publicClient.shiftTemplate.findUnique({
        where: { id: shift.shiftTemplateId },
      });

    if (!shiftTemplate) {
      throw new NotFoundException('Template de turno não encontrado');
    }

    // 6. Validar horário (não pode ser antes do início)
    const now = new Date();
    const tenantTimezone = await this.getTenantTimezone();

    // Construir datetime do início do plantão
    const shiftDate = shift.date;
    const shiftDateStr = formatDateOnly(shiftDate);
    const shiftStartDateTime = localToUTC(
      shiftDateStr,
      shiftTemplate.startTime,
      tenantTimezone,
    );

    if (isBefore(now, shiftStartDateTime)) {
      throw new BadRequestException(
        `Check-in não pode ser feito antes do início do plantão (${shiftTemplate.startTime})`,
      );
    }

    // 7. Atualizar plantão para IN_PROGRESS
    const updated = await this.tenantContext.client.shift.update({
      where: { id: shiftId },
      data: {
        status: ShiftStatus.IN_PROGRESS,
        checkedInAt: now,
        checkedInBy: userId,
        updatedBy: userId,
        versionNumber: shift.versionNumber + 1,
      },
    });

    // 8. Criar histórico
    await this.createHistory(
      shiftId,
      userId,
      ChangeType.UPDATE,
      'Check-in do plantão realizado',
      shift as Prisma.InputJsonValue,
      updated as Prisma.InputJsonValue,
    );

    return this.findOne(shiftId);
  }

  /**
   * Verificar se usuário é Líder ou Suplente da equipe
   */
  private async isUserLeaderOrSubstitute(
    userId: string,
    teamId: string | null,
  ): Promise<boolean> {
    if (!teamId) return false;

    const teamMember = await this.tenantContext.client.teamMember.findFirst({
      where: {
        teamId,
        userId,
        removedAt: null,
      },
      select: { role: true },
    });

    if (!teamMember) return false;

    return (
      teamMember.role === TEAM_MEMBER_ROLES.LEADER ||
      teamMember.role === TEAM_MEMBER_ROLES.SUBSTITUTE
    );
  }

  /**
   * Fazer passagem de plantão (handover) - transição IN_PROGRESS → COMPLETED
   *
   * Regras:
   * 1. Plantão deve estar no status IN_PROGRESS
   * 2. Usuário deve ser LEADER ou SUBSTITUTE da equipe
   * 3. Relatório é obrigatório (mínimo 50 caracteres)
   * 4. Pode ser feito até 30 minutos após o fim do plantão
   */
  async handover(shiftId: string, dto: CreateHandoverDto, userId: string) {
    // 1. Buscar plantão com dados necessários
    const shift = await this.tenantContext.client.shift.findFirst({
      where: {
        id: shiftId,
        deletedAt: null,
      },
      include: {
        members: {
          where: { removedAt: null },
        },
        team: true,
      },
    });

    if (!shift) {
      throw new NotFoundException(`Plantão com ID "${shiftId}" não encontrado`);
    }

    // 2. Validar status
    if (shift.status !== ShiftStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Passagem de plantão só pode ser feita em plantões IN_PROGRESS. Status atual: ${shift.status}`,
      );
    }

    // 3. Validar que usuário está designado ao plantão
    const userMember = shift.members.find((m) => m.userId === userId);
    if (!userMember) {
      throw new ForbiddenException(
        'Você não está designado a este plantão',
      );
    }

    // 4. Verificar se usuário é LEADER ou SUBSTITUTE na equipe
    const isLeaderOrSubstitute = await this.isUserLeaderOrSubstitute(
      userId,
      shift.teamId,
    );

    if (!isLeaderOrSubstitute) {
      throw new ForbiddenException(
        'Apenas o Líder ou Suplente pode fazer a passagem de plantão',
      );
    }

    // 5. Buscar horários do turno (shift template)
    const shiftTemplate =
      await this.tenantContext.publicClient.shiftTemplate.findUnique({
        where: { id: shift.shiftTemplateId },
      });

    if (!shiftTemplate) {
      throw new NotFoundException('Template de turno não encontrado');
    }

    // 6. Validar horário (tolerância de 30min após fim)
    const now = new Date();
    const tenantTimezone = await this.getTenantTimezone();
    const shiftDate = shift.date;
    const { end: shiftEndDateTime } = this.buildShiftWindow(
      shiftDate,
      shiftTemplate.startTime,
      shiftTemplate.endTime,
      tenantTimezone,
    );

    const maxAllowedTime = addMinutes(shiftEndDateTime, SHIFT_TOLERANCE.AFTER_END_MINUTES);

    if (isAfter(now, maxAllowedTime)) {
      throw new BadRequestException(
        `Passagem de plantão só pode ser feita até ${SHIFT_TOLERANCE.AFTER_END_MINUTES} minutos após o fim do turno (${shiftTemplate.endTime})`,
      );
    }

    // 7. Gerar snapshot de atividades do turno
    const activitiesSnapshot = await this.generateActivitiesSnapshot(shift.id, shiftDate);

    // 8. Criar transação para handover + atualização do shift
    await this.tenantContext.client.$transaction(async (tx) => {
      // Criar registro de handover
      await tx.shiftHandover.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          shiftId: shift.id,
          handedOverBy: userId,
          receivedBy: dto.receivedBy || null,
          report: dto.report,
          activitiesSnapshot: activitiesSnapshot as Prisma.InputJsonValue,
        },
      });

      // Atualizar plantão para COMPLETED
      await tx.shift.update({
        where: { id: shiftId },
        data: {
          status: ShiftStatus.COMPLETED,
          updatedBy: userId,
          versionNumber: shift.versionNumber + 1,
        },
      });

      // Criar histórico
      await this.createHistoryInTransaction(
        tx,
        shiftId,
        userId,
        ChangeType.UPDATE,
        'Passagem de plantão realizada',
        shift as Prisma.InputJsonValue,
        { ...shift, status: ShiftStatus.COMPLETED } as Prisma.InputJsonValue,
      );
    });

    return this.findOne(shiftId);
  }

  /**
   * Buscar passagem de plantão (handover) de um plantão específico
   */
  async getHandover(shiftId: string) {
    // Verificar se plantão existe
    const shift = await this.tenantContext.client.shift.findFirst({
      where: {
        id: shiftId,
        deletedAt: null,
      },
    });

    if (!shift) {
      throw new NotFoundException(`Plantão com ID "${shiftId}" não encontrado`);
    }

    // Buscar handover
    const handover = await this.tenantContext.client.shiftHandover.findUnique({
      where: { shiftId },
    });

    if (!handover) {
      throw new NotFoundException('Passagem de plantão não encontrada para este plantão');
    }

    // Enriquecer com dados dos usuários
    const [handedOverByUser, receivedByUser] = await Promise.all([
      this.tenantContext.client.user.findUnique({
        where: { id: handover.handedOverBy },
        select: { id: true, name: true, email: true },
      }),
      handover.receivedBy
        ? this.tenantContext.client.user.findUnique({
            where: { id: handover.receivedBy },
            select: { id: true, name: true, email: true },
          })
        : null,
    ]);

    return {
      ...handover,
      handedOverByUser,
      receivedByUser,
    };
  }

  /**
   * Atualizar notas do plantão durante o turno
   *
   * Permite que o líder/suplente registre observações progressivamente.
   *
   * Regras:
   * 1. Plantão deve estar no status IN_PROGRESS
   * 2. Usuário deve ser LEADER ou SUBSTITUTE da equipe
   */
  async updateNotes(shiftId: string, notes: string | undefined, userId: string) {
    // 1. Buscar plantão com dados necessários
    const shift = await this.tenantContext.client.shift.findFirst({
      where: {
        id: shiftId,
        deletedAt: null,
      },
      include: {
        members: {
          where: { removedAt: null },
        },
        team: true,
      },
    });

    if (!shift) {
      throw new NotFoundException(`Plantão com ID "${shiftId}" não encontrado`);
    }

    // 2. Validar status - só pode atualizar notas de plantões IN_PROGRESS
    if (shift.status !== ShiftStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Notas só podem ser atualizadas em plantões IN_PROGRESS. Status atual: ${shift.status}`,
      );
    }

    // 3. Validar que usuário está designado ao plantão
    const userMember = shift.members.find((m) => m.userId === userId);
    if (!userMember) {
      throw new ForbiddenException(
        'Você não está designado a este plantão',
      );
    }

    // 4. Verificar se usuário é LEADER ou SUBSTITUTE na equipe
    const isLeaderOrSubstitute = await this.isUserLeaderOrSubstitute(
      userId,
      shift.teamId,
    );

    if (!isLeaderOrSubstitute) {
      throw new ForbiddenException(
        'Apenas o Líder ou Suplente pode atualizar as notas do plantão',
      );
    }

    // 5. Atualizar notas
    await this.tenantContext.client.shift.update({
      where: { id: shiftId },
      data: {
        notes: notes ?? null,
        updatedBy: userId,
      },
    });

    // 6. Retornar plantão atualizado
    return this.findOne(shiftId);
  }

  /**
   * Gerar snapshot de atividades do turno
   * Busca registros diários associados ao plantão
   */
  private async generateActivitiesSnapshot(shiftId: string, shiftDate: Date) {
    // Buscar membros do plantão
    const members = await this.tenantContext.client.shiftAssignment.findMany({
      where: {
        shiftId,
        removedAt: null,
      },
      select: { userId: true },
    });

    const memberIds = members.map((m) => m.userId);

    // Buscar registros diários feitos pelos membros do plantão nesta data
    const dailyRecords = await this.tenantContext.client.dailyRecord.findMany({
      where: {
        userId: { in: memberIds },
        date: shiftDate,
        deletedAt: null,
      },
      select: {
        id: true,
        residentId: true,
        type: true,
        date: true,
        time: true,
        userId: true,
      },
      orderBy: { time: 'asc' },
    });

    // Agrupar por tipo de registro
    const byType = dailyRecords.reduce(
      (acc, record) => {
        const recordType = record.type;
        if (!acc[recordType]) acc[recordType] = [];
        acc[recordType].push(record);
        return acc;
      },
      {} as Record<string, typeof dailyRecords>,
    );

    return {
      shiftId,
      date: format(shiftDate, 'yyyy-MM-dd'),
      totalRecords: dailyRecords.length,
      byType: Object.entries(byType).map(([type, records]) => ({
        type,
        count: records.length,
        records: records.map((r) => ({
          id: r.id,
          residentId: r.residentId,
          time: r.time,
        })),
      })),
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Listar templates de turnos disponíveis para uso em filtros de relatórios
   * Retorna apenas templates ativos e habilitados para o tenant
   */
  async getAvailableShiftTemplates() {
    // Buscar todos os templates ativos
    const templates = await this.tenantContext.publicClient.shiftTemplate.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    // Buscar configurações do tenant
    const tenantConfigs = await this.tenantContext.client.tenantShiftConfig.findMany({
      where: { deletedAt: null },
      select: {
        shiftTemplateId: true,
        isEnabled: true,
        customName: true,
        customStartTime: true,
        customEndTime: true,
        customDuration: true,
      },
    });

    // Criar mapa de configurações
    const configMap = new Map(
      tenantConfigs.map((c) => [c.shiftTemplateId, c]),
    );

    // Filtrar e enriquecer templates
    const availableTemplates = templates
      .map((template) => {
        const config = configMap.get(template.id);

        // Se existe config e está desabilitada, não retorna
        if (config && !config.isEnabled) {
          return null;
        }

        return {
          id: template.id,
          type: template.type,
          name: config?.customName || template.name,
          startTime: config?.customStartTime || template.startTime,
          endTime: config?.customEndTime || template.endTime,
          duration: config?.customDuration || template.duration,
          displayOrder: template.displayOrder,
        };
      })
      .filter(Boolean); // Remove nulls

    return availableTemplates;
  }
}
