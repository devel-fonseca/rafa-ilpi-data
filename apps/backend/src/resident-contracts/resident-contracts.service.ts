/* eslint-disable no-restricted-syntax */
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Readable } from 'stream';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { FilesService } from '../files/files.service';
import { FileProcessingService } from '../files/file-processing.service';
import { CreateContractDto, SignatoryDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { ReplaceContractFileDto } from './dto/replace-contract-file.dto';
import { AttachContractFileDto } from './dto/attach-contract-file.dto';
import { CorrectContractDto } from './dto/correct-contract.dto';
import { RenewContractDto } from './dto/renew-contract.dto';
import { RescindContractDto } from './dto/rescind-contract.dto';
import { differenceInDays, parseISO } from 'date-fns';
import { ContractDocumentStatus, ContractHistoryAction, Prisma } from '@prisma/client';
import { DEFAULT_TIMEZONE, getCurrentDateInTz, parseDateOnly } from '../utils/date.helpers';
import { FinancialContractTransactionsService } from '../financial-operations/services/financial-contract-transactions.service';
import { FieldEncryption } from '../prisma/middleware/field-encryption.class';

/**
 * Serviço de digitalização de contratos de prestação de serviços
 *
 * Responsável por:
 * - Upload e processamento de contratos físicos (imagem ou PDF)
 * - Adicionar carimbo institucional para autenticação digital
 * - Gerenciar metadados (vigência, valores, assinantes)
 * - Versionamento completo com histórico
 * - Validação pública de documentos por hash SHA-256
 * - Cálculo automático de status baseado na data de vigência
 */
@Injectable()
export class ResidentContractsService {
  private readonly logger = new Logger(ResidentContractsService.name);
  private readonly fieldEncryption = new FieldEncryption();
  private static readonly INDEFINITE_MARKER = '[INDEFINITE]';
  private static readonly VERSION_LABEL_REGEX = /\[VERSION_LABEL=(\d+\.\d+)\]/;
  private static readonly RESCISSION_AT_REGEX = /\[RESCINDED_AT=([0-9-]+)\]/;
  private static readonly RESCISSION_REASON_REGEX = /\[RESCISSION_REASON=([^\]]+)\]/;

  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema)
    private readonly tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
    private readonly filesService: FilesService,
    private readonly fileProcessingService: FileProcessingService,
    private readonly financialContractTransactionsService: FinancialContractTransactionsService,
  ) {}

  private decryptMaybeEncrypted(value: string | null | undefined): string | null {
    if (!value) return null;
    if (!this.fieldEncryption.isEncrypted(value)) return value;
    return this.fieldEncryption.decrypt(value, this.tenantContext.tenantId);
  }

  private decryptSignatories(signatories: unknown): unknown {
    if (!Array.isArray(signatories)) return signatories;

    return signatories.map((signatory) => {
      if (!signatory || typeof signatory !== 'object' || Array.isArray(signatory)) {
        return signatory;
      }

      const signatoryRecord = signatory as Record<string, unknown>;
      const cpfValue = signatoryRecord.cpf;

      return {
        ...signatoryRecord,
        cpf:
          typeof cpfValue === 'string'
            ? this.decryptMaybeEncrypted(cpfValue)
            : cpfValue,
      };
    });
  }

  private sanitizeContractPayload<T extends Record<string, unknown>>(contract: T): T {
    const payload: Record<string, unknown> = {
      ...contract,
      signatories: this.decryptSignatories(contract.signatories),
    };

    if (
      contract.resident &&
      typeof contract.resident === 'object' &&
      !Array.isArray(contract.resident)
    ) {
      const residentRecord = contract.resident as Record<string, unknown>;
      const cpfValue = residentRecord.cpf;
      payload.resident = {
        ...residentRecord,
        cpf:
          typeof cpfValue === 'string'
            ? this.decryptMaybeEncrypted(cpfValue)
            : cpfValue,
      };
    }

    return payload as T;
  }

  private sanitizeContractSnapshot(snapshot: unknown): unknown {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      return snapshot;
    }

    return this.sanitizeContractPayload(snapshot as Record<string, unknown>);
  }

  private normalizeContractNumber(contractNumber?: string | null): string {
    if (typeof contractNumber !== 'string') {
      throw new BadRequestException('Número do contrato é obrigatório');
    }
    const trimmed = contractNumber.trim();
    if (trimmed.length === 0) {
      throw new BadRequestException('Número do contrato é obrigatório');
    }
    return trimmed;
  }

  private buildVersionLabel(versionMajor: number, versionMinor: number): string {
    return `${versionMajor}.${versionMinor}`;
  }

  private extractMinorVersion(notes: string | null | undefined): number {
    if (!notes) return 0;
    const match = notes.match(ResidentContractsService.VERSION_LABEL_REGEX);
    if (!match?.[1]) return 0;
    const [, minorPart] = match[1].split('.');
    const parsed = Number(minorPart);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private hasIndefiniteMarker(notes: string | null | undefined): boolean {
    return typeof notes === 'string' && notes.includes(ResidentContractsService.INDEFINITE_MARKER);
  }

  private stripContractMetaMarkers(notes: string | null | undefined): string | null {
    if (!notes) return null;
    return notes
      .replace(ResidentContractsService.VERSION_LABEL_REGEX, '')
      .replace(ResidentContractsService.RESCISSION_AT_REGEX, '')
      .replace(ResidentContractsService.RESCISSION_REASON_REGEX, '')
      .replace(ResidentContractsService.INDEFINITE_MARKER, '')
      .trim();
  }

  private buildContractNotesWithMeta(
    baseNotes: string | null | undefined,
    versionLabel: string,
    isIndefinite = false,
    rescindedAtDateOnly?: string,
    rescissionReason?: string,
  ): string {
    const sanitizedBase = this.stripContractMetaMarkers(baseNotes);
    const parts = [`[VERSION_LABEL=${versionLabel}]`];
    if (isIndefinite) {
      parts.push(ResidentContractsService.INDEFINITE_MARKER);
    }
    if (rescindedAtDateOnly) {
      parts.push(`[RESCINDED_AT=${rescindedAtDateOnly}]`);
    }
    if (rescissionReason) {
      parts.push(`[RESCISSION_REASON=${rescissionReason}]`);
    }
    if (sanitizedBase) {
      parts.push(sanitizedBase);
    }
    return parts.join(' ');
  }

  private extractRescissionMetadata(notes: string | null | undefined): {
    rescindedAt: string | null;
    rescissionReason: string | null;
  } {
    if (!notes) {
      return { rescindedAt: null, rescissionReason: null };
    }
    const rescindedAt = notes.match(ResidentContractsService.RESCISSION_AT_REGEX)?.[1] || null;
    const rescissionReason = notes.match(ResidentContractsService.RESCISSION_REASON_REGEX)?.[1] || null;
    return { rescindedAt, rescissionReason };
  }

  private getVersionLabelFromContract(contract: { version: number; notes: string | null | undefined }): string {
    const minor = this.extractMinorVersion(contract.notes);
    return this.buildVersionLabel(contract.version, minor);
  }

  private resolveContractStatus(endDate: Date | null, isIndefinite: boolean): ContractDocumentStatus {
    if (isIndefinite) {
      return ContractDocumentStatus.VIGENTE;
    }
    if (!endDate) {
      throw new BadRequestException('Data de fim é obrigatória para contrato com prazo determinado');
    }
    return this.calculateContractStatus(endDate);
  }

  private buildContractPdfFileName(
    contractNumber: string | undefined,
    fallbackReference: string,
    version?: number,
  ): string {
    const baseReference = contractNumber?.trim()
      ? contractNumber.trim()
      : `sem-numero-${fallbackReference}`;
    if (version && version > 1) {
      return `contrato-${baseReference}-v${version}.pdf`;
    }
    return `contrato-${baseReference}.pdf`;
  }

  /**
   * Tradeoff: como ResidentContractsService é tenant-scoped (request context),
   * não usamos cron aqui. Em vez disso, sincronizamos status em pontos de leitura.
   * Mantém consistência sem acoplar a um job global não estático.
   */
  private async syncStatusesForTenant(): Promise<void> {
    const todayDateOnly = getCurrentDateInTz(DEFAULT_TIMEZONE);
    const today = parseISO(`${todayDateOnly}T12:00:00.000`);
    const expiringThreshold = new Date(today);
    expiringThreshold.setDate(expiringThreshold.getDate() + 30);

    await this.tenantContext.client.$transaction(async (tx) => {
      await tx.residentContract.updateMany({
        where: {
          tenantId: this.tenantContext.tenantId,
          deletedAt: null,
          isIndefinite: false,
          rescindedAt: null,
          endDate: { lt: today },
          status: { notIn: [ContractDocumentStatus.VENCIDO, ContractDocumentStatus.RESCINDIDO] },
        },
        data: { status: ContractDocumentStatus.VENCIDO },
      });

      await tx.residentContract.updateMany({
        where: {
          tenantId: this.tenantContext.tenantId,
          deletedAt: null,
          isIndefinite: false,
          rescindedAt: null,
          endDate: { gte: today, lte: expiringThreshold },
          status: { notIn: [ContractDocumentStatus.VENCENDO_EM_30_DIAS, ContractDocumentStatus.RESCINDIDO] },
        },
        data: { status: ContractDocumentStatus.VENCENDO_EM_30_DIAS },
      });

      await tx.residentContract.updateMany({
        where: {
          tenantId: this.tenantContext.tenantId,
          deletedAt: null,
          rescindedAt: null,
          OR: [
            { isIndefinite: true },
            {
              isIndefinite: false,
              endDate: { gt: expiringThreshold },
            },
          ],
          status: { notIn: [ContractDocumentStatus.VIGENTE, ContractDocumentStatus.RESCINDIDO] },
        },
        data: { status: ContractDocumentStatus.VIGENTE },
      });
    });
  }

  /**
   * Upload e digitalização de contrato físico
   */
  async uploadContract(
    residentId: string,
    userId: string,
    file: Express.Multer.File | undefined,
    dto: CreateContractDto,
  ) {
    const normalizedContractNumber = this.normalizeContractNumber(
      dto.contractNumber,
    );

    this.logger.log(
      `Iniciando upload de contrato ${normalizedContractNumber} para residente ${residentId}`,
    );

    // 1. Validar residente
    const resident = await this.tenantContext.client.resident.findFirst({
      where: { id: residentId, deletedAt: null },
      select: { id: true, fullName: true, cpf: true },
    });

    if (!resident) {
      throw new NotFoundException('Residente não encontrado');
    }

    // 2. Validar número único
    const existing = await this.tenantContext.client.residentContract.findFirst({
      where: {
        tenantId: this.tenantContext.tenantId,
        deletedAt: null,
        contractNumber: normalizedContractNumber,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Número de contrato "${normalizedContractNumber}" já existe`,
      );
    }

    const hasFile = !!file;

    // 3. Upload arquivo original (opcional)
    const originalUpload = hasFile
      ? await this.filesService.uploadFile(
          this.tenantContext.tenantId,
          file!,
          'contracts-original',
          residentId,
        )
      : null;

    // 4. Obter metadados
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: this.tenantContext.tenantId },
      select: { id: true, name: true, cnpj: true },
    });

    const user = await this.tenantContext.client.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        role: true,
      },
    });

    // Buscar perfil separadamente (pode não existir)
    const userProfile = await this.tenantContext.client.userProfile.findFirst({
      where: { userId },
      select: {
        positionCode: true,
        registrationType: true,
        registrationNumber: true,
        registrationState: true,
      },
    });

    if (!tenant || !user) {
      throw new NotFoundException('Tenant ou usuário não encontrado');
    }

    const contractId = crypto.randomUUID();
    const publicToken = crypto.randomUUID(); // Token público para validação

    // Determinar cargo/role para exibição no carimbo
    const positionNames: Record<string, string> = {
      ADMINISTRATOR: 'Administrador',
      TECHNICAL_MANAGER: 'Responsável Técnico',
      NURSING_COORDINATOR: 'Coordenador de Enfermagem',
      NURSE: 'Enfermeiro',
      NURSING_TECHNICIAN: 'Técnico de Enfermagem',
      NURSING_ASSISTANT: 'Auxiliar de Enfermagem',
      DOCTOR: 'Médico',
      NUTRITIONIST: 'Nutricionista',
      PHYSIOTHERAPIST: 'Fisioterapeuta',
      PSYCHOLOGIST: 'Psicólogo',
      SPEECH_THERAPIST: 'Fonoaudiólogo',
      SOCIAL_WORKER: 'Assistente Social',
      OCCUPATIONAL_THERAPIST: 'Terapeuta Ocupacional',
      CAREGIVER: 'Cuidador de Idosos',
      ADMINISTRATIVE: 'Administrativo',
      OTHER: 'Outro',
    };

    const userRole = userProfile?.positionCode
      ? positionNames[userProfile.positionCode] || userProfile.positionCode
      : user.role;

    // Montar registro profissional (ex: COREN/SP 123456)
    let professionalRegistry: string | undefined;
    if (
      userProfile?.registrationType &&
      userProfile?.registrationNumber &&
      userProfile?.registrationState
    ) {
      professionalRegistry = `${userProfile.registrationType}/${userProfile.registrationState} ${userProfile.registrationNumber}`;
    }

    const metadata = {
      tenantName: tenant.name,
      tenantCnpj: tenant.cnpj || 'Não informado',
      tenantId: tenant.id,
      userName: user.name,
      userRole,
      userProfessionalRegistry: professionalRegistry,
      uploadDate: new Date(),
      hashOriginal: '',
      publicToken,
    };

    let processed: { pdfBuffer: Buffer; hashOriginal: string; hashFinal: string } | null = null;
    let processedUpload: { fileUrl: string } | null = null;

    if (hasFile) {
      // 5. Processar arquivo
      const isImage = file!.mimetype.startsWith('image/');
      processed = isImage
        ? await this.fileProcessingService.processImage(file!.buffer, metadata)
        : await this.fileProcessingService.processPdf(file!.buffer, metadata);

      // 6. Upload PDF processado
      const processedFile: Express.Multer.File = {
        buffer: processed.pdfBuffer,
        originalname: this.buildContractPdfFileName(
          normalizedContractNumber,
          contractId.slice(0, 8),
        ),
        mimetype: 'application/pdf',
        size: processed.pdfBuffer.length,
        fieldname: 'file',
        encoding: '7bit',
        stream: Readable.from(processed.pdfBuffer),
        destination: '',
        filename: '',
        path: '',
      };

      const tenantId = this.tenantContext.tenantId; // Para FilesService (INFRASTRUCTURE)
      processedUpload = await this.filesService.uploadFile(
        tenantId,
        processedFile,
        'contracts',
        residentId,
      );
    }

    const isIndefinite = dto.isIndefinite === true;
    const endDate = isIndefinite ? null : new Date(dto.endDate!);
    const status = this.resolveContractStatus(endDate, isIndefinite);

    // 7.5. Montar array completo de signatories
    // Frontend envia apenas responsável contratual (se houver)
    // Backend adiciona automaticamente ILPI + RESIDENTE
    const signatories: SignatoryDto[] = [
      // ILPI (tenant) - sempre presente
      {
        name: tenant.name,
        cpf: tenant.cnpj || undefined, // CNPJ da ILPI no campo CPF
        role: 'ILPI',
      },
      // RESIDENTE - sempre presente
      {
        name: resident.fullName,
        cpf: resident.cpf || undefined,
        role: 'RESIDENTE',
      },
      // RESPONSAVEL_CONTRATUAL - apenas se fornecido pelo frontend (múltiplos permitidos)
      ...dto.signatories,
    ];

    this.logger.log(
      `Signatories montados: ${signatories.length} assinantes (ILPI, RESIDENTE${dto.signatories.length > 0 ? ` + ${dto.signatories.length} RESPONSAVEL_CONTRATUAL` : ''})`,
    );

    // 8. Criar registro
    const contract = await this.tenantContext.client.$transaction(async (tx) => {
      const created = await tx.residentContract.create({
        data: {
          tenantId: this.tenantContext.tenantId, // ⚠️ TEMPORARY: Schema ainda não migrado
          id: contractId,
          residentId,
          contractNumber: normalizedContractNumber,
          startDate: new Date(dto.startDate),
          endDate,
          isIndefinite,
          monthlyAmount: dto.monthlyAmount,
          dueDay: dto.dueDay,
          lateFeePercent: dto.lateFeePercent ?? 0,
          interestMonthlyPercent: dto.interestMonthlyPercent ?? 0,
          status,
          adjustmentIndex: dto.adjustmentIndex,
          adjustmentRate: dto.adjustmentRate,
          lastAdjustmentDate: dto.lastAdjustmentDate
            ? new Date(dto.lastAdjustmentDate)
            : null,
          signatories: signatories as unknown as Prisma.InputJsonValue,
          notes: dto.notes,
          originalFileUrl: originalUpload?.fileUrl ?? null,
          originalFileKey: originalUpload?.fileUrl ?? null,
          originalFileName: file?.originalname ?? null,
          originalFileSize: file?.size ?? null,
          originalFileMimeType: file?.mimetype ?? null,
          originalFileHash: processed?.hashOriginal ?? null,
          processedFileUrl: processedUpload?.fileUrl ?? null,
          processedFileKey: processedUpload?.fileUrl ?? null,
          processedFileName: processedUpload
            ? this.buildContractPdfFileName(
                normalizedContractNumber,
                contractId.slice(0, 8),
              )
            : null,
          processedFileSize: processed?.pdfBuffer.length ?? null,
          processedFileHash: processed?.hashFinal ?? null,
          publicToken, // Token público para validação
          versionMajor: 1,
          versionMinor: 0,
          uploadedBy: userId,
        },
      });

      // 9. Criar histórico
      await tx.contractHistory.create({
        data: {
          tenantId: this.tenantContext.tenantId, // ⚠️ TEMPORARY: Schema ainda não migrado
          contractId: created.id,
          action: ContractHistoryAction.CREATED,
          reason: null,
          previousData: Prisma.JsonNull,
          newData: created as Prisma.InputJsonValue,
          changedFields: [],
          changedBy: userId,
        },
      });

      return created;
    });

    // 10. Gerar URLs assinadas
    const originalUrl = contract.originalFileUrl
      ? await this.filesService.getFileUrl(contract.originalFileUrl)
      : null;
    const processedUrl = contract.processedFileUrl
      ? await this.filesService.getFileUrl(contract.processedFileUrl)
      : null;

    await this.financialContractTransactionsService.ensureCurrentCompetenceBestEffort({
      userId,
      contractId: contract.id,
    });

    return {
      ...this.sanitizeContractPayload(contract),
      originalFileUrl: originalUrl,
      processedFileUrl: processedUrl,
      versionLabel: this.buildVersionLabel(contract.versionMajor, contract.versionMinor),
    };
  }

  /**
   * Listar TODOS os contratos do tenant com filtros
   * Usado pela listagem geral que mostra contratos de todos os residentes
   */
  async listAllContracts(
    filters?: {
      residentId?: string;
      status?: ContractDocumentStatus;
      search?: string;
    },
  ) {
    await this.syncStatusesForTenant();

    // Construir where clause dinamicamente
    const where: Prisma.ResidentContractWhereInput = {
      deletedAt: null,
    };

    if (filters?.residentId) {
      where.residentId = filters.residentId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    // Busca por nome do residente ou número do contrato
    if (filters?.search) {
      where.OR = [
        { contractNumber: { contains: filters.search, mode: 'insensitive' } },
        { resident: { fullName: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const contracts = await this.tenantContext.client.residentContract.findMany({
      where,
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
            cpf: true,
          },
        },
        uploader: { select: { id: true, name: true } },
      },
      orderBy: [{ status: 'asc' }, { endDate: 'asc' }],
    });

    // Gerar URLs assinadas para os PDFs processados
    const contractsWithUrls = await Promise.all(
      contracts.map(async (contract) => {
        const processedUrl = contract.processedFileUrl
          ? await this.filesService.getFileUrl(contract.processedFileUrl)
          : null;
        return {
          ...this.sanitizeContractPayload(contract),
          processedFileUrl: processedUrl,
          versionLabel: this.buildVersionLabel(contract.versionMajor, contract.versionMinor),
        };
      }),
    );

    return contractsWithUrls;
  }

  /**
   * Listar contratos de um residente específico
   */
  async findAll(
    residentId: string,
    filters?: {
      status?: ContractDocumentStatus;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    await this.syncStatusesForTenant();

    const resident = await this.tenantContext.client.resident.findFirst({
      where: { id: residentId, deletedAt: null },
    });

    if (!resident) {
      throw new NotFoundException('Residente não encontrado');
    }

    const contracts = await this.tenantContext.client.residentContract.findMany({
      where: {
        residentId,
        deletedAt: null,
        status: filters?.status,
        ...(filters?.startDate && { startDate: { gte: filters.startDate } }),
        ...(filters?.endDate && { endDate: { lte: filters.endDate } }),
      },
      include: {
        resident: { select: { id: true } },
        uploader: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const contractsWithUrls = await Promise.all(
      contracts.map(async (contract) => {
        const processedUrl = contract.processedFileUrl
          ? await this.filesService.getFileUrl(contract.processedFileUrl)
          : null;
        return {
          ...this.sanitizeContractPayload(contract),
          processedFileUrl: processedUrl,
          versionLabel: this.buildVersionLabel(contract.versionMajor, contract.versionMinor),
        };
      }),
    );

    return contractsWithUrls;
  }

  /**
   * Buscar um contrato específico
   */
  async findOne(contractId: string) {
    await this.syncStatusesForTenant();

    const contract = await this.tenantContext.client.residentContract.findFirst({
      where: { id: contractId, deletedAt: null },
      include: {
        resident: { select: { id: true, fullName: true, cpf: true, status: true } },
        uploader: { select: { id: true, name: true } },
      },
    });

    if (!contract) {
      throw new NotFoundException('Contrato não encontrado');
    }

    const originalUrl = contract.originalFileUrl
      ? await this.filesService.getFileUrl(contract.originalFileUrl)
      : null;
    const processedUrl = contract.processedFileUrl
      ? await this.filesService.getFileUrl(contract.processedFileUrl)
      : null;

    return {
      ...this.sanitizeContractPayload(contract),
      originalFileUrl: originalUrl,
      processedFileUrl: processedUrl,
      versionLabel: this.buildVersionLabel(contract.versionMajor, contract.versionMinor),
    };
  }

  /**
   * Buscar histórico de um contrato
   */
  async findHistory(contractId: string) {
    const contract = await this.tenantContext.client.residentContract.findFirst({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundException('Contrato não encontrado');
    }

    const history = await this.tenantContext.client.contractHistory.findMany({
      where: { contractId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { changedAt: 'desc' },
    });

    return history.map((entry) => ({
      ...entry,
      previousData: this.sanitizeContractSnapshot(entry.previousData),
      newData: this.sanitizeContractSnapshot(entry.newData),
    }));
  }

  /**
   * Atualizar metadados do contrato
   */
  async updateMetadata(
    contractId: string,
    userId: string,
    dto: UpdateContractDto,
  ) {
    const current = await this.tenantContext.client.residentContract.findFirst({
      where: { id: contractId, deletedAt: null },
    });

    if (!current) {
      throw new NotFoundException('Contrato não encontrado');
    }

    const changedFields: string[] = [];
    const updates: Prisma.ResidentContractUpdateInput = {};
    const normalizedCurrentContractNumber = current.contractNumber;

    if (dto.contractNumber !== undefined) {
      const normalizedNextContractNumber = this.normalizeContractNumber(
        dto.contractNumber,
      );
      if (normalizedNextContractNumber !== normalizedCurrentContractNumber) {
        const existing = await this.tenantContext.client.residentContract.findFirst({
          where: {
            tenantId: this.tenantContext.tenantId,
            deletedAt: null,
            contractNumber: normalizedNextContractNumber,
            id: { not: contractId },
          },
          select: { id: true },
        });

        if (existing) {
          throw new ConflictException(
            `Número de contrato "${normalizedNextContractNumber}" já existe`,
          );
        }

        changedFields.push('contractNumber');
        updates.contractNumber = normalizedNextContractNumber;
      }
    }

    if (dto.startDate && dto.startDate !== current.startDate.toISOString().split('T')[0]) {
      changedFields.push('startDate');
      updates.startDate = new Date(dto.startDate);
    }

    if (dto.isIndefinite !== undefined && dto.isIndefinite !== current.isIndefinite) {
      changedFields.push('isIndefinite');
      updates.isIndefinite = dto.isIndefinite;
      if (dto.isIndefinite) {
        changedFields.push('endDate');
        updates.endDate = null;
        updates.status = ContractDocumentStatus.VIGENTE;
      }
    }

    if (dto.endDate && dto.endDate !== (current.endDate ? current.endDate.toISOString().split('T')[0] : '')) {
      changedFields.push('endDate');
      updates.endDate = new Date(dto.endDate);
      updates.isIndefinite = false;
      updates.status = this.calculateContractStatus(new Date(dto.endDate));
    }

    if (dto.monthlyAmount !== undefined && dto.monthlyAmount !== Number(current.monthlyAmount)) {
      changedFields.push('monthlyAmount');
      updates.monthlyAmount = dto.monthlyAmount;
    }

    if (dto.dueDay !== undefined && dto.dueDay !== current.dueDay) {
      changedFields.push('dueDay');
      updates.dueDay = dto.dueDay;
    }

    if (
      dto.lateFeePercent !== undefined &&
      dto.lateFeePercent !== Number(current.lateFeePercent)
    ) {
      changedFields.push('lateFeePercent');
      updates.lateFeePercent = dto.lateFeePercent;
    }

    if (
      dto.interestMonthlyPercent !== undefined &&
      dto.interestMonthlyPercent !== Number(current.interestMonthlyPercent)
    ) {
      changedFields.push('interestMonthlyPercent');
      updates.interestMonthlyPercent = dto.interestMonthlyPercent;
    }

    if (dto.adjustmentIndex !== undefined) {
      changedFields.push('adjustmentIndex');
      updates.adjustmentIndex = dto.adjustmentIndex;
    }

    if (dto.adjustmentRate !== undefined) {
      changedFields.push('adjustmentRate');
      updates.adjustmentRate = dto.adjustmentRate;
    }

    if (dto.lastAdjustmentDate !== undefined) {
      changedFields.push('lastAdjustmentDate');
      updates.lastAdjustmentDate = dto.lastAdjustmentDate
        ? new Date(dto.lastAdjustmentDate)
        : null;
    }

    if (dto.notes !== undefined) {
      changedFields.push('notes');
      updates.notes = dto.notes;
    }

    if (changedFields.length === 0) {
      return this.findOne(contractId);
    }

    const updated = await this.tenantContext.client.$transaction(async (tx) => {
      const updatedContract = await tx.residentContract.update({
        where: { id: contractId },
        data: updates,
      });

      await tx.contractHistory.create({
        data: {
          tenantId: this.tenantContext.tenantId, // ⚠️ TEMPORARY: Schema ainda não migrado
          contractId,
          action: ContractHistoryAction.UPDATED,
          reason: null,
          previousData: current as Prisma.InputJsonValue,
          newData: updatedContract as Prisma.InputJsonValue,
          changedFields,
          changedBy: userId,
        },
      });

      return updatedContract;
    });

    await this.financialContractTransactionsService.ensureCurrentCompetenceBestEffort({
      userId,
      contractId,
    });

    return this.findOne(updated.id);
  }

  /**
   * Substituir arquivo do contrato (nova versão)
   */
  async replaceFile(
    contractId: string,
    userId: string,
    file: Express.Multer.File,
    dto: ReplaceContractFileDto,
  ) {
    const current = await this.tenantContext.client.residentContract.findFirst({
      where: { id: contractId, deletedAt: null },
    });

    if (!current) {
      throw new NotFoundException('Contrato não encontrado');
    }

    if (current.status === ContractDocumentStatus.RESCINDIDO) {
      throw new BadRequestException('Contrato rescindido não pode receber nova versão');
    }

    if (current.replacedById) {
      throw new BadRequestException(
        'Este contrato já foi substituído. Use o contrato mais recente.',
      );
    }

    // Upload arquivo original
    const originalUpload = await this.filesService.uploadFile(
      this.tenantContext.tenantId,
      file,
      'contracts-original',
      current.residentId,
    );

    // Obter metadados
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: this.tenantContext.tenantId },
      select: { id: true, name: true, cnpj: true },
    });

    const user = await this.tenantContext.client.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true },
    });

    const userProfile = await this.tenantContext.client.userProfile.findFirst({
      where: { userId },
      select: {
        positionCode: true,
        registrationType: true,
        registrationNumber: true,
        registrationState: true,
      },
    });

    if (!tenant || !user) {
      throw new NotFoundException('Tenant ou usuário não encontrado');
    }

    // Processar arquivo
    const isImage = file.mimetype.startsWith('image/');
    const newContractId = crypto.randomUUID();
    const publicToken = crypto.randomUUID(); // Token público para validação

    // Determinar cargo/role para exibição no carimbo
    const positionNames: Record<string, string> = {
      ADMINISTRATOR: 'Administrador',
      TECHNICAL_MANAGER: 'Responsável Técnico',
      NURSING_COORDINATOR: 'Coordenador de Enfermagem',
      NURSE: 'Enfermeiro',
      NURSING_TECHNICIAN: 'Técnico de Enfermagem',
      NURSING_ASSISTANT: 'Auxiliar de Enfermagem',
      DOCTOR: 'Médico',
      NUTRITIONIST: 'Nutricionista',
      PHYSIOTHERAPIST: 'Fisioterapeuta',
      PSYCHOLOGIST: 'Psicólogo',
      SPEECH_THERAPIST: 'Fonoaudiólogo',
      SOCIAL_WORKER: 'Assistente Social',
      OCCUPATIONAL_THERAPIST: 'Terapeuta Ocupacional',
      CAREGIVER: 'Cuidador de Idosos',
      ADMINISTRATIVE: 'Administrativo',
      OTHER: 'Outro',
    };

    const userRole = userProfile?.positionCode
      ? positionNames[userProfile.positionCode] || userProfile.positionCode
      : user.role;

    // Montar registro profissional (ex: COREN/SP 123456)
    let professionalRegistry: string | undefined;
    if (
      userProfile?.registrationType &&
      userProfile?.registrationNumber &&
      userProfile?.registrationState
    ) {
      professionalRegistry = `${userProfile.registrationType}/${userProfile.registrationState} ${userProfile.registrationNumber}`;
    }

    const metadata = {
      tenantName: tenant.name,
      tenantCnpj: tenant.cnpj || 'Não informado',
      tenantId: tenant.id,
      userName: user.name,
      userRole,
      userProfessionalRegistry: professionalRegistry,
      uploadDate: new Date(),
      hashOriginal: '',
      publicToken,
    };

    const processed = isImage
      ? await this.fileProcessingService.processImage(file.buffer, metadata)
      : await this.fileProcessingService.processPdf(file.buffer, metadata);

    // Upload PDF processado
    const processedFile: Express.Multer.File = {
      buffer: processed.pdfBuffer,
      originalname: this.buildContractPdfFileName(
        current.contractNumber,
        current.id.slice(0, 8),
        current.version + 1,
      ),
      mimetype: 'application/pdf',
      size: processed.pdfBuffer.length,
      fieldname: 'file',
      encoding: '7bit',
      stream: Readable.from(processed.pdfBuffer),
      destination: '',
      filename: '',
      path: '',
    };

    const processedUpload = await this.filesService.uploadFile(
      this.tenantContext.tenantId,
      processedFile,
      'contracts',
      current.residentId,
    );

    // Criar novo contrato
    const newContract = await this.tenantContext.client.$transaction(async (tx) => {
      await tx.residentContract.update({
        where: { id: contractId },
        data: { replacedById: newContractId, replacedAt: new Date() },
      });

      const created = await tx.residentContract.create({
        data: {
          tenantId: this.tenantContext.tenantId, // ⚠️ TEMPORARY: Schema ainda não migrado
          id: newContractId,
          residentId: current.residentId,
          contractNumber: current.contractNumber,
          startDate: current.startDate,
          endDate: current.endDate,
          monthlyAmount: current.monthlyAmount,
          dueDay: current.dueDay,
          lateFeePercent: current.lateFeePercent,
          interestMonthlyPercent: current.interestMonthlyPercent,
          status: current.status,
          adjustmentIndex: current.adjustmentIndex,
          adjustmentRate: current.adjustmentRate,
          lastAdjustmentDate: current.lastAdjustmentDate,
          signatories: current.signatories as Prisma.InputJsonValue,
          notes: current.notes,
          originalFileUrl: originalUpload.fileUrl,
          originalFileKey: originalUpload.fileUrl,
          originalFileName: file.originalname,
          originalFileSize: file.size,
          originalFileMimeType: file.mimetype,
          originalFileHash: processed.hashOriginal,
          processedFileUrl: processedUpload.fileUrl,
          processedFileKey: processedUpload.fileUrl,
          processedFileName: this.buildContractPdfFileName(
            current.contractNumber,
            current.id.slice(0, 8),
            current.version + 1,
          ),
          processedFileSize: processed.pdfBuffer.length,
          processedFileHash: processed.hashFinal,
          publicToken, // Token público para validação
          version: current.version + 1,
          versionMajor: current.versionMajor,
          versionMinor: current.versionMinor + 1,
          uploadedBy: userId,
        },
      });

      await tx.contractHistory.create({
        data: {
          tenantId: this.tenantContext.tenantId, // ⚠️ TEMPORARY: Schema ainda não migrado
          contractId: created.id,
          action: ContractHistoryAction.REPLACED,
          reason: dto.reason,
          previousData: current as Prisma.InputJsonValue,
          newData: created as Prisma.InputJsonValue,
          changedFields: ['arquivo'],
          changedBy: userId,
        },
      });

      return created;
    });

    const originalUrl = newContract.originalFileUrl
      ? await this.filesService.getFileUrl(newContract.originalFileUrl)
      : null;
    const processedUrl = newContract.processedFileUrl
      ? await this.filesService.getFileUrl(newContract.processedFileUrl)
      : null;

    return {
      ...this.sanitizeContractPayload(newContract),
      originalFileUrl: originalUrl,
      processedFileUrl: processedUrl,
      versionLabel: this.buildVersionLabel(newContract.versionMajor, newContract.versionMinor),
    };
  }

  async attachFile(
    contractId: string,
    userId: string,
    file: Express.Multer.File,
    dto: AttachContractFileDto,
  ) {
    const current = await this.tenantContext.client.residentContract.findFirst({
      where: { id: contractId, deletedAt: null },
    });

    if (!current) {
      throw new NotFoundException('Contrato não encontrado');
    }

    if (current.processedFileUrl) {
      throw new BadRequestException('Este contrato já possui arquivo anexado. Use correção para gerar nova versão.');
    }

    const originalUpload = await this.filesService.uploadFile(
      this.tenantContext.tenantId,
      file,
      'contracts-original',
      current.residentId,
    );

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: this.tenantContext.tenantId },
      select: { id: true, name: true, cnpj: true },
    });
    const user = await this.tenantContext.client.user.findUnique({
      where: { id: userId },
      select: { name: true, role: true },
    });

    if (!tenant || !user) {
      throw new NotFoundException('Tenant ou usuário não encontrado');
    }

    const metadata = {
      tenantName: tenant.name,
      tenantCnpj: tenant.cnpj || 'Não informado',
      tenantId: tenant.id,
      userName: user.name,
      userRole: user.role,
      userProfessionalRegistry: undefined as string | undefined,
      uploadDate: new Date(),
      hashOriginal: '',
      publicToken: current.publicToken,
    };

    const processed = file.mimetype.startsWith('image/')
      ? await this.fileProcessingService.processImage(file.buffer, metadata)
      : await this.fileProcessingService.processPdf(file.buffer, metadata);

    const processedFile: Express.Multer.File = {
      buffer: processed.pdfBuffer,
      originalname: this.buildContractPdfFileName(
        current.contractNumber,
        current.id.slice(0, 8),
        current.version,
      ),
      mimetype: 'application/pdf',
      size: processed.pdfBuffer.length,
      fieldname: 'file',
      encoding: '7bit',
      stream: Readable.from(processed.pdfBuffer),
      destination: '',
      filename: '',
      path: '',
    };

    const processedUpload = await this.filesService.uploadFile(
      this.tenantContext.tenantId,
      processedFile,
      'contracts',
      current.residentId,
    );

    await this.tenantContext.client.$transaction(async (tx) => {
      const updated = await tx.residentContract.update({
        where: { id: contractId },
        data: {
          originalFileUrl: originalUpload.fileUrl,
          originalFileKey: originalUpload.fileUrl,
          originalFileName: file.originalname,
          originalFileSize: file.size,
          originalFileMimeType: file.mimetype,
          originalFileHash: processed.hashOriginal,
          processedFileUrl: processedUpload.fileUrl,
          processedFileKey: processedUpload.fileUrl,
          processedFileName: this.buildContractPdfFileName(
            current.contractNumber,
            current.id.slice(0, 8),
            current.version,
          ),
          processedFileSize: processed.pdfBuffer.length,
          processedFileHash: processed.hashFinal,
        },
      });

      await tx.contractHistory.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          contractId,
          action: ContractHistoryAction.UPDATED,
          reason: dto.reason || 'Arquivo anexado posteriormente',
          previousData: current as Prisma.InputJsonValue,
          newData: updated as Prisma.InputJsonValue,
          changedFields: ['arquivo'],
          changedBy: userId,
        },
      });
    });

    return this.findOne(contractId);
  }

  async correctContract(
    contractId: string,
    userId: string,
    file: Express.Multer.File,
    dto: CorrectContractDto,
  ) {
    return this.replaceFile(contractId, userId, file, {
      reason: `[CORRECTION] ${dto.reason}`,
    });
  }

  async renewContract(
    contractId: string,
    userId: string,
    dto: RenewContractDto,
  ) {
    const current = await this.tenantContext.client.residentContract.findFirst({
      where: { id: contractId, deletedAt: null },
      include: {
        resident: { select: { fullName: true, cpf: true } },
      },
    });

    if (!current) {
      throw new NotFoundException('Contrato não encontrado');
    }

    if (current.replacedById) {
      throw new BadRequestException('Contrato já possui versão mais nova. Renove a versão atual.');
    }

    if (current.status === ContractDocumentStatus.RESCINDIDO) {
      throw new BadRequestException('Contrato rescindido não pode ser renovado');
    }

    const normalizedContractNumber = dto.contractNumber
      ? this.normalizeContractNumber(dto.contractNumber)
      : current.contractNumber;

    if (normalizedContractNumber !== current.contractNumber) {
      const existing = await this.tenantContext.client.residentContract.findFirst({
        where: {
          tenantId: this.tenantContext.tenantId,
          deletedAt: null,
          contractNumber: normalizedContractNumber,
          id: { not: contractId },
        },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException(`Número de contrato "${normalizedContractNumber}" já existe`);
      }
    }

    const isIndefinite = dto.isIndefinite === true;
    const endDate = isIndefinite ? null : new Date(dto.endDate!);
    const status = this.resolveContractStatus(endDate, isIndefinite);
    const newContractId = crypto.randomUUID();
    const publicToken = crypto.randomUUID();

    const renewed = await this.tenantContext.client.$transaction(async (tx) => {
      await tx.residentContract.update({
        where: { id: contractId },
        data: { replacedById: newContractId, replacedAt: new Date() },
      });

      const created = await tx.residentContract.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          id: newContractId,
          residentId: current.residentId,
          contractNumber: normalizedContractNumber,
          startDate: new Date(dto.startDate),
          endDate,
          isIndefinite,
          monthlyAmount: dto.monthlyAmount ?? current.monthlyAmount,
          dueDay: dto.dueDay ?? current.dueDay,
          lateFeePercent: dto.lateFeePercent ?? current.lateFeePercent,
          interestMonthlyPercent: dto.interestMonthlyPercent ?? current.interestMonthlyPercent,
          status,
          adjustmentIndex: dto.adjustmentIndex ?? current.adjustmentIndex,
          adjustmentRate: dto.adjustmentRate ?? current.adjustmentRate,
          lastAdjustmentDate: dto.lastAdjustmentDate
            ? new Date(dto.lastAdjustmentDate)
            : current.lastAdjustmentDate,
          signatories: current.signatories as Prisma.InputJsonValue,
          notes: dto.notes ?? current.notes,
          originalFileUrl: null,
          originalFileKey: null,
          originalFileName: null,
          originalFileSize: null,
          originalFileMimeType: null,
          originalFileHash: null,
          processedFileUrl: null,
          processedFileKey: null,
          processedFileName: null,
          processedFileSize: null,
          processedFileHash: null,
          publicToken,
          version: current.version + 1,
          versionMajor: current.versionMajor + 1,
          versionMinor: 0,
          uploadedBy: userId,
        },
      });

      await tx.contractHistory.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          contractId: created.id,
          action: ContractHistoryAction.REPLACED,
          reason: `[RENEWAL] ${dto.reason}`,
          previousData: current as Prisma.InputJsonValue,
          newData: created as Prisma.InputJsonValue,
          changedFields: ['vigencia', 'versionMajor'],
          changedBy: userId,
        },
      });

      return created;
    });

    await this.financialContractTransactionsService.ensureCurrentCompetenceBestEffort({
      userId,
      contractId: renewed.id,
    });

    return this.findOne(renewed.id);
  }

  async rescindContract(
    contractId: string,
    userId: string,
    dto: RescindContractDto,
  ) {
    const current = await this.tenantContext.client.residentContract.findFirst({
      where: { id: contractId, deletedAt: null },
    });

    if (!current) {
      throw new NotFoundException('Contrato não encontrado');
    }

    if (current.status === ContractDocumentStatus.RESCINDIDO) {
      throw new BadRequestException('Contrato já está rescindido');
    }

    const rescindedAt = dto.rescindedAt
      ? parseISO(`${parseDateOnly(dto.rescindedAt)}T12:00:00.000`)
      : parseISO(`${getCurrentDateInTz(DEFAULT_TIMEZONE)}T12:00:00.000`);

    await this.tenantContext.client.$transaction(async (tx) => {
      const updated = await tx.residentContract.update({
        where: { id: contractId },
        data: {
          status: ContractDocumentStatus.RESCINDIDO,
          rescindedAt,
          rescissionReason: dto.reason,
          isIndefinite: false,
          endDate: rescindedAt,
        },
      });

      await tx.contractHistory.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          contractId,
          action: ContractHistoryAction.UPDATED,
          reason: `[RESCISSION] ${dto.reason}`,
          previousData: current as Prisma.InputJsonValue,
          newData: updated as Prisma.InputJsonValue,
          changedFields: ['status', 'rescindedAt', 'rescissionReason'],
          changedBy: userId,
        },
      });
    });

    return this.findOne(contractId);
  }

  /**
   * Deletar contrato (soft delete)
   */
  async deleteContract(contractId: string, userId: string) {
    const contract = await this.tenantContext.client.residentContract.findFirst({
      where: { id: contractId, deletedAt: null },
    });

    if (!contract) {
      throw new NotFoundException('Contrato não encontrado');
    }

    await this.tenantContext.client.$transaction(async (tx) => {
      await tx.residentContract.update({
        where: { id: contractId },
        data: { deletedAt: new Date() },
      });

      await tx.contractHistory.create({
        data: {
          tenantId: this.tenantContext.tenantId, // ⚠️ TEMPORARY: Schema ainda não migrado
          contractId,
          action: ContractHistoryAction.DELETED,
          reason: null,
          previousData: contract as Prisma.InputJsonValue,
          newData: Prisma.JsonNull,
          changedFields: [],
          changedBy: userId,
        },
      });
    });

    return { message: 'Contrato deletado com sucesso' };
  }

  /**
   * Validar contrato por hash SHA-256 (endpoint autenticado)
   */
  async validateContract(publicToken: string, hash: string) {
    const contract = await this.tenantContext.client.residentContract.findFirst({
      where: { publicToken },
      include: {
        resident: { select: { id: true, fullName: true } },
      },
    });

    if (!contract) {
      return { valid: false, message: 'Contrato não encontrado' };
    }

    // Buscar informações do tenant (tabela SHARED)
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: this.tenantContext.tenantId },
      select: { name: true, cnpj: true },
    });

    const isValid = contract.processedFileHash === hash;

    if (isValid) {
      return {
        valid: true,
        message: 'Documento autêntico',
        data: {
          contractNumber: contract.contractNumber,
          tenantName: tenant?.name || '',
          tenantCnpj: tenant?.cnpj || '',
          residentName: contract.resident.fullName,
          startDate: contract.startDate,
          endDate: contract.endDate,
          status: contract.status,
          version: contract.version,
          versionLabel: this.buildVersionLabel(contract.versionMajor, contract.versionMinor),
          issuedAt: contract.createdAt,
        },
      };
    } else {
      return {
        valid: false,
        message: 'Hash não corresponde. Documento pode ter sido alterado ou não é autêntico.',
        contractNumber: contract.contractNumber,
      };
    }
  }

  /**
   * Calcular status do contrato baseado na data de vigência
   */
  private calculateContractStatus(endDate: Date): ContractDocumentStatus {
    const todayDateOnly = getCurrentDateInTz(DEFAULT_TIMEZONE);
    const today = parseISO(`${todayDateOnly}T12:00:00.000`);
    const daysUntilExpiry = differenceInDays(endDate, today);

    if (daysUntilExpiry < 0) {
      return ContractDocumentStatus.VENCIDO;
    }

    if (daysUntilExpiry <= 30) {
      return ContractDocumentStatus.VENCENDO_EM_30_DIAS;
    }

    return ContractDocumentStatus.VIGENTE;
  }
}
