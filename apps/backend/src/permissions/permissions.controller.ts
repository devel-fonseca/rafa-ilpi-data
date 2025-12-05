import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PermissionsService } from './permissions.service';
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
  ApiBody,
} from '@nestjs/swagger';
import { PermissionType, PositionCode } from '@prisma/client';

@ApiTags('Permissions')
@ApiBearerAuth()
@Controller('permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@AuditEntity('PERMISSIONS')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Buscar minhas próprias permissões (herdadas + customizadas)',
  })
  @ApiResponse({
    status: 200,
    description: 'Permissões do usuário logado',
    schema: {
      example: {
        inherited: ['VIEW_RESIDENTS', 'CREATE_DAILY_RECORDS'],
        custom: ['DELETE_RESIDENTS'],
        all: ['VIEW_RESIDENTS', 'CREATE_DAILY_RECORDS', 'DELETE_RESIDENTS'],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getMyPermissions(@CurrentUser() user: any) {
    return await this.permissionsService.getUserAllPermissions(
      user.id,
      user.tenantId,
    );
  }

  @Get('user/:userId')
  @Roles('admin', 'manager')
  @ApiOperation({
    summary: 'Buscar todas as permissões de um usuário (herdadas + customizadas)',
  })
  @ApiResponse({
    status: 200,
    description: 'Permissões do usuário',
    schema: {
      example: {
        inherited: ['VIEW_RESIDENTS', 'CREATE_DAILY_RECORDS'],
        custom: ['DELETE_RESIDENTS'],
        all: ['VIEW_RESIDENTS', 'CREATE_DAILY_RECORDS', 'DELETE_RESIDENTS'],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão (apenas ADMIN ou MANAGER)' })
  @ApiParam({ name: 'userId', description: 'ID do usuário' })
  async getUserPermissions(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: any,
  ) {
    return await this.permissionsService.getUserAllPermissions(
      userId,
      user.tenantId,
    );
  }

  @Get('position/:positionCode')
  @ApiOperation({
    summary: 'Buscar permissões padrão de um cargo (PositionCode)',
  })
  @ApiResponse({
    status: 200,
    description: 'Permissões do cargo',
    schema: {
      example: {
        positionCode: 'NURSE',
        permissions: ['VIEW_RESIDENTS', 'CREATE_PRESCRIPTIONS'],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiParam({
    name: 'positionCode',
    description: 'Código do cargo',
    enum: PositionCode,
  })
  async getPositionPermissions(@Param('positionCode') positionCode: string) {
    const { getPositionPermissions } = await import(
      './position-profiles.config'
    );
    const permissions = getPositionPermissions(positionCode as PositionCode);

    return {
      positionCode,
      permissions,
    };
  }

  @Post('user/:userId/custom')
  @Roles('admin')
  @AuditAction('GRANT_CUSTOM_PERMISSION')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar permissões customizadas a um usuário' })
  @ApiResponse({ status: 201, description: 'Permissões adicionadas com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão (apenas ADMIN)' })
  @ApiParam({ name: 'userId', description: 'ID do usuário' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        permissions: {
          type: 'array',
          items: { type: 'string', enum: Object.values(PermissionType) },
          example: ['DELETE_RESIDENTS', 'UPDATE_PRESCRIPTIONS'],
        },
      },
      required: ['permissions'],
    },
  })
  async addCustomPermissions(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: { permissions: PermissionType[] },
    @CurrentUser() user: any,
  ) {
    for (const permission of body.permissions) {
      await this.permissionsService.grantCustomPermission(
        userId,
        user.tenantId,
        permission,
        user.id,
      );
    }

    return {
      message: `${body.permissions.length} permiss${body.permissions.length > 1 ? 'ões' : 'ão'} adicionada${body.permissions.length > 1 ? 's' : ''} com sucesso`,
      permissions: body.permissions,
    };
  }

  @Delete('user/:userId/custom')
  @Roles('admin')
  @AuditAction('REVOKE_CUSTOM_PERMISSION')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover permissões customizadas de um usuário' })
  @ApiResponse({
    status: 200,
    description: 'Permissões removidas com sucesso',
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão (apenas ADMIN)' })
  @ApiParam({ name: 'userId', description: 'ID do usuário' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        permissions: {
          type: 'array',
          items: { type: 'string', enum: Object.values(PermissionType) },
          example: ['DELETE_RESIDENTS'],
        },
      },
      required: ['permissions'],
    },
  })
  async removeCustomPermissions(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: { permissions: PermissionType[] },
    @CurrentUser() user: any,
  ) {
    for (const permission of body.permissions) {
      await this.permissionsService.removeCustomPermission(
        userId,
        user.tenantId,
        permission,
      );
    }

    return {
      message: `${body.permissions.length} permiss${body.permissions.length > 1 ? 'ões' : 'ão'} removida${body.permissions.length > 1 ? 's' : ''} com sucesso`,
      permissions: body.permissions,
    };
  }

  @Patch('user/:userId/custom')
  @Roles('admin')
  @AuditAction('MANAGE_CUSTOM_PERMISSIONS')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Gerenciar permissões customizadas (adicionar e/ou remover em uma única chamada)',
  })
  @ApiResponse({
    status: 200,
    description: 'Permissões gerenciadas com sucesso',
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão (apenas ADMIN)' })
  @ApiParam({ name: 'userId', description: 'ID do usuário' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        add: {
          type: 'array',
          items: { type: 'string', enum: Object.values(PermissionType) },
          example: ['DELETE_RESIDENTS'],
        },
        remove: {
          type: 'array',
          items: { type: 'string', enum: Object.values(PermissionType) },
          example: ['UPDATE_PRESCRIPTIONS'],
        },
      },
    },
  })
  async manageCustomPermissions(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: { add?: PermissionType[]; remove?: PermissionType[] },
    @CurrentUser() user: any,
  ) {
    const added: PermissionType[] = [];
    const removed: PermissionType[] = [];

    if (body.add && body.add.length > 0) {
      for (const permission of body.add) {
        await this.permissionsService.grantCustomPermission(
          userId,
          user.tenantId,
          permission,
          user.id,
        );
        added.push(permission);
      }
    }

    if (body.remove && body.remove.length > 0) {
      for (const permission of body.remove) {
        await this.permissionsService.removeCustomPermission(
          userId,
          user.tenantId,
          permission,
        );
        removed.push(permission);
      }
    }

    return {
      message: 'Permissões gerenciadas com sucesso',
      added,
      removed,
      summary: {
        added: added.length,
        removed: removed.length,
      },
    };
  }
}
