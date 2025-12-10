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
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard } from '../permissions/guards/permissions.guard'
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { InstitutionalProfileService } from './institutional-profile.service'
import { CreateTenantProfileDto, UpdateTenantProfileDto, CreateTenantDocumentDto, UpdateTenantDocumentDto, UpdateInstitutionalProfileDto } from './dto'
import { CreateTenantDocumentWithUrlDto } from './dto/create-tenant-document-with-url.dto'
import { getRequiredDocuments, getAllDocumentTypes, getDocumentLabel, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from './config/document-requirements.config'
import { LegalNature, PermissionType } from '@prisma/client'

@Controller('institutional-profile')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InstitutionalProfileController {
  constructor(private readonly service: InstitutionalProfileService) {}

  // ──────────────────────────────────────────────────────────────────────────
  // PERFIL INSTITUCIONAL
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * GET /institutional-profile
   * Retorna o perfil institucional do tenant combinado com dados do tenant
   *
   * NOTA: Não requer permissão VIEW_INSTITUTIONAL_PROFILE pois qualquer usuário
   * autenticado do tenant precisa acessar esses dados para gerar documentos (PDFs)
   * com cabeçalho institucional. Apenas operações de escrita (POST/PATCH) requerem
   * a permissão UPDATE_INSTITUTIONAL_PROFILE.
   */
  @Get()
  async getProfile(@CurrentUser('tenantId') tenantId: string) {
    return this.service.getFullProfile(tenantId)
  }

  /**
   * POST /institutional-profile
   * Cria ou atualiza o perfil institucional e dados do tenant
   */
  @Post()
  @RequirePermissions(PermissionType.UPDATE_INSTITUTIONAL_PROFILE)
  async createOrUpdateProfile(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: UpdateInstitutionalProfileDto
  ) {
    return this.service.updateFullProfile(tenantId, dto)
  }

  /**
   * POST /institutional-profile/logo
   * Upload de logo institucional
   */
  @Post('logo')
  @RequirePermissions(PermissionType.UPDATE_INSTITUTIONAL_PROFILE)
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(
    @CurrentUser('tenantId') tenantId: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /(jpg|jpeg|png|webp|pdf)$/ })
        .addMaxSizeValidator({ maxSize: MAX_FILE_SIZE })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY })
    )
    file: Express.Multer.File
  ) {
    return this.service.uploadLogo(tenantId, file)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DOCUMENTOS INSTITUCIONAIS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * GET /institutional-profile/documents
   * Lista todos os documentos com filtros opcionais
   */
  @Get('documents')
  @RequirePermissions(PermissionType.VIEW_INSTITUTIONAL_PROFILE)
  async getDocuments(
    @CurrentUser('tenantId') tenantId: string,
    @Query('type') type?: string,
    @Query('status') status?: string
  ) {
    return this.service.getDocuments(tenantId, {
      type,
      status: status as any,
    })
  }

  /**
   * POST /institutional-profile/documents/with-file-url
   * Cria documento a partir de arquivo já enviado
   * (usado quando o arquivo é enviado primeiro via /files/upload)
   * IMPORTANTE: Deve vir ANTES de POST documents para não ser capturado pela rota genérica
   */
  @Post('documents/with-file-url')
  @RequirePermissions(PermissionType.UPDATE_INSTITUTIONAL_PROFILE)
  async createDocumentWithFileUrl(
    @CurrentUser() user: any,
    @Body() dto: CreateTenantDocumentWithUrlDto
  ) {
    const tenantId = user.tenantId
    const userId = user.id

    return this.service.createDocumentWithFileUrl(tenantId, userId, dto)
  }

  /**
   * GET /institutional-profile/documents/:id
   * Busca um documento específico
   */
  @Get('documents/:id')
  @RequirePermissions(PermissionType.VIEW_INSTITUTIONAL_PROFILE)
  async getDocument(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') documentId: string
  ) {
    return this.service.getDocument(tenantId, documentId)
  }

  /**
   * POST /institutional-profile/documents
   * Upload de novo documento
   */
  @Post('documents')
  @RequirePermissions(PermissionType.UPDATE_INSTITUTIONAL_PROFILE)
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @CurrentUser() user: any,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /(jpg|jpeg|png|webp|pdf)$/ })
        .addMaxSizeValidator({ maxSize: MAX_FILE_SIZE })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY })
    )
    file: Express.Multer.File,
    @Body() body: any
  ) {
    console.log('🔍 DEBUG uploadDocument - user:', user)
    console.log('🔍 DEBUG uploadDocument - body:', body)

    const tenantId = user.tenantId
    const userId = user.id

    // Extrair DTO dos campos do FormData
    // Converter strings vazias para undefined para passar na validação
    // class-validator rejeita strings vazias mesmo com @IsOptional()
    const dto: CreateTenantDocumentDto = {
      type: body.type,
      issuedAt: body.issuedAt && body.issuedAt.trim() !== '' ? body.issuedAt : undefined,
      expiresAt: body.expiresAt && body.expiresAt.trim() !== '' ? body.expiresAt : undefined,
      documentNumber: body.documentNumber && body.documentNumber.trim() !== '' ? body.documentNumber : undefined,
      issuerEntity: body.issuerEntity && body.issuerEntity.trim() !== '' ? body.issuerEntity : undefined,
      tags: body.tags ? (typeof body.tags === 'string' ? JSON.parse(body.tags) : body.tags) : undefined,
      notes: body.notes && body.notes.trim() !== '' ? body.notes : undefined,
    }

    console.log('🔍 DEBUG uploadDocument - tenantId:', tenantId, 'userId:', userId, 'dto:', dto)

    return this.service.uploadDocument(tenantId, userId, file, dto)
  }

  /**
   * PATCH /institutional-profile/documents/:id
   * Atualiza metadados do documento (sem alterar o arquivo)
   */
  @Patch('documents/:id')
  @RequirePermissions(PermissionType.UPDATE_INSTITUTIONAL_PROFILE)
  async updateDocumentMetadata(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') documentId: string,
    @Body() dto: UpdateTenantDocumentDto
  ) {
    return this.service.updateDocumentMetadata(tenantId, documentId, dto)
  }

  /**
   * POST /institutional-profile/documents/:id/file
   * Substitui o arquivo de um documento existente
   */
  @Post('documents/:id/file')
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
   * DELETE /institutional-profile/documents/:id
   * Remove um documento
   */
  @Delete('documents/:id')
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
   * GET /institutional-profile/compliance
   * Dashboard de compliance com estatísticas
   */
  @Get('compliance')
  @RequirePermissions(PermissionType.VIEW_INSTITUTIONAL_PROFILE)
  async getComplianceDashboard(@CurrentUser('tenantId') tenantId: string) {
    return this.service.getComplianceDashboard(tenantId)
  }

  /**
   * GET /institutional-profile/requirements/:legalNature
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
   * GET /institutional-profile/all-document-types/:legalNature
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
   * POST /institutional-profile/update-statuses
   * Atualiza o status de todos os documentos (cron job)
   * Apenas admin pode executar manualmente
   */
  @Post('update-statuses')
  @RequirePermissions(PermissionType.UPDATE_INSTITUTIONAL_PROFILE)
  async updateDocumentsStatus() {
    return this.service.updateDocumentsStatus()
  }
}
