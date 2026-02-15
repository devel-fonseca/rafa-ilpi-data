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
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard } from '../permissions/guards/permissions.guard'
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface'
import { InstitutionalProfileService } from './institutional-profile.service'
import { CreateTenantDocumentDto, UpdateTenantDocumentDto } from './dto'
import { CreateTenantDocumentWithUrlDto } from './dto/create-tenant-document-with-url.dto'
import { getRequiredDocuments, getAllDocumentTypes, getDocumentLabel, MAX_FILE_SIZE } from './config/document-requirements.config'
import { LegalNature, PermissionType, DocumentStatus } from '@prisma/client'
import { FeatureGuard } from '../common/guards/feature.guard'
import { RequireFeatures } from '../common/decorators/require-features.decorator'

@Controller('institutional-documents')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeatures('documentos_institucionais')
export class InstitutionalDocumentsController {
  constructor(private readonly service: InstitutionalProfileService) {}

  // ──────────────────────────────────────────────────────────────────────────
  // DOCUMENTOS INSTITUCIONAIS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * GET /institutional-documents
   * Lista todos os documentos com filtros opcionais
   */
  @Get()
  @RequirePermissions(PermissionType.VIEW_INSTITUTIONAL_PROFILE)
  async getDocuments(
    @CurrentUser('tenantId') tenantId: string,
    @Query('type') type?: string,
    @Query('status') status?: string
  ) {
    return this.service.getDocuments(tenantId, {
      type,
      status: status as DocumentStatus | undefined,
    })
  }

  /**
   * POST /institutional-documents/with-file-url
   * Cria documento a partir de arquivo já enviado
   */
  @Post('with-file-url')
  @RequirePermissions(PermissionType.UPDATE_INSTITUTIONAL_PROFILE)
  async createDocumentWithFileUrl(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTenantDocumentWithUrlDto
  ) {
    const tenantId = user.tenantId
    if (!tenantId) {
      throw new BadRequestException('Usuário não está associado a um tenant')
    }
    const userId = user.id

    return this.service.createDocumentWithFileUrl(tenantId, userId, dto)
  }

  /**
   * POST /institutional-documents
   * Upload de novo documento
   */
  @Post()
  @RequirePermissions(PermissionType.UPDATE_INSTITUTIONAL_PROFILE)
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @CurrentUser() user: JwtPayload,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /(jpg|jpeg|png|webp|pdf)$/ })
        .addMaxSizeValidator({ maxSize: MAX_FILE_SIZE })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY })
    )
    file: Express.Multer.File,
    @Body() body: Record<string, string | string[]>
  ) {
    const tenantId = user.tenantId
    if (!tenantId) {
      throw new BadRequestException('Usuário não está associado a um tenant')
    }
    const userId = user.id

    const dto: CreateTenantDocumentDto = {
      type: Array.isArray(body.type) ? body.type[0] : body.type,
      issuedAt: body.issuedAt && typeof body.issuedAt === 'string' && body.issuedAt.trim() !== '' ? body.issuedAt : undefined,
      expiresAt: body.expiresAt && typeof body.expiresAt === 'string' && body.expiresAt.trim() !== '' ? body.expiresAt : undefined,
      documentNumber: body.documentNumber && typeof body.documentNumber === 'string' && body.documentNumber.trim() !== '' ? body.documentNumber : undefined,
      issuerEntity: body.issuerEntity && typeof body.issuerEntity === 'string' && body.issuerEntity.trim() !== '' ? body.issuerEntity : undefined,
      tags: body.tags ? (typeof body.tags === 'string' ? JSON.parse(body.tags) : body.tags) : undefined,
      notes: body.notes && typeof body.notes === 'string' && body.notes.trim() !== '' ? body.notes : undefined,
    }

    return this.service.uploadDocument(tenantId, userId, file, dto)
  }

  /**
   * PATCH /institutional-documents/:id
   * Atualiza metadados do documento (sem alterar o arquivo)
   */
  @Patch(':id')
  @RequirePermissions(PermissionType.UPDATE_INSTITUTIONAL_PROFILE)
  async updateDocumentMetadata(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') documentId: string,
    @Body() dto: UpdateTenantDocumentDto
  ) {
    return this.service.updateDocumentMetadata(tenantId, documentId, dto)
  }

  /**
   * POST /institutional-documents/:id/file
   * Substitui o arquivo de um documento existente
   */
  @Post(':id/file')
  @RequirePermissions(PermissionType.UPDATE_INSTITUTIONAL_PROFILE)
  @UseInterceptors(FileInterceptor('file'))
  async replaceDocumentFile(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') documentId: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /(jpg|jpeg|png|webp|pdf)$/ })
        .addMaxSizeValidator({ maxSize: MAX_FILE_SIZE })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY })
    )
    file: Express.Multer.File
  ) {
    return this.service.replaceDocumentFile(tenantId, documentId, file)
  }

  /**
   * DELETE /institutional-documents/:id
   * Remove um documento
   */
  @Delete(':id')
  @RequirePermissions(PermissionType.UPDATE_INSTITUTIONAL_PROFILE)
  async deleteDocument(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') documentId: string
  ) {
    return this.service.deleteDocument(tenantId, documentId)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // COMPLIANCE & REQUISITOS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * GET /institutional-documents/compliance
   * Dashboard de compliance com estatísticas
   */
  @Get('compliance')
  @RequirePermissions(PermissionType.VIEW_INSTITUTIONAL_PROFILE)
  async getComplianceDashboard(@CurrentUser('tenantId') tenantId: string) {
    return this.service.getComplianceDashboard(tenantId)
  }

  /**
   * GET /institutional-documents/requirements/:legalNature
   * Lista documentos obrigatórios para uma natureza jurídica
   */
  @Get('requirements/:legalNature')
  @RequirePermissions(PermissionType.VIEW_INSTITUTIONAL_PROFILE)
  async getDocumentRequirements(@Param('legalNature') legalNature: LegalNature) {
    const documents = getRequiredDocuments(legalNature)

    return {
      legalNature,
      required: documents.map(type => ({
        type,
        label: getDocumentLabel(type),
      })),
    }
  }

  /**
   * GET /institutional-documents/all-document-types/:legalNature
   * Lista TODOS os tipos de documentos disponíveis (obrigatórios + opcionais)
   */
  @Get('all-document-types/:legalNature')
  @RequirePermissions(PermissionType.VIEW_INSTITUTIONAL_PROFILE)
  async getAllDocumentTypes(@Param('legalNature') legalNature: LegalNature) {
    const allTypes = getAllDocumentTypes(legalNature)
    const requiredTypes = getRequiredDocuments(legalNature)

    return {
      legalNature,
      documentTypes: allTypes.map(type => ({
        type,
        label: getDocumentLabel(type),
        required: requiredTypes.includes(type),
      })),
    }
  }

  /**
   * POST /institutional-documents/update-statuses
   * Atualiza o status de todos os documentos (cron job)
   */
  @Post('update-statuses')
  @RequirePermissions(PermissionType.UPDATE_INSTITUTIONAL_PROFILE)
  async updateDocumentsStatus() {
    return this.service.updateDocumentsStatus()
  }

  /**
   * GET /institutional-documents/:id
   * Busca um documento específico
   *
   * IMPORTANTE: manter esta rota após as rotas estáticas para evitar conflito
   * com /institutional-documents/compliance e afins.
   */
  @Get(':id')
  @RequirePermissions(PermissionType.VIEW_INSTITUTIONAL_PROFILE)
  async getDocument(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') documentId: string
  ) {
    return this.service.getDocument(tenantId, documentId)
  }
}
