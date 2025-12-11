import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard } from '../permissions/guards/permissions.guard'
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator'
import { PermissionType } from '@prisma/client'
import { PopsService } from './pops.service'
import { FilesService } from '../files/files.service'
import {
  CreatePopDto,
  UpdatePopDto,
  CreatePopVersionDto,
  PublishPopDto,
  MarkObsoleteDto,
  AddAttachmentDto,
  FilterPopsDto,
} from './dto'
import {
  getAllTemplates,
  getTemplatesByCategory,
  getTemplateById,
  getTemplateCount,
} from './config/pop-templates.config'
import { PopCategory } from '@prisma/client'

/**
 * Controller de POPs (Procedimentos Operacionais Padrão)
 *
 * Rotas organizadas por funcionalidade:
 * - CRUD básico
 * - Versionamento
 * - Workflow (publish, obsolete, review)
 * - Anexos
 * - Histórico
 * - Templates
 */
@Controller('pops')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PopsController {
  constructor(
    private readonly popsService: PopsService,
    private readonly filesService: FilesService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // CRUD BÁSICO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /pops
   * Criar novo POP (status=DRAFT)
   */
  @Post()
  @RequirePermissions(PermissionType.CREATE_POPS)
  async create(@Req() req: any, @Body() dto: CreatePopDto) {
    return this.popsService.create(req.user.tenantId, req.user.id, dto)
  }

  /**
   * GET /pops
   * Listar POPs com filtros
   */
  @Get()
  @RequirePermissions(PermissionType.VIEW_POPS)
  async findAll(@Req() req: any, @Query() filters: FilterPopsDto) {
    return this.popsService.findAll(req.user.tenantId, filters)
  }

  /**
   * GET /pops/published
   * Listar apenas POPs publicados (vigentes)
   */
  @Get('published')
  @RequirePermissions(PermissionType.VIEW_POPS)
  async findPublished(@Req() req: any) {
    return this.popsService.findPublished(req.user.tenantId)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEMPLATES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /pops/categories
   * Listar categorias únicas usadas no tenant
   */
  @Get('categories')
  @RequirePermissions(PermissionType.VIEW_POPS)
  async getCategories(@Req() req: any) {
    return this.popsService.getUniqueCategories(req.user.tenantId)
  }

  /**
   * GET /pops/templates/all
   * Listar todos os templates de POPs
   */
  @Get('templates/all')
  @RequirePermissions(PermissionType.VIEW_POPS)
  async getAllTemplates() {
    return {
      templates: getAllTemplates(),
      count: getTemplateCount(),
    }
  }

  /**
   * GET /pops/templates/category/:category
   * Listar templates por categoria
   */
  @Get('templates/category/:category')
  @RequirePermissions(PermissionType.VIEW_POPS)
  async getTemplatesByCategory(@Param('category') category: string) {
    const popCategory = category.toUpperCase() as PopCategory

    if (!Object.values(PopCategory).includes(popCategory)) {
      throw new BadRequestException('Categoria inválida')
    }

    return {
      category: popCategory,
      templates: getTemplatesByCategory(popCategory),
    }
  }

  /**
   * GET /pops/templates/:templateId
   * Buscar template específico por ID
   */
  @Get('templates/:templateId')
  @RequirePermissions(PermissionType.VIEW_POPS)
  async getTemplateById(@Param('templateId') templateId: string) {
    const template = getTemplateById(templateId)

    if (!template) {
      throw new BadRequestException('Template não encontrado')
    }

    return template
  }

  /**
   * GET /pops/:id
   * Buscar POP específico
   */
  @Get(':id')
  @RequirePermissions(PermissionType.VIEW_POPS)
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.popsService.findOne(req.user.tenantId, id)
  }

  /**
   * PATCH /pops/:id
   * Atualizar POP (apenas DRAFT)
   */
  @Patch(':id')
  @RequirePermissions(PermissionType.UPDATE_POPS)
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePopDto,
  ) {
    return this.popsService.update(req.user.tenantId, id, req.user.id, dto)
  }

  /**
   * DELETE /pops/:id
   * Remover POP (soft delete, apenas DRAFT)
   */
  @Delete(':id')
  @RequirePermissions(PermissionType.DELETE_POPS)
  async remove(@Req() req: any, @Param('id') id: string) {
    await this.popsService.remove(req.user.tenantId, id, req.user.id)
    return { message: 'POP removido com sucesso' }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VERSIONAMENTO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /pops/:id/version
   * Criar nova versão de POP PUBLISHED
   */
  @Post(':id/version')
  @RequirePermissions(PermissionType.PUBLISH_POPS) // Apenas RT
  async createVersion(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CreatePopVersionDto,
  ) {
    return this.popsService.createNewVersion(
      req.user.tenantId,
      id,
      req.user.id,
      dto,
    )
  }

  /**
   * GET /pops/:id/versions
   * Histórico de versões de um POP
   */
  @Get(':id/versions')
  @RequirePermissions(PermissionType.VIEW_POPS)
  async getVersionHistory(@Req() req: any, @Param('id') id: string) {
    return this.popsService.getVersionHistory(req.user.tenantId, id)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WORKFLOW
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /pops/:id/publish
   * Publicar POP (DRAFT → PUBLISHED)
   */
  @Post(':id/publish')
  @RequirePermissions(PermissionType.PUBLISH_POPS) // Apenas RT
  async publish(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: PublishPopDto,
  ) {
    return this.popsService.publish(req.user.tenantId, id, req.user.id)
  }

  /**
   * POST /pops/:id/obsolete
   * Marcar POP como obsoleto
   */
  @Post(':id/obsolete')
  @RequirePermissions(PermissionType.PUBLISH_POPS) // Apenas RT
  async markObsolete(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: MarkObsoleteDto,
  ) {
    return this.popsService.markObsolete(
      req.user.tenantId,
      id,
      req.user.id,
      dto.reason,
    )
  }

  /**
   * POST /pops/:id/mark-reviewed
   * Marcar POP como revisado (sem alterações)
   */
  @Post(':id/mark-reviewed')
  @RequirePermissions(PermissionType.PUBLISH_POPS) // Apenas RT
  async markAsReviewed(@Req() req: any, @Param('id') id: string) {
    return this.popsService.markAsReviewed(
      req.user.tenantId,
      id,
      req.user.id,
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ANEXOS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /pops/:id/attachments
   * Adicionar anexo a um POP
   */
  @Post(':id/attachments')
  @RequirePermissions(PermissionType.UPDATE_POPS)
  @UseInterceptors(FileInterceptor('file'))
  async addAttachment(
    @Req() req: any,
    @Param('id') popId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: AddAttachmentDto,
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo é obrigatório')
    }

    // Upload do arquivo para MinIO
    const uploadResult = await this.filesService.uploadFile(
      req.user.tenantId,
      file,
      'pops',
      popId,
    )

    // Criar registro de anexo
    return this.popsService.addAttachment(
      req.user.tenantId,
      popId,
      req.user.id,
      uploadResult.fileUrl,
      uploadResult.fileName,
      uploadResult.fileSize,
      uploadResult.mimeType,
      dto,
    )
  }

  /**
   * DELETE /pops/attachments/:attachmentId
   * Remover anexo de um POP
   */
  @Delete('attachments/:attachmentId')
  @RequirePermissions(PermissionType.UPDATE_POPS)
  async removeAttachment(
    @Req() req: any,
    @Param('attachmentId') attachmentId: string,
  ) {
    await this.popsService.removeAttachment(req.user.tenantId, attachmentId)
    return { message: 'Anexo removido com sucesso' }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HISTÓRICO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /pops/:id/history
   * Histórico de alterações de um POP
   */
  @Get(':id/history')
  @RequirePermissions(PermissionType.VIEW_POPS)
  async getHistory(@Req() req: any, @Param('id') id: string) {
    return this.popsService.getPopHistory(req.user.tenantId, id)
  }
}
