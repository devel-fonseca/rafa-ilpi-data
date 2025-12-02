import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserProfileDto } from './dto/create-user-profile.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class UserProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * Cria um perfil para um usuário
   * @param userId ID do usuário
   * @param tenantId ID do tenant
   * @param createUserProfileDto Dados do perfil
   * @param createdBy ID do usuário que está criando
   */
  async create(
    userId: string,
    tenantId: string,
    createUserProfileDto: CreateUserProfileDto,
    createdBy: string,
  ) {
    // Verificar se o usuário existe e pertence ao tenant
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Verificar se já existe perfil para este usuário
    const existingProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      throw new BadRequestException('Usuário já possui um perfil');
    }

    // Criar o perfil
    const profile = await this.prisma.userProfile.create({
      data: {
        userId,
        tenantId,
        profilePhoto: createUserProfileDto.profilePhoto,
        phone: createUserProfileDto.phone,
        position: createUserProfileDto.position,
        department: createUserProfileDto.department,
        birthDate: createUserProfileDto.birthDate
          ? new Date(createUserProfileDto.birthDate)
          : null,
        notes: createUserProfileDto.notes,
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

    this.logger.info('Perfil de usuário criado', {
      profileId: profile.id,
      userId,
      tenantId,
      createdBy,
    });

    return profile;
  }

  /**
   * Busca o perfil de um usuário
   * @param userId ID do usuário
   * @param tenantId ID do tenant (para validação)
   */
  async findOne(userId: string, tenantId: string) {
    const profile = await this.prisma.userProfile.findFirst({
      where: {
        userId,
        tenantId,
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
   * @param tenantId ID do tenant
   */
  async findMyProfile(userId: string, tenantId: string) {
    return this.findOne(userId, tenantId);
  }

  /**
   * Lista todos os perfis de usuários de um tenant
   * @param tenantId ID do tenant
   */
  async findAll(tenantId: string) {
    const profiles = await this.prisma.userProfile.findMany({
      where: {
        tenantId,
      },
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
   * @param tenantId ID do tenant
   * @param updateUserProfileDto Dados para atualizar
   * @param updatedBy ID do usuário que está atualizando
   * @param currentUserId ID do usuário autenticado (para validação de permissão)
   * @param currentUserRole Role do usuário autenticado
   */
  async update(
    userId: string,
    tenantId: string,
    updateUserProfileDto: UpdateUserProfileDto,
    updatedBy: string,
    currentUserId: string,
    currentUserRole: string,
  ) {
    // Verificar se o perfil existe
    const profile = await this.prisma.userProfile.findFirst({
      where: {
        userId,
        tenantId,
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

    // Atualizar o perfil
    const updatedProfile = await this.prisma.userProfile.update({
      where: { id: profile.id },
      data: {
        profilePhoto: updateUserProfileDto.profilePhoto,
        phone: updateUserProfileDto.phone,
        position: updateUserProfileDto.position,
        department: updateUserProfileDto.department,
        birthDate: updateUserProfileDto.birthDate
          ? new Date(updateUserProfileDto.birthDate)
          : undefined,
        notes: updateUserProfileDto.notes,
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

    this.logger.info('Perfil de usuário atualizado', {
      profileId: updatedProfile.id,
      userId,
      tenantId,
      updatedBy,
    });

    return updatedProfile;
  }

  /**
   * Remove o perfil de um usuário (soft delete não aplicável, apenas remove registro)
   * @param userId ID do usuário
   * @param tenantId ID do tenant
   * @param currentUserRole Role do usuário que está deletando
   */
  async remove(userId: string, tenantId: string, currentUserRole: string) {
    // Apenas ADMINs podem deletar perfis
    if (currentUserRole?.toLowerCase() !== 'admin') {
      throw new ForbiddenException(
        'Apenas administradores podem deletar perfis',
      );
    }

    const profile = await this.prisma.userProfile.findFirst({
      where: {
        userId,
        tenantId,
      },
    });

    if (!profile) {
      throw new NotFoundException('Perfil não encontrado');
    }

    await this.prisma.userProfile.delete({
      where: { id: profile.id },
    });

    this.logger.info('Perfil de usuário removido', {
      profileId: profile.id,
      userId,
      tenantId,
    });

    return { message: 'Perfil removido com sucesso' };
  }
}
