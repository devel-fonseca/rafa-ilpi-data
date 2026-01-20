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
import { differenceInDays } from 'date-fns';
import { ContractDocumentStatus, ContractHistoryAction, Prisma } from '@prisma/client';

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

  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema)
    private readonly tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
    private readonly filesService: FilesService,
    private readonly fileProcessingService: FileProcessingService,
  ) {}

  /**
   * Upload e digitalização de contrato físico
   */
  async uploadContract(
    residentId: string,
    userId: string,
    file: Express.Multer.File,
    dto: CreateContractDto,
  ) {
    this.logger.log(
      `Iniciando upload de contrato ${dto.contractNumber} para residente ${residentId}`,
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
        contractNumber: dto.contractNumber,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Número de contrato "${dto.contractNumber}" já existe`,
      );
    }

    // 3. Upload arquivo original
    const originalUpload = await this.filesService.uploadFile(
      this.tenantContext.tenantId,
      file,
      'contracts-original',
      residentId,
    );

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

    // 5. Processar arquivo
    const isImage = file.mimetype.startsWith('image/');
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

    const processed = isImage
      ? await this.fileProcessingService.processImage(file.buffer, metadata)
      : await this.fileProcessingService.processPdf(file.buffer, metadata);

    // 6. Upload PDF processado
    const processedFile: Express.Multer.File = {
      buffer: processed.pdfBuffer,
      originalname: `contrato-${dto.contractNumber}.pdf`,
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
    const processedUpload = await this.filesService.uploadFile(
      tenantId,
      processedFile,
      'contracts',
      residentId,
    );

    // 7. Calcular status
    const status = this.calculateContractStatus(new Date(dto.endDate));

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
          contractNumber: dto.contractNumber,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          monthlyAmount: dto.monthlyAmount,
          dueDay: dto.dueDay,
          status,
          adjustmentIndex: dto.adjustmentIndex,
          adjustmentRate: dto.adjustmentRate,
          lastAdjustmentDate: dto.lastAdjustmentDate
            ? new Date(dto.lastAdjustmentDate)
            : null,
          signatories: signatories as unknown as Prisma.InputJsonValue,
          notes: dto.notes,
          originalFileUrl: originalUpload.fileUrl,
          originalFileKey: originalUpload.fileUrl,
          originalFileName: file.originalname,
          originalFileSize: file.size,
          originalFileMimeType: file.mimetype,
          originalFileHash: processed.hashOriginal,
          processedFileUrl: processedUpload.fileUrl,
          processedFileKey: processedUpload.fileUrl,
          processedFileName: `contrato-${dto.contractNumber}.pdf`,
          processedFileSize: processed.pdfBuffer.length,
          processedFileHash: processed.hashFinal,
          publicToken, // Token público para validação
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
    const originalUrl = await this.filesService.getFileUrl(contract.originalFileUrl);
    const processedUrl = await this.filesService.getFileUrl(contract.processedFileUrl);

    return {
      ...contract,
      originalFileUrl: originalUrl,
      processedFileUrl: processedUrl,
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
        const processedUrl = await this.filesService.getFileUrl(
          contract.processedFileUrl,
        );
        return { ...contract, processedFileUrl: processedUrl };
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
        const processedUrl = await this.filesService.getFileUrl(contract.processedFileUrl);
        return { ...contract, processedFileUrl: processedUrl };
      }),
    );

    return contractsWithUrls;
  }

  /**
   * Buscar um contrato específico
   */
  async findOne(contractId: string) {
    const contract = await this.tenantContext.client.residentContract.findFirst({
      where: { id: contractId, deletedAt: null },
      include: {
        resident: { select: { id: true } },
        uploader: { select: { id: true, name: true } },
      },
    });

    if (!contract) {
      throw new NotFoundException('Contrato não encontrado');
    }

    const originalUrl = await this.filesService.getFileUrl(contract.originalFileUrl);
    const processedUrl = await this.filesService.getFileUrl(contract.processedFileUrl);

    return {
      ...contract,
      originalFileUrl: originalUrl,
      processedFileUrl: processedUrl,
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

    return this.tenantContext.client.contractHistory.findMany({
      where: { contractId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { changedAt: 'desc' },
    });
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

    if (dto.startDate && dto.startDate !== current.startDate.toISOString().split('T')[0]) {
      changedFields.push('startDate');
      updates.startDate = new Date(dto.startDate);
    }

    if (dto.endDate && dto.endDate !== current.endDate.toISOString().split('T')[0]) {
      changedFields.push('endDate');
      updates.endDate = new Date(dto.endDate);
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
      originalname: `contrato-${current.contractNumber}-v${current.version + 1}.pdf`,
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
          processedFileName: `contrato-${current.contractNumber}-v${current.version + 1}.pdf`,
          processedFileSize: processed.pdfBuffer.length,
          processedFileHash: processed.hashFinal,
          publicToken, // Token público para validação
          version: current.version + 1,
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

    const originalUrl = await this.filesService.getFileUrl(newContract.originalFileUrl);
    const processedUrl = await this.filesService.getFileUrl(newContract.processedFileUrl);

    return {
      ...newContract,
      originalFileUrl: originalUrl,
      processedFileUrl: processedUrl,
    };
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
    const now = new Date();
    const daysUntilExpiry = differenceInDays(endDate, now);

    if (daysUntilExpiry < 0) {
      return ContractDocumentStatus.VENCIDO;
    }

    if (daysUntilExpiry <= 30) {
      return ContractDocumentStatus.VENCENDO_EM_30_DIAS;
    }

    return ContractDocumentStatus.VIGENTE;
  }
}
