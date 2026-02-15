import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ComplianceAssessmentsService } from './compliance-assessments.service';
import {
  CreateAssessmentDto,
  SubmitResponseDto,
  QueryAssessmentDto,
  AssessmentResultDto,
  PaginatedAssessmentsDto,
  ComparisonResultDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';
import { PermissionType } from '@prisma/client';
import { AuditAction, AuditEntity } from '../audit/audit.decorator';
import { Request, Response } from 'express';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { FeatureGuard } from '../common/guards/feature.guard';
import { RequireFeatures } from '../common/decorators/require-features.decorator';

@ApiTags('Compliance Assessments - RDC 502/2021')
@ApiBearerAuth()
@Controller('compliance-assessments')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeatures('autodiagnostico_rdc')
@AuditEntity('COMPLIANCE_ASSESSMENT')
export class ComplianceAssessmentsController {
  constructor(private readonly assessmentsService: ComplianceAssessmentsService) {}

  /**
   * GET /compliance-assessments/questions
   * Buscar questões da versão atual da RDC 502/2021
   */
  @Get('questions')
  @RequirePermissions(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  @ApiOperation({
    summary: 'Buscar questões da RDC 502/2021',
    description:
      'Retorna as 37 questões do Roteiro Objetivo de Inspeção ILPI da versão atual ou específica',
  })
  @ApiResponse({
    status: 200,
    description: 'Questões retornadas com sucesso',
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para visualizar compliance' })
  async getQuestions(@Query('versionId') versionId?: string) {
    return this.assessmentsService.getQuestions(versionId);
  }

  /**
   * POST /compliance-assessments
   * Criar novo autodiagnóstico
   */
  @Post()
  @RequirePermissions(PermissionType.MANAGE_COMPLIANCE_ASSESSMENT)
  @AuditAction('CREATE')
  @ApiOperation({
    summary: 'Criar novo autodiagnóstico',
    description: 'Inicia um novo autodiagnóstico em status DRAFT',
  })
  @ApiResponse({
    status: 201,
    description: 'Autodiagnóstico criado com sucesso',
    type: AssessmentResultDto,
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para gerenciar autodiagnósticos' })
  async create(
    @Body() dto: CreateAssessmentDto,
    @Req() req: Request & { user: JwtPayload },
  ) {
    const { id: userId } = req.user;
    return this.assessmentsService.createAssessment(userId, dto);
  }

  /**
   * GET /compliance-assessments
   * Listar autodiagnósticos do tenant
   */
  @Get()
  @RequirePermissions(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  @ApiOperation({
    summary: 'Listar autodiagnósticos',
    description: 'Retorna lista paginada de autodiagnósticos com filtros',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista retornada com sucesso',
    type: PaginatedAssessmentsDto,
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para visualizar compliance' })
  async findAll(@Query() query: QueryAssessmentDto) {
    return this.assessmentsService.findAll(query);
  }

  /**
   * GET /compliance-assessments/:id
   * Buscar autodiagnóstico específico
   */
  @Get(':id')
  @RequirePermissions(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  @AuditAction('READ')
  @ApiOperation({
    summary: 'Buscar autodiagnóstico',
    description: 'Retorna autodiagnóstico específico com todas as respostas',
  })
  @ApiResponse({
    status: 200,
    description: 'Autodiagnóstico retornado com sucesso',
    type: AssessmentResultDto,
  })
  @ApiResponse({ status: 404, description: 'Autodiagnóstico não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para visualizar compliance' })
  @ApiParam({
    name: 'id',
    description: 'ID do autodiagnóstico (UUID)',
    type: String,
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.assessmentsService.findOne(id);
  }

  /**
   * POST /compliance-assessments/:id/responses
   * Salvar resposta individual (auto-save)
   */
  @Post(':id/responses')
  @RequirePermissions(PermissionType.MANAGE_COMPLIANCE_ASSESSMENT)
  @AuditAction('UPDATE')
  @ApiOperation({
    summary: 'Salvar resposta de questão',
    description: 'Salva ou atualiza resposta individual (auto-save)',
  })
  @ApiResponse({
    status: 200,
    description: 'Resposta salva com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Autodiagnóstico ou questão não encontrada' })
  @ApiResponse({ status: 400, description: 'Autodiagnóstico já finalizado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para gerenciar autodiagnósticos' })
  @ApiParam({
    name: 'id',
    description: 'ID do autodiagnóstico (UUID)',
    type: String,
  })
  async saveResponse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitResponseDto,
  ) {
    return this.assessmentsService.saveResponse(id, dto);
  }

  /**
   * POST /compliance-assessments/:id/complete
   * Finalizar autodiagnóstico e calcular pontuação
   */
  @Post(':id/complete')
  @RequirePermissions(PermissionType.MANAGE_COMPLIANCE_ASSESSMENT)
  @AuditAction('UPDATE')
  @ApiOperation({
    summary: 'Finalizar autodiagnóstico',
    description: 'Finaliza autodiagnóstico, calcula pontuação final e classifica conformidade',
  })
  @ApiResponse({
    status: 200,
    description: 'Autodiagnóstico finalizado com sucesso',
    type: AssessmentResultDto,
  })
  @ApiResponse({ status: 404, description: 'Autodiagnóstico não encontrado' })
  @ApiResponse({ status: 400, description: 'Autodiagnóstico incompleto ou já finalizado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para gerenciar autodiagnósticos' })
  @ApiParam({
    name: 'id',
    description: 'ID do autodiagnóstico (UUID)',
    type: String,
  })
  async complete(@Param('id', ParseUUIDPipe) id: string) {
    return this.assessmentsService.completeAssessment(id);
  }

  /**
   * GET /compliance-assessments/:id/report
   * Gerar relatório detalhado (JSON)
   */
  @Get(':id/report')
  @RequirePermissions(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  @AuditAction('READ')
  @ApiOperation({
    summary: 'Gerar relatório detalhado',
    description: 'Retorna relatório JSON completo com estatísticas e não conformidades',
  })
  @ApiResponse({
    status: 200,
    description: 'Relatório gerado com sucesso',
    type: AssessmentResultDto,
  })
  @ApiResponse({ status: 404, description: 'Autodiagnóstico não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para visualizar compliance' })
  @ApiParam({
    name: 'id',
    description: 'ID do autodiagnóstico (UUID)',
    type: String,
  })
  async generateReport(@Param('id', ParseUUIDPipe) id: string) {
    return this.assessmentsService.generateReport(id);
  }

  /**
   * GET /compliance-assessments/:id/pdf
   * Exportar autodiagnóstico como PDF
   */
  @Get(':id/pdf')
  @RequirePermissions(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  @AuditAction('READ')
  @ApiOperation({
    summary: 'Exportar PDF',
    description: 'Gera e baixa relatório de autodiagnóstico em formato PDF',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF gerado com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Autodiagnóstico não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para visualizar compliance' })
  @ApiParam({
    name: 'id',
    description: 'ID do autodiagnóstico (UUID)',
    type: String,
  })
  async exportPDF(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.assessmentsService.exportPDF(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="autodiagnostico-rdc-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }

  /**
   * GET /compliance-assessments/history/comparison
   * Comparar assessments históricos
   */
  @Get('history/comparison')
  @RequirePermissions(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  @AuditAction('READ')
  @ApiOperation({
    summary: 'Comparar assessments históricos',
    description: 'Compara múltiplos assessments para análise de evolução temporal',
  })
  @ApiResponse({
    status: 200,
    description: 'Comparação gerada com sucesso',
    type: ComparisonResultDto,
  })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos (mínimo 2 assessments)' })
  @ApiResponse({ status: 404, description: 'Assessments não encontrados' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para visualizar compliance' })
  async compareAssessments(@Query('ids') ids: string) {
    const assessmentIds = ids.split(',').map((id) => id.trim());
    return this.assessmentsService.compareAssessments(assessmentIds);
  }

  /**
   * DELETE /compliance-assessments/:id
   * Excluir autodiagnóstico
   */
  @Delete(':id')
  @RequirePermissions(PermissionType.MANAGE_COMPLIANCE_ASSESSMENT)
  @AuditAction('DELETE')
  @ApiOperation({
    summary: 'Excluir autodiagnóstico',
    description: 'Remove permanentemente um autodiagnóstico e suas respostas',
  })
  @ApiResponse({
    status: 200,
    description: 'Autodiagnóstico excluído com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Autodiagnóstico não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para gerenciar autodiagnósticos' })
  @ApiParam({
    name: 'id',
    description: 'ID do autodiagnóstico (UUID)',
    type: String,
  })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.assessmentsService.deleteAssessment(id);
  }
}
