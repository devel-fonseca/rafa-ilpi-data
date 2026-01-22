import {
  Injectable,
  Scope,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantContextService } from '../prisma/tenant-context.service';
import {
  CreateTeamDto,
  UpdateTeamDto,
  AddTeamMemberDto,
  ListTeamsQueryDto,
} from './dto';

@Injectable({ scope: Scope.REQUEST })
export class TeamsService {
  constructor(private readonly tenantContext: TenantContextService) {}

  /**
   * Enriquecer membros com dados do usuário (busca manual sem FK)
   */
  private async enrichMembersWithUserData(
    members: Prisma.TeamMemberGetPayload<Record<string, never>>[],
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
   * Criar nova equipe de cuidadores
   */
  async create(createTeamDto: CreateTeamDto, userId: string) {
    const { name, description, color } = createTeamDto;

    // Verificar se já existe equipe ativa com o mesmo nome
    const existing = await this.tenantContext.client.team.findFirst({
      where: {
        name,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Já existe uma equipe ativa com o nome "${name}"`,
      );
    }

    // Criar equipe
    const team = await this.tenantContext.client.team.create({
      data: {
        tenantId: this.tenantContext.tenantId,
        name,
        description,
        color,
        createdBy: userId,
      },
      include: {
        members: {
          where: { removedAt: null },
        },
      },
    });

    // Enriquecer membros com dados do usuário
    const enrichedMembers = await this.enrichMembersWithUserData(team.members);

    return {
      ...team,
      members: enrichedMembers,
    };
  }

  /**
   * Listar equipes com paginação e filtros
   */
  async findAll(query: ListTeamsQueryDto) {
    const { page = 1, limit = 10, search, isActive } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TeamWhereInput = {
      deletedAt: null,
    };

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [teams, total] = await Promise.all([
      this.tenantContext.client.team.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          members: {
            where: { removedAt: null },
          },
        },
      }),
      this.tenantContext.client.team.count({ where }),
    ]);

    // Enriquecer todos os times com dados do usuário
    const enrichedTeams = await Promise.all(
      teams.map(async (team) => ({
        ...team,
        members: await this.enrichMembersWithUserData(team.members),
      })),
    );

    return {
      data: enrichedTeams,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Buscar equipe por ID
   */
  async findOne(id: string) {
    const team = await this.tenantContext.client.team.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        members: {
          where: { removedAt: null },
          orderBy: { addedAt: 'asc' },
        },
      },
    });

    if (!team) {
      throw new NotFoundException(`Equipe com ID "${id}" não encontrada`);
    }

    // Enriquecer membros com dados do usuário
    const enrichedMembers = await this.enrichMembersWithUserData(team.members);

    return {
      ...team,
      members: enrichedMembers,
    };
  }

  /**
   * Atualizar equipe
   */
  async update(id: string, updateTeamDto: UpdateTeamDto, userId: string) {
    // Verificar se equipe existe
    await this.findOne(id);

    // Se alterando nome, verificar conflito
    if (updateTeamDto.name) {
      const existing = await this.tenantContext.client.team.findFirst({
        where: {
          name: updateTeamDto.name,
          id: { not: id },
          deletedAt: null,
        },
      });

      if (existing) {
        throw new ConflictException(
          `Já existe outra equipe ativa com o nome "${updateTeamDto.name}"`,
        );
      }
    }

    // Atualizar equipe
    const updated = await this.tenantContext.client.team.update({
      where: { id },
      data: {
        ...updateTeamDto,
        updatedBy: userId,
      },
      include: {
        members: {
          where: { removedAt: null },
        },
      },
    });

    // Enriquecer membros com dados do usuário
    const enrichedMembers = await this.enrichMembersWithUserData(
      updated.members,
    );

    return {
      ...updated,
      members: enrichedMembers,
    };
  }

  /**
   * Deletar equipe (soft delete)
   */
  async remove(id: string, userId: string) {
    // Verificar se equipe existe
    await this.findOne(id);

    // Verificar se equipe está sendo usada em plantões futuros
    const futureShifts = await this.tenantContext.client.shift.findFirst({
      where: {
        teamId: id,
        date: { gte: new Date() },
        deletedAt: null,
      },
    });

    if (futureShifts) {
      throw new BadRequestException(
        'Não é possível deletar uma equipe que possui plantões futuros agendados',
      );
    }

    // Soft delete
    await this.tenantContext.client.team.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });

    return { message: 'Equipe deletada com sucesso' };
  }

  /**
   * Adicionar membro à equipe
   */
  async addMember(
    teamId: string,
    addMemberDto: AddTeamMemberDto,
    userId: string,
  ) {
    const { userId: memberId, role } = addMemberDto;

    // Verificar se equipe existe e está ativa
    const team = await this.findOne(teamId);
    if (!team.isActive) {
      throw new BadRequestException('Não é possível adicionar membros a uma equipe inativa');
    }

    // Verificar se usuário existe e está ativo
    const user = await this.tenantContext.client.user.findUnique({
      where: { id: memberId },
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

    if (!user) {
      throw new NotFoundException(`Usuário com ID "${memberId}" não encontrado`);
    }

    if (!user.isActive) {
      throw new BadRequestException(
        'Não é possível adicionar um usuário inativo à equipe',
      );
    }

    // Validar positionCode adequado para escalas
    const allowedPositions = [
      'CAREGIVER',
      'NURSE',
      'NURSING_TECHNICIAN',
      'NURSING_ASSISTANT',
    ];
    if (!allowedPositions.includes(user.profile?.positionCode || '')) {
      throw new BadRequestException(
        `Apenas cuidadores e profissionais de enfermagem podem ser adicionados a equipes de cuidados`,
      );
    }

    // Verificar se usuário já é membro ativo
    const existingMember = await this.tenantContext.client.teamMember.findFirst(
      {
        where: {
          teamId,
          userId: memberId,
          removedAt: null,
        },
      },
    );

    if (existingMember) {
      throw new ConflictException('Usuário já é membro ativo desta equipe');
    }

    // Adicionar membro
    const member = await this.tenantContext.client.teamMember.create({
      data: {
        tenantId: this.tenantContext.tenantId,
        teamId,
        userId: memberId,
        role,
        addedBy: userId,
      },
    });

    // Retornar membro com dados do usuário e teamId para invalidação de cache
    return {
      ...member,
      teamId, // IMPORTANTE: para invalidação de cache no frontend
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profile: {
          positionCode: user.profile?.positionCode,
        },
      },
    };
  }

  /**
   * Remover membro da equipe (soft delete)
   */
  async removeMember(teamId: string, memberId: string, userId: string) {
    // Verificar se equipe existe
    await this.findOne(teamId);

    // Buscar membro ativo
    const member = await this.tenantContext.client.teamMember.findFirst({
      where: {
        teamId,
        userId: memberId,
        removedAt: null,
      },
    });

    if (!member) {
      throw new NotFoundException(
        'Usuário não é membro ativo desta equipe',
      );
    }

    // Soft delete do membro
    await this.tenantContext.client.teamMember.update({
      where: { id: member.id },
      data: {
        removedBy: userId,
        removedAt: new Date(),
      },
    });

    return { message: 'Membro removido da equipe com sucesso' };
  }
}
