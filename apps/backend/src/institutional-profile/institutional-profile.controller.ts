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
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { InstitutionalProfileService } from './institutional-profile.service'
import { CreateTenantProfileDto, UpdateTenantProfileDto, CreateTenantDocumentDto, UpdateTenantDocumentDto, UpdateInstitutionalProfileDto } from './dto'
import { getRequiredDocuments, getDocumentLabel, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from './config/document-requirements.config'
import { LegalNature } from '@prisma/client'

@Controller('institutional-profile')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InstitutionalProfileController {
  constructor(private readonly service: InstitutionalProfileService) {}

  // ──────────────────────────────────────────────────────────────────────────
  // PERFIL INSTITUCIONAL
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * GET /institutional-profile
   * Retorna o perfil institucional do tenant combinado com dados do tenant
   */
  @Get()
  @Roles('admin', 'user')
  async getProfile(@CurrentUser('tenantId') tenantId: string) {
    return this.service.getFullProfile(tenantId)
  }

  /**
   * POST /institutional-profile
   * Cria ou atualiza o perfil institucional e dados do tenant
   */
  @Post()
  @Roles('admin')
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
  @Roles('admin')
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
  @Roles('admin', 'user')
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
   * GET /institutional-profile/documents/:id
   * Busca um documento específico
   */
  @Get('documents/:id')
  @Roles('admin', 'user')
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
  @Roles('admin')
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
    const userId = user.sub

    // Extrair DTO dos campos do FormData
    const dto: CreateTenantDocumentDto = {
      type: body.type,
      issuedAt: body.issuedAt,
      expiresAt: body.expiresAt,
      notes: body.notes,
    }

    console.log('🔍 DEBUG uploadDocument - tenantId:', tenantId, 'userId:', userId, 'dto:', dto)

    return this.service.uploadDocument(tenantId, userId, file, dto)
  }

  /**
   * PATCH /institutional-profile/documents/:id
   * Atualiza metadados do documento (sem alterar o arquivo)
   */
  @Patch('documents/:id')
  @Roles('admin')
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
  @Roles('admin')
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
  @Roles('admin')
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
  @Roles('admin', 'user')
  async getComplianceDashboard(@CurrentUser('tenantId') tenantId: string) {
    return this.service.getComplianceDashboard(tenantId)
  }

  /**
   * GET /institutional-profile/requirements/:legalNature
   * Lista documentos obrigatórios para uma natureza jurídica
   */
  @Get('requirements/:legalNature')
  @Roles('admin', 'user')
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
   * POST /institutional-profile/update-statuses
   * Atualiza o status de todos os documentos (cron job)
   * Apenas admin pode executar manualmente
   */
  @Post('update-statuses')
  @Roles('admin')
  async updateDocumentsStatus() {
    return this.service.updateDocumentsStatus()
  }
}
