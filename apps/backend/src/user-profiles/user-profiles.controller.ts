import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { UserProfilesService } from './user-profiles.service';
import { CreateUserProfileDto } from './dto/create-user-profile.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditEntity, AuditAction } from '../audit/audit.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UserPreferences } from './types/user-preferences.type';

@ApiTags('User Profiles')
@ApiBearerAuth()
@Controller('user-profiles')
@UseGuards(JwtAuthGuard, RolesGuard)
@AuditEntity('USER_PROFILE')
export class UserProfilesController {
  constructor(private readonly userProfilesService: UserProfilesService) {}

  @Post(':userId')
  @Roles('admin')
  @AuditAction('CREATE')
  @ApiOperation({ summary: 'Criar perfil para um usuário' })
  @ApiResponse({ status: 201, description: 'Perfil criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou usuário já possui perfil' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão (apenas ADMINs)' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  @ApiParam({ name: 'userId', description: 'ID do usuário' })
  create(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() createUserProfileDto: CreateUserProfileDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.userProfilesService.create(
      userId,
      createUserProfileDto,
      user.id,
    );
  }

  @Get('me')
  @ApiOperation({ summary: 'Buscar meu perfil' })
  @ApiResponse({ status: 200, description: 'Perfil do usuário autenticado' })
  @ApiResponse({ status: 404, description: 'Perfil não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @HttpCode(HttpStatus.OK)
  async findMyProfile(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    // IMPORTANTE: Desabilitar cache HTTP para evitar retornar perfil errado
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return await this.userProfilesService.findMyProfile(user.id);
  }

  @Patch('me/preferences')
  @ApiOperation({ summary: 'Atualizar minhas preferências' })
  @ApiResponse({ status: 200, description: 'Preferências atualizadas com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Perfil não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @HttpCode(HttpStatus.OK)
  async updateMyPreferences(
    @CurrentUser() user: JwtPayload,
    @Body() preferences: Partial<UserPreferences>,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Desabilitar cache HTTP
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Buscar perfil atual
    const currentProfile = await this.userProfilesService.findMyProfile(
      user.id,
    );

    // Mesclar preferências existentes com as novas (merge parcial)
    const currentPreferences = (currentProfile.preferences as UserPreferences) || {};
    const updatedPreferences = {
      ...currentPreferences,
      ...preferences,
    };

    // Atualizar apenas o campo preferences
    return await this.userProfilesService.update(
      user.id,
      { preferences: updatedPreferences },
      user.id,
      user.id,
      user.role,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os perfis de usuários' })
  @ApiResponse({ status: 200, description: 'Lista de perfis de usuários' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  findAll(@CurrentUser() _user: JwtPayload) {
    return this.userProfilesService.findAll();
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Buscar perfil de um usuário por ID' })
  @ApiResponse({ status: 200, description: 'Perfil encontrado' })
  @ApiResponse({ status: 404, description: 'Perfil não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiParam({ name: 'userId', description: 'ID do usuário' })
  findOne(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() _user: JwtPayload,
  ) {
    return this.userProfilesService.findOne(userId);
  }

  @Patch(':userId')
  @AuditAction('UPDATE')
  @ApiOperation({ summary: 'Atualizar perfil de usuário' })
  @ApiResponse({ status: 200, description: 'Perfil atualizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 403, description: 'Sem permissão (apenas o próprio usuário ou ADMIN)' })
  @ApiResponse({ status: 404, description: 'Perfil não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiParam({ name: 'userId', description: 'ID do usuário' })
  update(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() updateUserProfileDto: UpdateUserProfileDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.userProfilesService.update(
      userId,
      updateUserProfileDto,
      user.id,
      user.id,
      user.role,
    );
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @AuditAction('DELETE')
  @ApiOperation({ summary: 'Remover perfil de usuário' })
  @ApiResponse({ status: 200, description: 'Perfil removido com sucesso' })
  @ApiResponse({ status: 403, description: 'Sem permissão (apenas ADMINs)' })
  @ApiResponse({ status: 404, description: 'Perfil não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiParam({ name: 'userId', description: 'ID do usuário' })
  remove(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.userProfilesService.remove(userId, user.role);
  }
}
