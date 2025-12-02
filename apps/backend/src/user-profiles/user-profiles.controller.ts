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
} from '@nestjs/common';
import { UserProfilesService } from './user-profiles.service';
import { CreateUserProfileDto } from './dto/create-user-profile.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
    @CurrentUser() user: any,
  ) {
    return this.userProfilesService.create(
      userId,
      user.tenantId,
      createUserProfileDto,
      user.sub,
    );
  }

  @Get('me')
  @ApiOperation({ summary: 'Buscar meu perfil' })
  @ApiResponse({ status: 200, description: 'Perfil do usuário autenticado' })
  @ApiResponse({ status: 404, description: 'Perfil não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  findMyProfile(@CurrentUser() user: any) {
    return this.userProfilesService.findMyProfile(user.sub, user.tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os perfis de usuários' })
  @ApiResponse({ status: 200, description: 'Lista de perfis de usuários' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  findAll(@CurrentUser() user: any) {
    return this.userProfilesService.findAll(user.tenantId);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Buscar perfil de um usuário por ID' })
  @ApiResponse({ status: 200, description: 'Perfil encontrado' })
  @ApiResponse({ status: 404, description: 'Perfil não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiParam({ name: 'userId', description: 'ID do usuário' })
  findOne(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: any,
  ) {
    return this.userProfilesService.findOne(userId, user.tenantId);
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
    @CurrentUser() user: any,
  ) {
    return this.userProfilesService.update(
      userId,
      user.tenantId,
      updateUserProfileDto,
      user.sub,
      user.sub,
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
    @CurrentUser() user: any,
  ) {
    return this.userProfilesService.remove(userId, user.tenantId, user.role);
  }
}
