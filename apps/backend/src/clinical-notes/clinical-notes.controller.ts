import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger'
import { ClinicalNotesService } from './clinical-notes.service'
import {
  CreateClinicalNoteDto,
  UpdateClinicalNoteDto,
  QueryClinicalNoteDto,
  DeleteClinicalNoteDto,
} from './dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard } from '../permissions/guards/permissions.guard'
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { AuditEntity, AuditAction } from '../audit/audit.decorator'
import { PermissionType } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { getAuthorizedProfessions } from './professional-authorization.config'

/**
 * Controller para gerenciamento de Evoluções Clínicas Multiprofissionais (SOAP)
 *
 * Endpoints:
 * - POST /clinical-notes - Criar evolução
 * - GET /clinical-notes - Listar com filtros
 * - GET /clinical-notes/resident/:residentId - Listar por residente
 * - GET /clinical-notes/:id - Buscar por ID
 * - GET /clinical-notes/:id/history - Histórico de versões
 * - PATCH /clinical-notes/:id - Atualizar (com versionamento)
 * - DELETE /clinical-notes/:id - Soft delete
 * - GET /clinical-notes/tags/suggestions - Tags disponíveis
 */
@ApiTags('Clinical Notes (SOAP)')
@ApiBearerAuth()
@Controller('clinical-notes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@AuditEntity('CLINICAL_NOTE')
export class ClinicalNotesController {
  constructor(
    private readonly clinicalNotesService: ClinicalNotesService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Criar nova evolução clínica
   */
  @Post()
  @RequirePermissions(PermissionType.CREATE_CLINICAL_NOTES)
  @AuditAction('CREATE')
  @UseInterceptors(FileInterceptor('pdfFile'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary: 'Criar evolução clínica (SOAP)',
    description:
      'Cria uma nova evolução clínica multiprofissional usando metodologia SOAP. ' +
      'Ao menos um campo SOAP (S, O, A ou P) deve ser preenchido. ' +
      'A janela de edição é de 12 horas a partir da data da evolução. ' +
      'Se um documento Tiptap for incluído, enviar o PDF gerado via pdfFile.',
  })
  @ApiBody({
    description: 'Dados da evolução clínica + PDF opcional do documento',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'string',
          description: 'JSON stringificado do CreateClinicalNoteDto',
        },
        pdfFile: {
          type: 'string',
          format: 'binary',
          description: 'PDF do documento Tiptap (opcional)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Evolução criada com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou nenhum campo SOAP preenchido',
  })
  @ApiResponse({ status: 403, description: 'Sem permissão CREATE_CLINICAL_NOTES' })
  create(
    @Body() body: any,
    @CurrentUser() user: any,
    @UploadedFile() pdfFile?: Express.Multer.File,
  ) {
    // Se FormData foi enviado, parsear o campo 'data'
    let createDto: CreateClinicalNoteDto
    if (typeof body.data === 'string') {
      try {
        createDto = JSON.parse(body.data)
      } catch (e) {
        throw new Error('Invalid JSON in data field')
      }
    } else {
      createDto = body
    }

    return this.clinicalNotesService.create(createDto, user.id, user.tenantId, pdfFile)
  }

  /**
   * Listar evoluções clínicas com filtros e paginação
   */
  @Get()
  @RequirePermissions(PermissionType.VIEW_CLINICAL_NOTES)
  @ApiOperation({
    summary: 'Listar evoluções clínicas',
    description:
      'Retorna lista paginada de evoluções clínicas com filtros opcionais por profissão, período e tags.',
  })
  @ApiResponse({ status: 200, description: 'Lista de evoluções clínicas' })
  @ApiResponse({ status: 403, description: 'Sem permissão VIEW_CLINICAL_NOTES' })
  @ApiQuery({ name: 'profession', required: false, description: 'Filtrar por profissão' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Data inicial (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Data final (ISO 8601)' })
  @ApiQuery({
    name: 'tags',
    required: false,
    description: 'Filtrar por tags (array de strings)',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Página (padrão: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Itens por página (padrão: 20)' })
  findAll(@Query() queryDto: QueryClinicalNoteDto, @CurrentUser() user: any) {
    return this.clinicalNotesService.findAll(queryDto, user.tenantId)
  }

  /**
   * Buscar profissões autorizadas para o usuário logado
   */
  @Get('authorized-professions')
  @RequirePermissions(PermissionType.VIEW_CLINICAL_NOTES)
  @ApiOperation({
    summary: 'Buscar profissões que o usuário pode registrar',
    description:
      'Retorna lista de profissões clínicas que o usuário logado está habilitado a registrar, ' +
      'baseado no seu cargo (positionCode) e nas competências legais dos conselhos profissionais.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de profissões autorizadas',
    schema: {
      example: ['MEDICINE', 'NURSING'],
    },
  })
  @ApiResponse({ status: 403, description: 'Sem permissão VIEW_CLINICAL_NOTES' })
  async getAuthorizedProfessionsForUser(@CurrentUser() user: any) {
    // Buscar positionCode e registrationType do usuário
    const userProfile = await this.prisma.userProfile.findUnique({
      where: {
        userId: user.id,
      },
      select: {
        positionCode: true,
        registrationType: true,
      },
    })

    if (!userProfile || !userProfile.positionCode) {
      return []
    }

    // Se não é RT, retornar profissões baseadas no cargo
    if (userProfile.positionCode !== 'TECHNICAL_MANAGER') {
      return getAuthorizedProfessions(userProfile.positionCode)
    }

    // Se é RT, mapear registrationType para profissão específica
    const registrationToProfession: Record<string, string> = {
      CRM: 'MEDICINE',
      COREN: 'NURSING',
      CRN: 'NUTRITION',
      CREFITO: 'PHYSIOTHERAPY',
      CRP: 'PSYCHOLOGY',
      CRESS: 'SOCIAL_WORK',
      CREFONO: 'SPEECH_THERAPY',
    }

    if (userProfile.registrationType && registrationToProfession[userProfile.registrationType]) {
      return [registrationToProfession[userProfile.registrationType]]
    }

    // Fallback: se RT sem registro válido, retornar vazio
    return []
  }

  /**
   * Listar evoluções clínicas de um residente
   */
  @Get('resident/:residentId')
  @RequirePermissions(PermissionType.VIEW_CLINICAL_NOTES)
  @ApiOperation({
    summary: 'Listar evoluções por residente',
    description:
      'Retorna todas as evoluções clínicas de um residente em ordem cronológica (mais recente primeiro).',
  })
  @ApiResponse({ status: 200, description: 'Lista de evoluções do residente' })
  @ApiResponse({ status: 403, description: 'Sem permissão VIEW_CLINICAL_NOTES' })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  @ApiParam({ name: 'residentId', description: 'ID do residente (UUID)' })
  findByResident(
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Query() queryDto: QueryClinicalNoteDto,
    @CurrentUser() user: any,
  ) {
    return this.clinicalNotesService.findByResident(residentId, user.tenantId, queryDto)
  }

  /**
   * Buscar sugestões de tags
   */
  @Get('tags/suggestions')
  @RequirePermissions(PermissionType.VIEW_CLINICAL_NOTES)
  @ApiOperation({
    summary: 'Buscar tags disponíveis',
    description:
      'Retorna lista de tags únicas usadas em evoluções clínicas (para autocomplete).',
  })
  @ApiResponse({ status: 200, description: 'Lista de tags disponíveis' })
  @ApiResponse({ status: 403, description: 'Sem permissão VIEW_CLINICAL_NOTES' })
  getTagsSuggestions(@CurrentUser() user: any) {
    return this.clinicalNotesService.getTagsSuggestions(user.tenantId)
  }

  /**
   * Buscar documentos clínicos (Tiptap) de um residente
   */
  @Get('documents/resident/:residentId')
  @RequirePermissions(PermissionType.VIEW_CLINICAL_NOTES)
  @ApiOperation({
    summary: 'Buscar documentos clínicos de um residente',
    description:
      'Retorna todos os documentos Tiptap (PDFs) criados junto com evoluções clínicas de um residente.',
  })
  @ApiResponse({ status: 200, description: 'Lista de documentos clínicos' })
  @ApiResponse({ status: 403, description: 'Sem permissão VIEW_CLINICAL_NOTES' })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  @ApiParam({ name: 'residentId', description: 'ID do residente (UUID)' })
  getDocumentsByResident(
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @CurrentUser() user: any,
  ) {
    return this.clinicalNotesService.getDocumentsByResident(residentId, user.tenantId)
  }

  /**
   * Buscar histórico de versões
   */
  @Get(':id/history')
  @RequirePermissions(PermissionType.VIEW_CLINICAL_NOTES)
  @ApiOperation({
    summary: 'Buscar histórico de versões',
    description:
      'Retorna todas as versões de uma evolução clínica em ordem cronológica (versão 1, 2, 3...).',
  })
  @ApiResponse({ status: 200, description: 'Histórico de versões' })
  @ApiResponse({ status: 403, description: 'Sem permissão VIEW_CLINICAL_NOTES' })
  @ApiResponse({ status: 404, description: 'Evolução clínica não encontrada' })
  @ApiParam({ name: 'id', description: 'ID da evolução clínica (UUID)' })
  getHistory(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.clinicalNotesService.getHistory(id, user.tenantId)
  }

  /**
   * Buscar evolução clínica por ID
   */
  @Get(':id')
  @RequirePermissions(PermissionType.VIEW_CLINICAL_NOTES)
  @ApiOperation({
    summary: 'Buscar evolução por ID',
    description: 'Retorna detalhes completos de uma evolução clínica.',
  })
  @ApiResponse({ status: 200, description: 'Evolução clínica encontrada' })
  @ApiResponse({ status: 403, description: 'Sem permissão VIEW_CLINICAL_NOTES' })
  @ApiResponse({ status: 404, description: 'Evolução clínica não encontrada' })
  @ApiParam({ name: 'id', description: 'ID da evolução clínica (UUID)' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.clinicalNotesService.findOne(id, user.tenantId)
  }

  /**
   * Atualizar evolução clínica (com versionamento)
   */
  @Patch(':id')
  @RequirePermissions(PermissionType.UPDATE_CLINICAL_NOTES)
  @AuditAction('UPDATE')
  @ApiOperation({
    summary: 'Atualizar evolução clínica',
    description:
      'Atualiza evolução clínica com versionamento automático. ' +
      'Apenas o autor pode editar. Janela de edição de 12 horas. ' +
      'Motivo da edição é obrigatório (mínimo 10 caracteres).',
  })
  @ApiResponse({ status: 200, description: 'Evolução atualizada com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou motivo de edição muito curto',
  })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão, não é o autor ou janela de edição expirada',
  })
  @ApiResponse({ status: 404, description: 'Evolução clínica não encontrada' })
  @ApiParam({ name: 'id', description: 'ID da evolução clínica (UUID)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateClinicalNoteDto,
    @CurrentUser() user: any,
  ) {
    return this.clinicalNotesService.update(id, updateDto, user.id, user.tenantId)
  }

  /**
   * Soft delete de evolução clínica
   */
  @Delete(':id')
  @RequirePermissions(PermissionType.DELETE_CLINICAL_NOTES)
  @AuditAction('DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Excluir evolução clínica (soft delete)',
    description:
      'Marca evolução como obsoleta (isAmended = true). ' +
      'Apenas ADMINISTRATOR e TECHNICAL_MANAGER podem excluir. ' +
      'Motivo da exclusão é obrigatório (mínimo 10 caracteres).',
  })
  @ApiResponse({ status: 204, description: 'Evolução excluída com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Motivo de exclusão muito curto',
  })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão DELETE_CLINICAL_NOTES',
  })
  @ApiResponse({ status: 404, description: 'Evolução clínica não encontrada' })
  @ApiParam({ name: 'id', description: 'ID da evolução clínica (UUID)' })
  async softDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() deleteDto: DeleteClinicalNoteDto,
    @CurrentUser() user: any,
  ) {
    await this.clinicalNotesService.softDelete(id, deleteDto, user.id, user.tenantId)
  }

  /**
   * GET /clinical-notes/prefill-from-alert/:alertId
   * Pré-preencher evolução clínica a partir de alerta de sinal vital
   */
  @Get('prefill-from-alert/:alertId')
  @ApiOperation({
    summary: 'Pré-preencher evolução a partir de alerta',
    description:
      'Retorna sugestões de preenchimento dos campos SOAP (Objective e Assessment) baseadas em um alerta de sinal vital',
  })
  @ApiResponse({
    status: 200,
    description: 'Dados de preenchimento retornados com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Alerta não encontrado' })
  @ApiParam({ name: 'alertId', description: 'ID do alerta de sinal vital (UUID)' })
  async prefillFromAlert(
    @Param('alertId', ParseUUIDPipe) alertId: string,
    @CurrentUser() user: any,
  ) {
    return this.clinicalNotesService.prefillFromAlert(alertId, user.tenantId)
  }
}
