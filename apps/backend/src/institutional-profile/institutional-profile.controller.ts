import { Controller, Get, Post, Body, UseGuards, UseInterceptors, UploadedFile, ParseFilePipeBuilder, HttpStatus } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard } from '../permissions/guards/permissions.guard'
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { InstitutionalProfileService } from './institutional-profile.service'
import { UpdateInstitutionalProfileDto } from './dto'
import { MAX_FILE_SIZE } from './config/document-requirements.config'
import { PermissionType } from '@prisma/client'

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

}
