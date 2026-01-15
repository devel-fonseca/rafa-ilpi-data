import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TenantProfileService } from './tenant-profile.service';
import {
  CreateTenantProfileDto,
  UpdateTenantProfileDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditEntity, AuditAction } from '../audit/audit.decorator';

/**
 * Controller para gerenciamento de Perfil Institucional do Tenant
 *
 * Endpoints:
 * - POST /tenant-profile - Criar/atualizar perfil (upsert)
 * - GET /tenant-profile/me - Buscar perfil do tenant logado
 * - GET /tenant-profile/completion-status - Verificar completude do perfil
 * - PATCH /tenant-profile - Atualizar perfil existente
 * - DELETE /tenant-profile - Soft delete do perfil
 */
@ApiTags('Tenant Profile')
@ApiBearerAuth()
@Controller('tenant-profile')
@UseGuards(JwtAuthGuard)
@AuditEntity('TENANT_PROFILE')
export class TenantProfileController {
  constructor(
    private readonly tenantProfileService: TenantProfileService,
  ) {}

  /**
   * Criar ou atualizar perfil institucional (upsert)
   * Usado no onboarding após os 3 steps do wizard
   */
  @Post()
  @AuditAction('CREATE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Criar ou atualizar perfil institucional',
    description:
      'Cria um novo perfil ou atualiza existente (upsert). ' +
      'Apenas legalNature é obrigatório. ' +
      'Usado no fluxo de onboarding.',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil criado/atualizado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description:
      'Dados inválidos (ex: capacidade licenciada > capacidade declarada)',
  })
  @ApiResponse({
    status: 401,
    description: 'Não autenticado',
  })
  async upsert(
    @CurrentUser() user: any,
    @Body() dto: CreateTenantProfileDto,
  ) {
    return this.tenantProfileService.upsert(dto);
  }

  /**
   * Buscar perfil do tenant logado
   */
  @Get('me')
  @ApiOperation({
    summary: 'Buscar perfil do tenant logado',
    description:
      'Retorna o perfil institucional do tenant autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil encontrado',
  })
  @ApiResponse({
    status: 404,
    description: 'Perfil não encontrado',
  })
  async getMyProfile(@CurrentUser() user: any) {
    return this.tenantProfileService.findByTenantId();
  }

  /**
   * Verificar status de completude do perfil
   * Retorna se o perfil está completo (legalNature preenchida)
   */
  @Get('completion-status')
  @ApiOperation({
    summary: 'Verificar completude do perfil',
    description:
      'Retorna se o perfil está completo e quais campos obrigatórios faltam. ' +
      'Usado para decidir se redireciona para onboarding.',
  })
  @ApiResponse({
    status: 200,
    description: 'Status de completude retornado',
    schema: {
      example: {
        isComplete: false,
        profile: null,
        missingFields: ['legalNature'],
      },
    },
  })
  async checkCompletion(@CurrentUser() user: any) {
    return this.tenantProfileService.checkCompletionStatus();
  }

  /**
   * Atualizar perfil existente
   * Usado para edições posteriores ao onboarding
   */
  @Patch()
  @AuditAction('UPDATE')
  @ApiOperation({
    summary: 'Atualizar perfil existente',
    description:
      'Atualiza perfil já existente. Todos os campos são opcionais.',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil atualizado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Perfil não encontrado',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos',
  })
  async update(
    @CurrentUser() user: any,
    @Body() dto: UpdateTenantProfileDto,
  ) {
    return this.tenantProfileService.update(dto);
  }

  /**
   * Soft delete do perfil
   * Apenas para casos excepcionais (raramente usado)
   */
  @Delete()
  @AuditAction('DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deletar perfil (soft delete)',
    description: 'Marca perfil como deletado. Raramente usado.',
  })
  @ApiResponse({
    status: 204,
    description: 'Perfil deletado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Perfil não encontrado',
  })
  async softDelete(@CurrentUser() user: any) {
    await this.tenantProfileService.softDelete();
  }
}
