import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangeType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private prisma: PrismaService) {}

  // ==================== UPDATE com Versionamento ====================
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    tenantId: string,
    currentUserId: string,
  ) {
    const { changeReason, password, ...updateData } = updateUserDto;

    // Buscar usuário existente
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!user) {
      this.logger.error('Erro ao atualizar usuário', {
        error: 'Usuário não encontrado',
        userId: id,
        tenantId,
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
        JSON.stringify(updateData[key]) !== JSON.stringify((user as any)[key])
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
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Atualizar usuário
      const updatedUser = await tx.user.update({
        where: { id },
        data: {
          ...(updateData as any),
          ...(hashedPassword && { password: hashedPassword }),
          versionNumber: newVersionNumber,
          updatedBy: currentUserId,
        },
      });

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
        where: { id: currentUserId, tenantId },
        select: { name: true },
      });

      // 4. Criar entrada no histórico
      await tx.userHistory.create({
        data: {
          tenantId,
          userId: id,
          versionNumber: newVersionNumber,
          changeType: ChangeType.UPDATE,
          changeReason,
          previousData: previousData as any,
          newData: newData as any,
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
      tenantId,
      currentUserId,
    });

    // Remover password do retorno
    const { password: _, ...userWithoutPassword } = result;
    return userWithoutPassword;
  }

  // ==================== DELETE (Soft) com Versionamento ====================
  async remove(
    id: string,
    tenantId: string,
    currentUserId: string,
    deleteReason: string,
  ) {
    // Buscar usuário existente
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!user) {
      this.logger.error('Erro ao remover usuário', {
        error: 'Usuário não encontrado',
        userId: id,
        tenantId,
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
    const result = await this.prisma.$transaction(async (tx) => {
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
        where: { id: currentUserId, tenantId },
        select: { name: true },
      });

      // 3. Criar entrada no histórico
      await tx.userHistory.create({
        data: {
          tenantId,
          userId: id,
          versionNumber: newVersionNumber,
          changeType: ChangeType.DELETE,
          changeReason: deleteReason,
          previousData: previousData as any,
          newData: {
            ...previousData,
            deletedAt: deletedUser.deletedAt,
            versionNumber: newVersionNumber,
          } as any,
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
      tenantId,
      currentUserId,
    });

    return { message: 'Usuário removido com sucesso', user: { id: result.id, name: result.name } };
  }

  // ==================== HISTÓRICO ====================
  async getHistory(userId: string, tenantId: string) {
    // Verificar se o usuário existe
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      this.logger.error('Erro ao consultar histórico de usuário', {
        error: 'Usuário não encontrado',
        userId,
        tenantId,
      });
      throw new NotFoundException('Usuário não encontrado');
    }

    // Buscar histórico ordenado por versão decrescente
    const history = await this.prisma.userHistory.findMany({
      where: {
        userId,
        tenantId,
      },
      orderBy: {
        versionNumber: 'desc',
      },
    });

    this.logger.log('Histórico de usuário consultado', {
      userId,
      totalVersions: history.length,
      tenantId,
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
    tenantId: string,
  ) {
    // Verificar se o usuário existe
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      this.logger.error('Erro ao consultar versão do histórico', {
        error: 'Usuário não encontrado',
        userId,
        versionNumber,
        tenantId,
      });
      throw new NotFoundException('Usuário não encontrado');
    }

    // Buscar versão específica
    const historyVersion = await this.prisma.userHistory.findFirst({
      where: {
        userId,
        versionNumber,
        tenantId,
      },
    });

    if (!historyVersion) {
      this.logger.error('Erro ao consultar versão do histórico', {
        error: `Versão ${versionNumber} não encontrada para este usuário`,
        userId,
        versionNumber,
        tenantId,
      });
      throw new NotFoundException(
        `Versão ${versionNumber} não encontrada para este usuário`,
      );
    }

    this.logger.log('Versão específica do histórico consultada', {
      userId,
      versionNumber,
      tenantId,
    });

    return historyVersion;
  }

  // ==================== HELPER: Hash Password ====================
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }
}
