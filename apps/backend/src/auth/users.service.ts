import { Injectable, NotFoundException, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { JwtCacheService } from './jwt-cache.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeType, AccessAction, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema)
    private readonly tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
    private readonly jwtCache: JwtCacheService, // Cache JWT para invalidação
  ) {}

  // ==================== UPDATE com Versionamento ====================
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    currentUserId: string,
  ) {
    const { changeReason, password, ...updateData } = updateUserDto;

    // Buscar usuário existente
    const user = await this.tenantContext.client.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      this.logger.error('Erro ao atualizar usuário', {
        error: 'Usuário não encontrado',
        userId: id,
        tenantId: this.tenantContext.tenantId,
        currentUserId,
      });
      throw new NotFoundException('Usuário não encontrado');
    }

    // Capturar estado anterior
    const previousData = {
      name: user.name,
      email: user.email,
      password: password ? { passwordChanged: true } : user.password, // MASCARAR
      role: user.role,
      isActive: user.isActive,
      versionNumber: user.versionNumber,
    };

    // Hash da senha se foi alterada
    let hashedPassword: string | undefined;
    if (password) {
      hashedPassword = await this.hashPassword(password);
    }

    // Detectar campos alterados
    const changedFields: string[] = [];

    // Verificar mudança de password
    if (password) {
      changedFields.push('password');
    }

    // Verificar mudanças nos outros campos
    (Object.keys(updateData) as Array<keyof typeof updateData>).forEach((key) => {
      if (
        updateData[key] !== undefined &&
        JSON.stringify(updateData[key]) !== JSON.stringify((user as Record<string, unknown>)[key])
      ) {
        changedFields.push(key as string);
      }
    });

    // Se não houve mudanças, retornar erro
    if (changedFields.length === 0) {
      throw new BadRequestException('Nenhuma alteração detectada');
    }

    // Incrementar versão
    const newVersionNumber = user.versionNumber + 1;

    // Executar update e criar histórico em transação atômica
    const result = await this.tenantContext.client.$transaction(async (tx) => {
      // 1. Atualizar usuário
      const updatedUser = await tx.user.update({
        where: { id },
        data: {
          ...updateData,
          ...(hashedPassword && { password: hashedPassword }),
          versionNumber: newVersionNumber,
          updatedBy: currentUserId,
        },
      });

      // 1.5. Sincronizar CPF com UserProfile se CPF foi alterado
      if (updateData.cpf !== undefined) {
        await tx.userProfile.updateMany({
          where: { userId: id },
          data: { cpf: updateData.cpf },
        });
        this.logger.log('CPF sincronizado com UserProfile', {
          userId: id,
          cpf: updateData.cpf ? 'definido' : 'removido',
        });
      }

      // 2. Capturar novo estado (com password mascarado)
      const newData = {
        name: updatedUser.name,
        email: updatedUser.email,
        password: password ? { passwordChanged: true } : updatedUser.password, // MASCARAR
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        versionNumber: updatedUser.versionNumber,
      };

      // 3. Buscar nome do usuário que fez a alteração
      const changedByUser = await tx.user.findFirst({
        where: { id: currentUserId },
        select: { name: true },
      });

      // 4. Criar entrada no histórico
      await tx.userHistory.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          userId: id,
          versionNumber: newVersionNumber,
          changeType: ChangeType.UPDATE,
          changeReason,
          previousData: previousData as Prisma.InputJsonValue,
          newData: newData as Prisma.InputJsonValue,
          changedFields,
          changedAt: new Date(),
          changedBy: currentUserId,
          changedByName: changedByUser?.name || 'Usuário desconhecido',
        },
      });

      return updatedUser;
    });

    this.logger.log('Usuário atualizado com versionamento', {
      userId: id,
      versionNumber: newVersionNumber,
      changedFields,
      tenantId: this.tenantContext.tenantId,
      currentUserId,
    });

    // ✅ OTIMIZAÇÃO: Invalidar cache JWT se campos críticos mudaram
    // (email, role, isActive, password afetam autenticação)
    const criticalFields = ['email', 'role', 'isActive', 'password'];
    const criticalFieldChanged = changedFields.some((field) =>
      criticalFields.includes(field),
    );

    if (criticalFieldChanged) {
      this.jwtCache.invalidate(id);
      this.logger.debug(`Cache JWT invalidado para usuário ${id} (campos críticos alterados)`);
    }

    // Remover password do retorno
    const { password: _, ...userWithoutPassword } = result;
    return userWithoutPassword;
  }

  // ==================== DELETE (Soft) com Versionamento ====================
  async remove(
    id: string,
    currentUserId: string,
    deleteReason: string,
  ) {
    // Buscar usuário existente
    const user = await this.tenantContext.client.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      this.logger.error('Erro ao remover usuário', {
        error: 'Usuário não encontrado',
        userId: id,
        tenantId: this.tenantContext.tenantId,
        currentUserId,
      });
      throw new NotFoundException('Usuário não encontrado');
    }

    // Não permitir auto-exclusão
    if (id === currentUserId) {
      throw new BadRequestException('Você não pode excluir sua própria conta');
    }

    // Capturar estado antes da exclusão (com password mascarado)
    const previousData = {
      name: user.name,
      email: user.email,
      password: { passwordMasked: true }, // SEMPRE MASCARADO
      role: user.role,
      isActive: user.isActive,
      versionNumber: user.versionNumber,
      deletedAt: null,
    };

    // Incrementar versão
    const newVersionNumber = user.versionNumber + 1;

    // Executar soft delete e criar histórico em transação atômica
    const result = await this.tenantContext.client.$transaction(async (tx) => {
      // 1. Soft delete do usuário
      const deletedUser = await tx.user.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          versionNumber: newVersionNumber,
          updatedBy: currentUserId,
        },
      });

      // 2. Buscar nome do usuário que fez a exclusão
      const changedByUser = await tx.user.findFirst({
        where: { id: currentUserId },
        select: { name: true },
      });

      // 3. Criar entrada no histórico
      await tx.userHistory.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          userId: id,
          versionNumber: newVersionNumber,
          changeType: ChangeType.DELETE,
          changeReason: deleteReason,
          previousData: previousData as Prisma.InputJsonValue,
          newData: {
            ...previousData,
            deletedAt: deletedUser.deletedAt,
            versionNumber: newVersionNumber,
          } as Prisma.InputJsonValue,
          changedFields: ['deletedAt'],
          changedAt: new Date(),
          changedBy: currentUserId,
          changedByName: changedByUser?.name || 'Usuário desconhecido',
        },
      });

      return deletedUser;
    });

    this.logger.log('Usuário removido com versionamento', {
      userId: id,
      versionNumber: newVersionNumber,
      tenantId: this.tenantContext.tenantId,
      currentUserId,
    });

    // ✅ OTIMIZAÇÃO: Invalidar cache JWT (usuário deletado não deve mais autenticar)
    this.jwtCache.invalidate(id);
    this.logger.debug(`Cache JWT invalidado para usuário ${id} (soft delete)`);

    return { message: 'Usuário removido com sucesso', user: { id: result.id, name: result.name } };
  }

  // ==================== HISTÓRICO ====================
  async getHistory(userId: string) {
    // Verificar se o usuário existe
    const user = await this.tenantContext.client.user.findFirst({
      where: { id: userId },
    });

    if (!user) {
      this.logger.error('Erro ao consultar histórico de usuário', {
        error: 'Usuário não encontrado',
        userId,
        tenantId: this.tenantContext.tenantId,
      });
      throw new NotFoundException('Usuário não encontrado');
    }

    // Buscar histórico ordenado por versão decrescente
    const history = await this.tenantContext.client.userHistory.findMany({
      where: {
        userId,
      },
      orderBy: {
        versionNumber: 'desc',
      },
    });

    this.logger.log('Histórico de usuário consultado', {
      userId,
      totalVersions: history.length,
      tenantId: this.tenantContext.tenantId,
    });

    return {
      userId,
      userName: user.name,
      userEmail: user.email,
      currentVersion: user.versionNumber,
      totalVersions: history.length,
      history,
    };
  }

  async getHistoryVersion(
    userId: string,
    versionNumber: number,
  ) {
    // Verificar se o usuário existe
    const user = await this.tenantContext.client.user.findFirst({
      where: { id: userId },
    });

    if (!user) {
      this.logger.error('Erro ao consultar versão do histórico', {
        error: 'Usuário não encontrado',
        userId,
        versionNumber,
        tenantId: this.tenantContext.tenantId,
      });
      throw new NotFoundException('Usuário não encontrado');
    }

    // Buscar versão específica
    const historyVersion = await this.tenantContext.client.userHistory.findFirst({
      where: {
        userId,
        versionNumber,
      },
    });

    if (!historyVersion) {
      this.logger.error('Erro ao consultar versão do histórico', {
        error: `Versão ${versionNumber} não encontrada para este usuário`,
        userId,
        versionNumber,
        tenantId: this.tenantContext.tenantId,
      });
      throw new NotFoundException(
        `Versão ${versionNumber} não encontrada para este usuário`,
      );
    }

    this.logger.log('Versão específica do histórico consultada', {
      userId,
      versionNumber,
      tenantId: this.tenantContext.tenantId,
    });

    return historyVersion;
  }

  // ==================== CHANGE PASSWORD ====================
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
    currentUserId: string,
  ) {
    // Verificar se o usuário está alterando a própria senha
    if (userId !== currentUserId) {
      this.logger.error('Tentativa de alterar senha de outro usuário', {
        userId,
        currentUserId,
        tenantId: this.tenantContext.tenantId,
      });
      throw new ForbiddenException('Você só pode alterar sua própria senha');
    }

    // Buscar usuário
    const user = await this.tenantContext.client.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      this.logger.error('Usuário não encontrado ao alterar senha', {
        userId,
        tenantId: this.tenantContext.tenantId,
      });
      throw new NotFoundException('Usuário não encontrado');
    }

    // Verificar se a senha atual está correta
    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      this.logger.warn('Senha atual incorreta ao tentar alterar senha', {
        userId,
        tenantId: this.tenantContext.tenantId,
      });
      throw new BadRequestException('Senha atual incorreta');
    }

    // Hash da nova senha
    const hashedPassword = await this.hashPassword(changePasswordDto.newPassword);

    // Incrementar versão
    const newVersionNumber = user.versionNumber + 1;

    // Atualizar senha em transação atômica com histórico
    await this.tenantContext.client.$transaction(async (tx) => {
      // 1. Atualizar senha
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          passwordResetRequired: false, // Remove flag de reset se existir
          versionNumber: newVersionNumber,
          updatedBy: currentUserId,
        },
      });

      // 2. Criar entrada no histórico
      await tx.userHistory.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          userId,
          versionNumber: newVersionNumber,
          changeType: ChangeType.UPDATE,
          changeReason: 'Troca de senha pelo usuário',
          previousData: {
            password: { passwordMasked: true },
            versionNumber: user.versionNumber,
          } as Prisma.InputJsonValue,
          newData: {
            password: { passwordChanged: true },
            versionNumber: newVersionNumber,
          } as Prisma.InputJsonValue,
          changedFields: ['password'],
          changedAt: new Date(),
          changedBy: currentUserId,
          changedByName: user.name,
        },
      });

      // 3. Registrar log de acesso (PASSWORD_CHANGED)
      await tx.accessLog.create({
        data: {
          userId,
          tenantId: this.tenantContext.tenantId,
          action: AccessAction.PASSWORD_CHANGED,
          status: 'SUCCESS',
          reason: 'Troca de senha pelo usuário',
          ipAddress: 'Sistema',
          userAgent: 'Sistema',
        },
      });

      return updatedUser;
    });

    this.logger.log('Senha alterada com sucesso', {
      userId,
      versionNumber: newVersionNumber,
      tenantId: this.tenantContext.tenantId,
    });

    return { message: 'Senha alterada com sucesso' };
  }

  // ==================== ACTIVE SESSIONS ====================

  /**
   * Listar sessões ativas do usuário
   */
  async getActiveSessions(userId: string, currentTokenId?: string) {
    const sessions = await this.tenantContext.client.refreshToken.findMany({
      where: {
        userId,
        expiresAt: {
          gte: new Date(), // Não expirados
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      sessions: sessions.map((session) => ({
        id: session.id,
        device: session.device || 'Dispositivo Desconhecido',
        ipAddress: session.ipAddress || 'IP Desconhecido',
        loginAt: session.createdAt,
        lastActivityAt: session.lastActivityAt,
        expiresAt: session.expiresAt,
        isCurrent: session.id === currentTokenId,
      })),
    };
  }

  /**
   * Revogar sessão específica (deletar refresh token)
   */
  async revokeSession(userId: string, sessionId: string, currentTokenId: string) {
    // Não permitir revogar sessão atual
    if (sessionId === currentTokenId) {
      throw new BadRequestException('Não é possível revogar a sessão atual');
    }

    // Verificar se a sessão pertence ao usuário
    const session = await this.tenantContext.client.refreshToken.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new NotFoundException('Sessão não encontrada');
    }

    // Deletar sessão
    await this.tenantContext.client.refreshToken.delete({
      where: { id: sessionId },
    });

    // Registrar log de acesso (SESSION_REVOKED)
    await this.tenantContext.client.accessLog.create({
      data: {
        userId,
        tenantId: this.tenantContext.tenantId,
        action: AccessAction.SESSION_REVOKED,
        status: 'SUCCESS',
        reason: 'Sessão revogada manualmente pelo usuário',
        ipAddress: session.ipAddress || 'IP Desconhecido',
        userAgent: session.userAgent || 'User-Agent Desconhecido',
        device: session.device,
        metadata: { sessionId },
      },
    });

    return { message: 'Sessão encerrada com sucesso' };
  }

  /**
   * Revogar todas as outras sessões (exceto a atual)
   */
  async revokeAllOtherSessions(userId: string, currentTokenId: string | null) {
    // Se currentTokenId não foi fornecido, buscar a sessão mais recente (provavelmente a atual)
    let tokenIdToKeep = currentTokenId;

    if (!currentTokenId || currentTokenId === 'current') {
      const mostRecentSession = await this.tenantContext.client.refreshToken.findFirst({
        where: { userId },
        orderBy: { lastActivityAt: 'desc' },
        select: { id: true },
      });

      tokenIdToKeep = mostRecentSession?.id || null;
    }

    // Deletar todas as sessões exceto a mais recente
    const result = await this.tenantContext.client.refreshToken.deleteMany({
      where: {
        userId,
        ...(tokenIdToKeep && {
          id: {
            not: tokenIdToKeep,
          },
        }),
      },
    });

    // Registrar log de acesso (SESSION_REVOKED) se alguma sessão foi encerrada
    if (result.count > 0) {
      await this.tenantContext.client.accessLog.create({
        data: {
          userId,
          tenantId: this.tenantContext.tenantId,
          action: AccessAction.SESSION_REVOKED,
          status: 'SUCCESS',
          reason: `${result.count} sessão(ões) revogada(s) - Encerrar todas as outras sessões`,
          ipAddress: 'Sistema',
          userAgent: 'Sistema',
          metadata: { count: result.count },
        },
      });
    }

    return {
      message: `${result.count} sessão(ões) encerrada(s) com sucesso`,
      count: result.count,
    };
  }

  // ==================== ACCESS LOGS ====================

  /**
   * Listar logs de acesso do usuário com paginação
   */
  async getAccessLogs(
    userId: string,
    limit: number = 30,
    offset: number = 0,
    action?: string,
  ) {
    // Verificar se usuário existe e pertence ao tenant
    const user = await this.tenantContext.client.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Filtros
    const where: Prisma.AccessLogWhereInput = {
      userId,
    };

    // Filtro por ação (opcional)
    if (action && Object.values(AccessAction).includes(action as AccessAction)) {
      where.action = action as AccessAction;
    }

    // Buscar logs com paginação
    const [logs, total] = await Promise.all([
      this.tenantContext.client.accessLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          action: true,
          status: true,
          reason: true,
          ipAddress: true,
          device: true,
          createdAt: true,
        },
      }),
      this.tenantContext.client.accessLog.count({ where }),
    ]);

    return {
      logs,
      total,
      hasMore: offset + limit < total,
    };
  }

  // ==================== HELPER: Hash Password ====================
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }
}
