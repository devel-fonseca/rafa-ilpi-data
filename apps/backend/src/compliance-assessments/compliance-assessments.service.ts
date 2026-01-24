import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { parseISO } from 'date-fns';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import {
  CreateAssessmentDto,
  SubmitResponseDto,
  QueryAssessmentDto,
  AssessmentResultDto,
  PaginatedAssessmentsDto,
  AssessmentStatus,
  CategoryStatsDto,
  ComparisonResultDto,
  AssessmentComparisonDto,
  CriticalNonCompliantDto,
} from './dto';
import {
  calculateScoring,
  calculateCategoryStats,
  AssessmentResponseForScoring,
} from './utils/scoring-calculator';
import { CompliancePDFGenerator } from './utils/pdf-generator';

/**
 * Service para gerenciamento de autodiagnósticos de conformidade RDC 502/2021
 *
 * Responsabilidades:
 * - CRUD de assessments (criar, buscar, listar)
 * - Salvar respostas individuais (auto-save)
 * - Recalcular progresso após cada resposta
 * - Finalizar assessment e calcular pontuação final
 * - Gerar relatórios detalhados
 */
@Injectable()
export class ComplianceAssessmentsService {
  private readonly logger = new Logger(ComplianceAssessmentsService.name);

  constructor(
    private readonly prisma: PrismaService, // Schema público (questões)
    private readonly tenantContext: TenantContextService, // Schema tenant (assessments)
  ) {}

  /**
   * Buscar questões da versão atual ou específica
   */
  async getQuestions(versionId?: string) {
    // Se não informado, buscar versão atual (sem expiresAt)
    let version;

    if (versionId) {
      version = await this.prisma.complianceQuestionVersion.findUnique({
        where: { id: versionId },
      });
    } else {
      version = await this.prisma.complianceQuestionVersion.findFirst({
        where: { expiresAt: null },
        orderBy: { effectiveDate: 'desc' },
      });
    }

    if (!version) {
      throw new NotFoundException('Versão da regulamentação não encontrada');
    }

    // Buscar todas as questões da versão
    const questions = await this.prisma.complianceQuestion.findMany({
      where: { versionId: version.id },
      orderBy: { questionNumber: 'asc' },
    });

    return {
      version,
      questions,
    };
  }

  /**
   * Criar novo autodiagnóstico
   */
  async createAssessment(userId: string | null, dto: CreateAssessmentDto) {
    // Buscar versão (ou usar versão atual)
    const { version } = await this.getQuestions(dto.versionId);

    // TenantContext já injeta o tenantId correto via schema isolation
    const tenantId = this.tenantContext.tenantId;

    // Criar assessment em status DRAFT
    const assessment = await this.tenantContext.client.complianceAssessment.create({
      data: {
        tenantId,
        versionId: version.id,
        assessmentDate: new Date(),
        performedBy: userId ?? undefined,
        status: AssessmentStatus.DRAFT,
        totalQuestions: 37, // RDC 502/2021 tem 37 questões
        questionsAnswered: 0,
        questionsNA: 0,
        applicableQuestions: 37,
        totalPointsObtained: 0,
        totalPointsPossible: 0,
        compliancePercentage: 0,
        complianceLevel: 'IRREGULAR',
        notes: dto.notes,
      },
    });

    this.logger.log(`Autodiagnóstico criado: ${assessment.id} (Tenant: ${tenantId})`);

    return assessment;
  }

