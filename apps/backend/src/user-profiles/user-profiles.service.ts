import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { CreateUserProfileDto } from './dto/create-user-profile.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class UserProfilesService {
  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema)
    private readonly tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * Cria um perfil para um usuário
   * @param userId ID do usuário
   * @param createUserProfileDto Dados do perfil
   * @param createdBy ID do usuário que está criando
   */
  async create(
    userId: string,
    createUserProfileDto: CreateUserProfileDto,
    createdBy: string,
  ) {
    // Verificar se o usuário existe
    const user = await this.tenantContext.client.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Verificar se já existe perfil para este usuário
    const existingProfile = await this.tenantContext.client.userProfile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      throw new BadRequestException('Usuário já possui um perfil');
    }

    // Criar o perfil e sincronizar CPF se necessário
    const profile = await this.tenantContext.client.$transaction(async (tx) => {
      // Criar o perfil
      const newProfile = await tx.userProfile.create({
        data: {
          userId,
          tenantId: this.tenantContext.tenantId,
          profilePhoto: createUserProfileDto.profilePhoto,
          phone: createUserProfileDto.phone,
          cpf: createUserProfileDto.cpf,
          department: createUserProfileDto.department,
          birthDate: createUserProfileDto.birthDate
            ? new Date(createUserProfileDto.birthDate)
            : null,
          notes: createUserProfileDto.notes,
          preferences: (createUserProfileDto.preferences || {}) as any,
          // Campos ILPI
          positionCode: createUserProfileDto.positionCode,
          registrationType: createUserProfileDto.registrationType,
          registrationNumber: createUserProfileDto.registrationNumber,
          registrationState: createUserProfileDto.registrationState,
          isTechnicalManager: createUserProfileDto.isTechnicalManager ?? false,
          isNursingCoordinator: createUserProfileDto.isNursingCoordinator ?? false,
          createdBy,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      // Sincronizar CPF com User se fornecido
      if (createUserProfileDto.cpf !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: { cpf: createUserProfileDto.cpf },
        });
        this.logger.info('CPF sincronizado com User', {
          userId,
          cpf: createUserProfileDto.cpf ? 'definido' : 'removido',
        });
      }

      return newProfile;
    });

    this.logger.info('Perfil de usuário criado', {
      profileId: profile.id,
      userId,
      tenantId: this.tenantContext.tenantId,
      createdBy,
    });

    return profile;
  }

  /**
   * Busca o perfil de um usuário
   * @param userId ID do usuário
   */
  async findOne(userId: string) {
    const profile = await this.tenantContext.client.userProfile.findFirst({
      where: {
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Perfil não encontrado');
    }

    return profile;
  }

  /**
   * Busca o perfil do usuário autenticado
   * @param userId ID do usuário autenticado
   */
  async findMyProfile(userId: string) {
    return this.findOne(userId);
  }

  /**
   * Lista todos os perfis de usuários de um tenant
   */
  async findAll() {
    const profiles = await this.tenantContext.client.userProfile.findMany({
      where: {},
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            lastLogin: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return profiles;
  }

  /**
   * Atualiza o perfil de um usuário
   * @param userId ID do usuário
   * @param updateUserProfileDto Dados para atualizar
   * @param updatedBy ID do usuário que está atualizando
   * @param currentUserId ID do usuário autenticado (para validação de permissão)
   * @param currentUserRole Role do usuário autenticado
   */
  async update(
    userId: string,
    updateUserProfileDto: UpdateUserProfileDto,
    updatedBy: string,
    currentUserId: string,
    currentUserRole: string,
  ) {
    // Verificar se o perfil existe
    const profile = await this.tenantContext.client.userProfile.findFirst({
      where: {
        userId,
      },
    });

    if (!profile) {
      throw new NotFoundException('Perfil não encontrado');
    }

    // Verificar permissão: apenas o próprio usuário ou ADMINs podem atualizar
    const isOwner = currentUserId === userId;
    const isAdmin = currentUserRole?.toLowerCase() === 'admin';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'Você não tem permissão para atualizar este perfil',
      );
    }

    // Atualizar perfil e sincronizar campos com User
    const updatedProfile = await this.tenantContext.client.$transaction(async (tx) => {
      // Atualizar o nome do usuário se fornecido
      if (updateUserProfileDto.name) {
        await tx.user.update({
          where: { id: userId },
          data: { name: updateUserProfileDto.name },
        });
      }

      // Sincronizar CPF com User se fornecido
      if (updateUserProfileDto.cpf !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: { cpf: updateUserProfileDto.cpf },
        });
        this.logger.info('CPF sincronizado com User', {
          userId,
          cpf: updateUserProfileDto.cpf ? 'definido' : 'removido',
        });
      }

      // Atualizar o perfil
      return await tx.userProfile.update({
        where: { id: profile.id },
        data: {
          profilePhoto: updateUserProfileDto.profilePhoto,
          phone: updateUserProfileDto.phone,
          cpf: updateUserProfileDto.cpf,
          department: updateUserProfileDto.department,
          birthDate: updateUserProfileDto.birthDate
            ? new Date(updateUserProfileDto.birthDate)
            : undefined,
          notes: updateUserProfileDto.notes,
          // Campos de Permissões ILPI
          positionCode: updateUserProfileDto.positionCode,
          registrationType: updateUserProfileDto.registrationType,
          registrationNumber: updateUserProfileDto.registrationNumber,
          registrationState: updateUserProfileDto.registrationState,
          isTechnicalManager: updateUserProfileDto.isTechnicalManager,
          isNursingCoordinator: updateUserProfileDto.isNursingCoordinator,
          // Preferências do Usuário
          preferences: updateUserProfileDto.preferences !== undefined
            ? (updateUserProfileDto.preferences as any)
            : undefined,
          updatedBy,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });
    });

    this.logger.info('Perfil de usuário atualizado', {
      profileId: updatedProfile.id,
      userId,
      tenantId: this.tenantContext.tenantId,
      updatedBy,
    });

    return updatedProfile;
  }

  /**
   * Remove o perfil de um usuário (soft delete não aplicável, apenas remove registro)
   * @param userId ID do usuário
   * @param currentUserRole Role do usuário que está deletando
   */
  async remove(userId: string, currentUserRole: string) {
    // Apenas ADMINs podem deletar perfis
    if (currentUserRole?.toLowerCase() !== 'admin') {
      throw new ForbiddenException(
        'Apenas administradores podem deletar perfis',
      );
    }

    const profile = await this.tenantContext.client.userProfile.findFirst({
      where: {
        userId,
      },
    });

    if (!profile) {
      throw new NotFoundException('Perfil não encontrado');
    }

    await this.tenantContext.client.userProfile.delete({
      where: { id: profile.id },
    });

    this.logger.info('Perfil de usuário removido', {
      profileId: profile.id,
      userId,
      tenantId: this.tenantContext.tenantId,
    });

    return { message: 'Perfil removido com sucesso' };
  }
}
