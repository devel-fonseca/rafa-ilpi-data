/**
 * Testes Unitários - ComplianceAssessmentsService
 *
 * Testa funcionalidades de autodiagnóstico RDC 502/2021:
 * - Criação de assessments
 * - Salvamento de respostas (auto-save)
 * - Cálculo de pontuação (algoritmo ANVISA)
 * - Geração de relatórios
 * - Comparação histórica
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ComplianceAssessmentsService } from './compliance-assessments.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { AssessmentStatus } from './dto';

describe('ComplianceAssessmentsService', () => {
  let service: ComplianceAssessmentsService;
  let prismaService: any;
  let tenantContextService: any;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-456';
  const mockVersionId = 'version-789';
  const mockAssessmentId = 'assessment-abc';

  const mockVersion = {
    id: mockVersionId,
    regulationName: 'RDC 502/2021',
    versionNumber: 1,
    effectiveDate: new Date('2021-08-01'),
    expiresAt: null,
  };

  const mockQuestions = Array.from({ length: 37 }, (_, i) => ({
    id: `question-${i + 1}`,
    versionId: mockVersionId,
    questionNumber: i + 1,
    questionText: `Questão ${i + 1}`,
    criticalityLevel: i < 10 ? 'C' : 'NC',
    legalReference: 'RDC 502/2021',
    category: 'Categoria Teste',
    responseOptions: [
      { points: 0, text: 'Não atende' },
      { points: 1, text: 'Atende parcialmente (1)' },
      { points: 2, text: 'Atende parcialmente (2)' },
      { points: 3, text: 'Atende totalmente' },
      { points: 4, text: 'Supera (4)' },
      { points: 5, text: 'Supera (5)' },
    ],
  }));

  const mockAssessment = {
    id: mockAssessmentId,
    tenantId: mockTenantId,
    versionId: mockVersionId,
    assessmentDate: new Date(),
    performedBy: mockUserId,
    status: AssessmentStatus.DRAFT,
    totalQuestions: 37,
    questionsAnswered: 0,
    questionsNA: 0,
    applicableQuestions: 37,
    totalPointsObtained: 0,
    totalPointsPossible: 0,
    compliancePercentage: 0,
    complianceLevel: 'IRREGULAR',
    notes: null,
    criticalNonCompliant: null,
  };

  beforeEach(async () => {
    const mockPrismaClient = {
      complianceQuestionVersion: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      complianceQuestion: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      tenant: {
        findUnique: jest.fn(),
      },
    };

    const mockTenantClient = {
      complianceAssessment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      complianceAssessmentResponse: {
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
    };

    prismaService = mockPrismaClient;
    tenantContextService = {
      tenantId: mockTenantId,
      client: mockTenantClient,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceAssessmentsService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: TenantContextService,
          useValue: tenantContextService,
        },
      ],
    }).compile();

    service = module.get<ComplianceAssessmentsService>(ComplianceAssessmentsService);

    jest.clearAllMocks();
  });

  describe('getQuestions()', () => {
    it('deve retornar versão atual quando versionId não for informado', async () => {
      prismaService.complianceQuestionVersion.findFirst.mockResolvedValue(mockVersion);
      prismaService.complianceQuestion.findMany.mockResolvedValue(mockQuestions);

      const result = await service.getQuestions();

      expect(result.version).toEqual(mockVersion);
      expect(result.questions).toHaveLength(37);
      expect(prismaService.complianceQuestionVersion.findFirst).toHaveBeenCalledWith({
        where: { expiresAt: null },
        orderBy: { effectiveDate: 'desc' },
      });
    });

    it('deve retornar versão específica quando versionId for informado', async () => {
      prismaService.complianceQuestionVersion.findUnique.mockResolvedValue(mockVersion);
      prismaService.complianceQuestion.findMany.mockResolvedValue(mockQuestions);

      const result = await service.getQuestions(mockVersionId);

      expect(result.version).toEqual(mockVersion);
      expect(prismaService.complianceQuestionVersion.findUnique).toHaveBeenCalledWith({
        where: { id: mockVersionId },
      });
    });

    it('deve lançar NotFoundException se versão não existir', async () => {
      prismaService.complianceQuestionVersion.findFirst.mockResolvedValue(null);

      await expect(service.getQuestions()).rejects.toThrow(NotFoundException);
    });

    it('deve ordenar questões por questionNumber', async () => {
      prismaService.complianceQuestionVersion.findFirst.mockResolvedValue(mockVersion);
      prismaService.complianceQuestion.findMany.mockResolvedValue(mockQuestions);

      await service.getQuestions();

      expect(prismaService.complianceQuestion.findMany).toHaveBeenCalledWith({
        where: { versionId: mockVersionId },
        orderBy: { questionNumber: 'asc' },
      });
    });
  });

  describe('createAssessment()', () => {
    const createDto = {
      notes: 'Assessment de teste',
    };

    it('deve criar assessment em status DRAFT', async () => {
      prismaService.complianceQuestionVersion.findFirst.mockResolvedValue(mockVersion);
      prismaService.complianceQuestion.findMany.mockResolvedValue(mockQuestions);
      tenantContextService.client.complianceAssessment.create.mockResolvedValue(mockAssessment);

      const result = await service.createAssessment(mockUserId, createDto);

      expect(result).toEqual(mockAssessment);
      expect(tenantContextService.client.complianceAssessment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          versionId: mockVersionId,
          performedBy: mockUserId,
          status: AssessmentStatus.DRAFT,
          totalQuestions: 37,
          questionsAnswered: 0,
          questionsNA: 0,
          applicableQuestions: 37,
          notes: createDto.notes,
        }),
      });
    });

    it('deve usar tenantId do TenantContextService', async () => {
      prismaService.complianceQuestionVersion.findFirst.mockResolvedValue(mockVersion);
      prismaService.complianceQuestion.findMany.mockResolvedValue(mockQuestions);
      tenantContextService.client.complianceAssessment.create.mockResolvedValue(mockAssessment);

      await service.createAssessment(mockUserId, createDto);

      expect(tenantContextService.client.complianceAssessment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: mockTenantId,
          }),
        }),
      );
    });

    it('deve aceitar userId como null', async () => {
      prismaService.complianceQuestionVersion.findFirst.mockResolvedValue(mockVersion);
      prismaService.complianceQuestion.findMany.mockResolvedValue(mockQuestions);
      tenantContextService.client.complianceAssessment.create.mockResolvedValue({
        ...mockAssessment,
        performedBy: null,
      });

      await service.createAssessment(null, createDto);

      expect(tenantContextService.client.complianceAssessment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            performedBy: undefined,
          }),
        }),
      );
    });
  });

  describe('findOne()', () => {
    const mockResponses = [
      {
        id: 'response-1',
        assessmentId: mockAssessmentId,
        questionId: 'question-1',
        questionNumber: 1,
        selectedPoints: 3,
        selectedText: 'Atende totalmente',
        isNotApplicable: false,
        questionTextSnapshot: 'Questão 1',
        criticalityLevel: 'C',
        observations: null,
      },
    ];

    it('deve retornar assessment com respostas', async () => {
      tenantContextService.client.complianceAssessment.findUnique.mockResolvedValue({
        ...mockAssessment,
        responses: mockResponses,
      });

      // Mock para buscar categorias das questões
      prismaService.complianceQuestion.findMany.mockResolvedValue([
        {
          id: 'question-1',
          category: 'Categoria Teste',
        },
      ]);

      const result = await service.findOne(mockAssessmentId);

      expect(result.id).toBe(mockAssessmentId);
      expect(result.responses).toHaveLength(1);
    });

    it('deve lançar NotFoundException se assessment não existir', async () => {
      tenantContextService.client.complianceAssessment.findUnique.mockResolvedValue(null);

      await expect(service.findOne(mockAssessmentId)).rejects.toThrow(NotFoundException);
    });

    it('deve converter null para undefined nos campos opcionais', async () => {
      tenantContextService.client.complianceAssessment.findUnique.mockResolvedValue({
        ...mockAssessment,
        performedBy: null,
        notes: null,
        responses: [
          {
            ...mockResponses[0],
            selectedPoints: null,
            selectedText: null,
            observations: null,
          },
        ],
      });

      // Mock para buscar categorias das questões
      prismaService.complianceQuestion.findMany.mockResolvedValue([
        {
          id: 'question-1',
          category: 'Categoria Teste',
        },
      ]);

      const result = await service.findOne(mockAssessmentId);

      expect(result.performedBy).toBeUndefined();
      expect(result.notes).toBeUndefined();
      expect(result.responses).toBeDefined();
      expect(result.responses![0].selectedPoints).toBeUndefined();
      expect(result.responses![0].selectedText).toBeUndefined();
      expect(result.responses![0].observations).toBeUndefined();
    });
  });

  describe('saveResponse()', () => {
    const submitDto = {
      questionId: 'question-1',
      questionNumber: 1,
      selectedPoints: 3,
      selectedText: 'Atende totalmente',
      isNotApplicable: false,
      observations: 'Teste',
    };

    const mockQuestion = mockQuestions[0];

    beforeEach(() => {
      tenantContextService.client.complianceAssessment.findUnique.mockResolvedValue(mockAssessment);
      prismaService.complianceQuestion.findUnique.mockResolvedValue(mockQuestion);
    });

    it('deve salvar resposta com sucesso', async () => {
      tenantContextService.client.complianceAssessmentResponse.upsert.mockResolvedValue({
        id: 'response-1',
        ...submitDto,
      });
      tenantContextService.client.complianceAssessmentResponse.findMany.mockResolvedValue([]);

      await service.saveResponse(mockAssessmentId, submitDto);

      expect(tenantContextService.client.complianceAssessmentResponse.upsert).toHaveBeenCalled();
    });

    it('deve lançar NotFoundException se assessment não existir', async () => {
      tenantContextService.client.complianceAssessment.findUnique.mockResolvedValue(null);

      await expect(service.saveResponse(mockAssessmentId, submitDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar BadRequestException se assessment já foi finalizado', async () => {
      tenantContextService.client.complianceAssessment.findUnique.mockResolvedValue({
        ...mockAssessment,
        status: AssessmentStatus.COMPLETED,
      });

      await expect(service.saveResponse(mockAssessmentId, submitDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve salvar questionTextSnapshot para auditoria', async () => {
      tenantContextService.client.complianceAssessmentResponse.upsert.mockResolvedValue({});
      tenantContextService.client.complianceAssessmentResponse.findMany.mockResolvedValue([]);

      await service.saveResponse(mockAssessmentId, submitDto);

      expect(tenantContextService.client.complianceAssessmentResponse.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            questionTextSnapshot: mockQuestion.questionText,
            criticalityLevel: mockQuestion.criticalityLevel,
          }),
        }),
      );
    });
  });

  describe('completeAssessment()', () => {
    it('deve lançar BadRequestException se assessment incompleto', async () => {
      tenantContextService.client.complianceAssessment.findUnique.mockResolvedValue({
        ...mockAssessment,
        questionsAnswered: 30, // Menos de 37
        responses: [],
      });

      await expect(service.completeAssessment(mockAssessmentId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar BadRequestException se já foi finalizado', async () => {
      tenantContextService.client.complianceAssessment.findUnique.mockResolvedValue({
        ...mockAssessment,
        status: AssessmentStatus.COMPLETED,
        questionsAnswered: 37,
        responses: [],
      });

      await expect(service.completeAssessment(mockAssessmentId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve calcular pontuação e atualizar assessment', async () => {
      const mockResponses = Array.from({ length: 37 }, (_, i) => ({
        questionNumber: i + 1,
        questionTextSnapshot: `Questão ${i + 1}`,
        criticalityLevel: i < 10 ? 'C' : 'NC',
        selectedPoints: 3,
        isNotApplicable: false,
      }));

      tenantContextService.client.complianceAssessment.findUnique.mockResolvedValue({
        ...mockAssessment,
        questionsAnswered: 37,
        responses: mockResponses,
      });

      tenantContextService.client.complianceAssessment.update.mockResolvedValue({
        ...mockAssessment,
        status: AssessmentStatus.COMPLETED,
        totalPointsObtained: 111, // 37 questões × 3 pontos
        totalPointsPossible: 111, // 37 questões × 3 pontos máximos
        compliancePercentage: 100,
        complianceLevel: 'REGULAR',
      });

      const result = await service.completeAssessment(mockAssessmentId);

      expect(result.status).toBe(AssessmentStatus.COMPLETED);
      expect(tenantContextService.client.complianceAssessment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockAssessmentId },
          data: expect.objectContaining({
            status: AssessmentStatus.COMPLETED,
          }),
        }),
      );
    });
  });

  describe('compareAssessments()', () => {
    it('deve lançar BadRequestException se menos de 2 assessments', async () => {
      await expect(service.compareAssessments(['assessment-1'])).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve comparar múltiplos assessments e calcular evolução', async () => {
      const firstAssessment = {
        ...mockAssessment,
        id: 'assessment-1',
        assessmentDate: new Date('2024-01-01'),
        compliancePercentage: 60,
        totalPointsObtained: 66.6,
        totalPointsPossible: 111,
        complianceLevel: 'PARCIAL',
        criticalNonCompliant: [],
        responses: [],
      };

      const lastAssessment = {
        ...mockAssessment,
        id: 'assessment-2',
        assessmentDate: new Date('2024-06-01'),
        compliancePercentage: 85,
        totalPointsObtained: 94.35,
        totalPointsPossible: 111,
        complianceLevel: 'REGULAR',
        criticalNonCompliant: [],
        responses: [],
      };

      tenantContextService.client.complianceAssessment.findMany.mockResolvedValue([
        firstAssessment,
        lastAssessment,
      ]);

      const result = await service.compareAssessments(['assessment-1', 'assessment-2']);

      expect(result.assessments).toHaveLength(2);
      expect(result.percentageEvolution).toBeGreaterThan(0);
      expect(result.trend).toBe('MELHORANDO');
    });
  });

  describe('Multi-Tenancy', () => {
    it('deve SEMPRE usar tenantId do TenantContextService', async () => {
      prismaService.complianceQuestionVersion.findFirst.mockResolvedValue(mockVersion);
      prismaService.complianceQuestion.findMany.mockResolvedValue(mockQuestions);
      tenantContextService.client.complianceAssessment.create.mockResolvedValue(mockAssessment);

      await service.createAssessment(mockUserId, {});

      const createCall =
        tenantContextService.client.complianceAssessment.create.mock.calls[0][0];
      expect(createCall.data.tenantId).toBe(mockTenantId);
    });

    it('NÃO deve aceitar tenantId como parâmetro (schema isolation)', () => {
      // Verificar que nenhum método público aceita tenantId como parâmetro
      expect(service.createAssessment.length).toBe(2); // userId, dto (sem tenantId)
      expect(service.findOne.length).toBe(1); // assessmentId (sem tenantId)
      expect(service.saveResponse.length).toBe(2); // assessmentId, dto (sem tenantId)
    });
  });
});