  /**
   * Buscar assessment específico com respostas
   */
  async findOne(assessmentId: string): Promise<AssessmentResultDto> {
    const assessment = await this.tenantContext.client.complianceAssessment.findUnique({
      where: { id: assessmentId },
      include: {
        responses: {
          orderBy: { questionNumber: 'asc' },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException('Autodiagnóstico não encontrado');
    }

    // Calcular estatísticas por categoria (se tiver respostas)
    let categoryStats: CategoryStatsDto[] | undefined;

    if (assessment.responses.length > 0) {
      // Buscar categorias das questões
      const questionIds = assessment.responses.map((r) => r.questionId);
      const questions = await this.prisma.complianceQuestion.findMany({
        where: { id: { in: questionIds } },
        select: { id: true, category: true },
      });

      const questionCategoryMap = new Map(questions.map((q) => [q.id, q.category]));

      const responsesWithCategory = assessment.responses.map((r) => ({
        ...r,
        category: questionCategoryMap.get(r.questionId) ?? undefined,
        questionText: r.questionTextSnapshot,
        selectedPoints: r.selectedPoints ?? undefined,
      }));

      categoryStats = calculateCategoryStats(responsesWithCategory);
    }

    return {
      ...assessment,
      performedBy: assessment.performedBy ?? undefined,
      notes: assessment.notes ?? undefined,
      responses: assessment.responses.map((r) => ({
        ...r,
        selectedPoints: r.selectedPoints ?? undefined,
        selectedText: r.selectedText ?? undefined,
        observations: r.observations ?? undefined,
      })),
      criticalNonCompliant: assessment.criticalNonCompliant
        ? (assessment.criticalNonCompliant as unknown as CriticalNonCompliantDto[])
        : undefined,
      categoryStats,
    };
  }

  /**
   * Listar assessments do tenant com filtros e paginação
   */
  async findAll(
    query: QueryAssessmentDto,
  ): Promise<PaginatedAssessmentsDto> {
    const { page = 1, limit = 10, status, complianceLevel, versionId, startDate, endDate, performedBy } = query;

    // TenantContext já filtra pelo schema correto (não precisa WHERE tenantId)
    const where: Prisma.ComplianceAssessmentWhereInput = {
      deletedAt: null,
    };

    if (status) where.status = status;
    if (complianceLevel) where.complianceLevel = complianceLevel;
    if (versionId) where.versionId = versionId;
    if (performedBy) where.performedBy = performedBy;

    if (startDate || endDate) {
      where.assessmentDate = {
        ...(startDate && { gte: parseISO(`${startDate}T00:00:00.000`) }),
        ...(endDate && { lte: parseISO(`${endDate}T23:59:59.999`) }),
      };
    }

    // Buscar total de registros
    const total = await this.tenantContext.client.complianceAssessment.count({ where });

    // Buscar assessments com paginação
    const assessments = await this.tenantContext.client.complianceAssessment.findMany({
      where,
      orderBy: { assessmentDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: assessments.map((a) => ({
        ...a,
        performedBy: a.performedBy ?? undefined,
        notes: a.notes ?? undefined,
        criticalNonCompliant: a.criticalNonCompliant
          ? (a.criticalNonCompliant as unknown as CriticalNonCompliantDto[])
          : undefined,
      })),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Salvar resposta individual (auto-save)
   */
  async saveResponse(
    assessmentId: string,
    dto: SubmitResponseDto,
  ) {
    // Verificar se assessment existe (TenantContext já garante isolamento)
    const assessment = await this.tenantContext.client.complianceAssessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) {
      throw new NotFoundException('Autodiagnóstico não encontrado');
    }

    if (assessment.status !== AssessmentStatus.DRAFT) {
      throw new BadRequestException('Autodiagnóstico já foi finalizado e não pode ser editado');
    }

    // Buscar dados da questão (para snapshot)
    const question = await this.prisma.complianceQuestion.findUnique({
      where: { id: dto.questionId },
    });

    if (!question) {
      throw new NotFoundException('Questão não encontrada');
    }

    // TenantContext já injeta o tenantId correto
    const tenantId = this.tenantContext.tenantId;

    // Upsert da resposta
    const response = await this.tenantContext.client.complianceAssessmentResponse.upsert({
      where: {
        assessmentId_questionNumber: {
          assessmentId,
          questionNumber: dto.questionNumber,
        },
      },
      create: {
        tenantId,
        assessmentId,
        questionId: dto.questionId,
        questionNumber: dto.questionNumber,
        selectedPoints: dto.isNotApplicable ? null : dto.selectedPoints,
        selectedText: dto.isNotApplicable ? null : dto.selectedText,
        isNotApplicable: dto.isNotApplicable,
        questionTextSnapshot: question.questionText,
        criticalityLevel: question.criticalityLevel,
        observations: dto.observations,
      },
      update: {
        selectedPoints: dto.isNotApplicable ? null : dto.selectedPoints,
        selectedText: dto.isNotApplicable ? null : dto.selectedText,
        isNotApplicable: dto.isNotApplicable,
        observations: dto.observations,
      },
    });

    // Recalcular progresso do assessment
    await this.updateAssessmentProgress(assessmentId);

    this.logger.debug(`Resposta salva: Q${dto.questionNumber} (Assessment: ${assessmentId})`);

    return response;
  }

  /**
   * Recalcular progresso do assessment após salvar resposta
   */
  private async updateAssessmentProgress(assessmentId: string) {
    // Buscar todas as respostas do assessment
    const responses = await this.tenantContext.client.complianceAssessmentResponse.findMany({
      where: { assessmentId },
    });

    const questionsAnswered = responses.length;
    const questionsNA = responses.filter((r) => r.isNotApplicable).length;
    const applicableQuestions = 37 - questionsNA;

    // Atualizar contadores
    await this.tenantContext.client.complianceAssessment.update({
      where: { id: assessmentId },
      data: {
        questionsAnswered,
        questionsNA,
        applicableQuestions,
      },
    });
  }

  /**
   * Finalizar assessment e calcular pontuação
   */
  async completeAssessment(assessmentId: string) {
    // Buscar assessment com respostas (TenantContext já garante isolamento)
    const assessment = await this.tenantContext.client.complianceAssessment.findUnique({
      where: { id: assessmentId },
      include: {
        responses: true,
      },
    });

    if (!assessment) {
      throw new NotFoundException('Autodiagnóstico não encontrado');
    }

    if (assessment.status !== AssessmentStatus.DRAFT) {
      throw new BadRequestException('Autodiagnóstico já foi finalizado');
    }

    // Verificar se todas as questões foram respondidas
    if (assessment.questionsAnswered < 37) {
      throw new BadRequestException(
        `Autodiagnóstico incompleto: ${assessment.questionsAnswered}/37 questões respondidas`,
      );
    }

    // Calcular pontuação final
    const scoringData: AssessmentResponseForScoring[] = assessment.responses.map((r) => ({
      questionNumber: r.questionNumber,
      questionText: r.questionTextSnapshot,
      criticalityLevel: r.criticalityLevel,
      selectedPoints: r.selectedPoints ?? undefined,
      isNotApplicable: r.isNotApplicable,
    }));

    const scoring = calculateScoring(scoringData);

    // Atualizar assessment com resultados finais
    const completedAssessment = await this.tenantContext.client.complianceAssessment.update({
      where: { id: assessmentId },
      data: {
        status: AssessmentStatus.COMPLETED,
        totalPointsObtained: scoring.totalPointsObtained,
        totalPointsPossible: scoring.totalPointsPossible,
        compliancePercentage: scoring.compliancePercentage,
        complianceLevel: scoring.complianceLevel,
        criticalNonCompliant: scoring.criticalNonCompliant,
      },
    });

    this.logger.log(
      `Autodiagnóstico finalizado: ${assessmentId} - ${scoring.complianceLevel} (${scoring.compliancePercentage}%)`,
    );

    return completedAssessment;
  }

  /**
   * Gerar relatório detalhado de um assessment (já incluso no findOne)
   * Este método é um alias para findOne com foco em relatórios
   */
  async generateReport(assessmentId: string): Promise<AssessmentResultDto> {
    return this.findOne(assessmentId);
  }

  /**
   * Comparar múltiplos assessments (histórico de evolução)
   */
  async compareAssessments(assessmentIds: string[]): Promise<ComparisonResultDto> {
    if (assessmentIds.length < 2) {
      throw new BadRequestException('É necessário fornecer ao menos 2 assessments para comparação');
    }

    // Buscar todos os assessments
    const assessments = await this.tenantContext.client.complianceAssessment.findMany({
      where: {
        id: { in: assessmentIds },
        status: AssessmentStatus.COMPLETED, // Só compara finalizados
      },
      include: {
        responses: {
          orderBy: { questionNumber: 'asc' },
        },
      },
      orderBy: { assessmentDate: 'asc' },
    });

    if (assessments.length < 2) {
      throw new NotFoundException('Assessments não encontrados ou não finalizados');
    }

    // Montar dados de comparação
    const comparisonData: AssessmentComparisonDto[] = assessments.map((a) => ({
      id: a.id,
      assessmentDate: a.assessmentDate,
      compliancePercentage: a.compliancePercentage,
      complianceLevel: a.complianceLevel,
      totalPointsObtained: a.totalPointsObtained,
      totalPointsPossible: a.totalPointsPossible,
      criticalNonCompliantCount: a.criticalNonCompliant
        ? (a.criticalNonCompliant as unknown as CriticalNonCompliantDto[]).length
        : 0,
    }));

    // Calcular evolução (primeiro vs último)
    const first = comparisonData[0];
    const last = comparisonData[comparisonData.length - 1];

    const percentageEvolution = last.compliancePercentage - first.compliancePercentage;
    const pointsEvolution = last.totalPointsObtained - first.totalPointsObtained;

    // Comparar respostas questão por questão para identificar melhorias/regressões
    let improvementsCount = 0;
    let regressionsCount = 0;

    const firstAssessment = assessments[0];
    const lastAssessment = assessments[assessments.length - 1];

    // Criar mapas de respostas por número de questão
    const firstResponses = new Map(
      firstAssessment.responses.map((r) => [r.questionNumber, r.selectedPoints ?? 0]),
    );
    const lastResponses = new Map(
      lastAssessment.responses.map((r) => [r.questionNumber, r.selectedPoints ?? 0]),
    );

    // Comparar pontuações
    for (let i = 1; i <= 37; i++) {
      const firstPoints = firstResponses.get(i) ?? 0;
      const lastPoints = lastResponses.get(i) ?? 0;

      if (lastPoints > firstPoints) improvementsCount++;
      if (lastPoints < firstPoints) regressionsCount++;
    }

    // Determinar tendência
    let trend: 'MELHORANDO' | 'ESTAGNADO' | 'PIORANDO';
    if (percentageEvolution > 5) {
      trend = 'MELHORANDO';
    } else if (percentageEvolution < -5) {
      trend = 'PIORANDO';
    } else {
      trend = 'ESTAGNADO';
    }

    return {
      assessments: comparisonData,
      percentageEvolution: Math.round(percentageEvolution * 100) / 100,
      pointsEvolution: Math.round(pointsEvolution * 100) / 100,
      improvementsCount,
      regressionsCount,
      trend,
    };
  }

  /**
   * Exportar assessment como PDF
   */
  async exportPDF(assessmentId: string): Promise<Buffer> {
    // Buscar assessment completo
    const assessment = await this.findOne(assessmentId);

    // Buscar nome do tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: assessment.tenantId },
      select: { name: true },
    });

    const tenantName = tenant?.name || 'ILPI';

    // Gerar PDF
    const pdfBuffer = await CompliancePDFGenerator.generatePDF(assessment, tenantName);

    this.logger.log(`PDF gerado para assessment: ${assessmentId}`);

    return pdfBuffer;
  }

  /**
   * Excluir assessment
   */
  async deleteAssessment(assessmentId: string): Promise<void> {
    // Buscar assessment para validar existência
    const assessment = await this.findOne(assessmentId);

    // Excluir respostas primeiro (devido a foreign key constraint)
    await this.tenantContext.client.complianceAssessmentResponse.deleteMany({
      where: { assessmentId },
    });

    // Excluir assessment
    await this.tenantContext.client.complianceAssessment.delete({
      where: { id: assessmentId },
    });

    this.logger.log(`Assessment excluído: ${assessmentId} (tenant: ${assessment.tenantId})`);
  }
}
