import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { FilesService } from '../files/files.service';
import { FileProcessingService } from '../files/file-processing.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { parseISO } from 'date-fns';
import { CreateVaccinationDto, UpdateVaccinationDto } from './dto';
import { ChangeType, Prisma } from '@prisma/client';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';

@Injectable()
export class VaccinationsService {
  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema)
    private readonly tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
    private readonly filesService: FilesService,
    private readonly fileProcessingService: FileProcessingService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * Criar novo registro de vacinação COM versionamento
   * Com validações conforme RDC 502/2021
   */
  async create(
    dto: CreateVaccinationDto,
    userId: string,
  ) {
    try {
      // Verificar se residente existe
      const resident = await this.tenantContext.client.resident.findFirst({
        where: {
          id: dto.residentId,
          deletedAt: null,
        },
      });

      if (!resident) {
        throw new NotFoundException('Residente não encontrado');
      }

      // Parse da string YYYY-MM-DD para Date object (sem timezone shift)
      // Usa horário 00:00 UTC para comparação justa
      const vaccinationDate = parseISO(`${dto.date}T00:00:00.000Z`);
      const today = parseISO(new Date().toISOString().split('T')[0] + 'T00:00:00.000Z');

    if (vaccinationDate > today) {
      throw new BadRequestException('Data de vacinação não pode ser no futuro');
    }

    // Validar UF
    if (!/^[A-Z]{2}$/.test(dto.state)) {
      throw new BadRequestException('UF deve conter 2 caracteres maiúsculos');
    }

    // Validar CNES
    if (!/^\d{7}$/.test(dto.cnes)) {
      throw new BadRequestException('CNES deve conter 7 dígitos');
    }

    // Criar registro com transação para incluir documento se houver comprovante
    const vaccination = await this.tenantContext.client.$transaction(async (tx) => {
      // 1. Criar registro de vacinação COM versionamento
      const vaccinationRecord = await tx.vaccination.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          residentId: dto.residentId,
          vaccine: dto.vaccine,
          dose: dto.dose,
          date: vaccinationDate,
          batch: dto.batch,
          manufacturer: dto.manufacturer,
          cnes: dto.cnes,
          healthUnit: dto.healthUnit,
          municipality: dto.municipality,
          state: dto.state,
          certificateUrl: dto.certificateUrl,
          notes: dto.notes,
          versionNumber: 1,
          createdBy: userId,
        },
        include: {
          resident: {
            select: {
              id: true,
              fullName: true,
            },
          },
          createdByUser: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // 2. Se houver comprovante de vacinação, criar documento do residente
      if (dto.certificateUrl) {
        const formattedDate = vaccinationDate.toLocaleDateString('pt-BR');

        await tx.residentDocument.create({
          data: {
            tenantId: this.tenantContext.tenantId,
            residentId: dto.residentId,
            type: 'COMPROVANTE_VACINACAO',
            fileUrl: dto.certificateUrl,
            fileName: `Vacinação - ${dto.vaccine} - ${formattedDate}`,
            details: `${dto.vaccine} - ${dto.dose} - ${formattedDate}`,
            uploadedBy: userId,
          },
        });
      }

      return vaccinationRecord;
    });

    this.logger.info('Vacinação registrada com sucesso', {
      vaccinationId: vaccination.id,
      residentId: dto.residentId,
      vaccine: dto.vaccine,
      tenantId: this.tenantContext.tenantId,
      userId,
    });

    return vaccination;
    } catch (error) {
      this.logger.error('Erro ao criar vacinação', {
        error: error.message,
        vaccinationData: {
          vaccine: dto.vaccine,
          dose: dto.dose,
          date: dto.date,
          residentId: dto.residentId,
        },
        tenantId: this.tenantContext.tenantId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Listar vacinações por residente (ordenadas por data DESC)
   */
  async findByResident(residentId: string) {
    // Verificar se residente existe
    const resident = await this.tenantContext.client.resident.findFirst({
      where: {
        id: residentId,
        deletedAt: null,
      },
    });

    if (!resident) {
      throw new NotFoundException('Residente não encontrado');
    }

    const vaccinations = await this.tenantContext.client.vaccination.findMany({
      where: {
        residentId,
        deletedAt: null,
      },
      orderBy: {
        date: 'desc',
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Processar URLs assinadas para certificados
    const vaccinationsWithSignedUrls = await Promise.all(
      vaccinations.map(async (vaccination) => {
        if (vaccination.certificateUrl) {
          const signedUrl = await this.filesService.getFileUrl(
            vaccination.certificateUrl,
          );
          return {
            ...vaccination,
            certificateUrl: signedUrl,
          };
        }
        return vaccination;
      }),
    );

    return vaccinationsWithSignedUrls;
  }

  /**
   * Obter um registro de vacinação por ID
   */
  async findOne(id: string) {
    const vaccination = await this.tenantContext.client.vaccination.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
            cpf: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!vaccination) {
      throw new NotFoundException('Vacinação não encontrada');
    }

    return vaccination;
  }

  /**
   * Atualizar registro de vacinação COM versionamento
   */
  async update(
    id: string,
    updateVaccinationDto: UpdateVaccinationDto,
    userId: string,
  ) {
    const { changeReason, ...updateData } = updateVaccinationDto;

    // Buscar vacinação existente
    const vaccination = await this.tenantContext.client.vaccination.findFirst({
      where: { id, deletedAt: null },
    });

    if (!vaccination) {
      this.logger.error('Erro ao atualizar vacinação', {
        error: 'Vacinação não encontrada',
        vaccinationId: id,
        tenantId: this.tenantContext.tenantId,
        userId,
      });
      throw new NotFoundException('Vacinação não encontrada');
    }

    // Se trocar residente, validar novo residente
    if (updateData.residentId && updateData.residentId !== vaccination.residentId) {
      const resident = await this.tenantContext.client.resident.findFirst({
        where: {
          id: updateData.residentId,
          deletedAt: null,
        },
      });

      if (!resident) {
        throw new NotFoundException('Novo residente não encontrado');
      }
    }

    // FIX TIMESTAMPTZ: Validar data se foi fornecida
    if (updateData.date) {
      const vaccinationDate = parseISO(`${updateData.date}T00:00:00.000Z`);
      const today = parseISO(new Date().toISOString().split('T')[0] + 'T00:00:00.000Z');

      if (vaccinationDate > today) {
        throw new BadRequestException('Data de vacinação não pode ser no futuro');
      }
    }

    // Validar UF se fornecido
    if (updateData.state && !/^[A-Z]{2}$/.test(updateData.state)) {
      throw new BadRequestException('UF deve conter 2 caracteres maiúsculos');
    }

    // Validar CNES se fornecido
    if (updateData.cnes && !/^\d{7}$/.test(updateData.cnes)) {
      throw new BadRequestException('CNES deve conter 7 dígitos');
    }

    // Capturar estado anterior
    const previousData = {
      vaccine: vaccination.vaccine,
      dose: vaccination.dose,
      date: vaccination.date,
      batch: vaccination.batch,
      manufacturer: vaccination.manufacturer,
      cnes: vaccination.cnes,
      healthUnit: vaccination.healthUnit,
      municipality: vaccination.municipality,
      state: vaccination.state,
      certificateUrl: vaccination.certificateUrl,
      notes: vaccination.notes,
      residentId: vaccination.residentId,
      versionNumber: vaccination.versionNumber,
    };

    // Detectar campos alterados
    const changedFields: string[] = [];
    (Object.keys(updateData) as Array<keyof typeof updateData>).forEach(
      (key) => {
        if (
          updateData[key] !== undefined &&
          JSON.stringify(updateData[key]) !==
            JSON.stringify((previousData as Record<string, unknown>)[key])
        ) {
          changedFields.push(key as string);
        }
      },
    );

    // Incrementar versão
    const newVersionNumber = vaccination.versionNumber + 1;

    // Executar update e criar histórico em transação atômica
    const result = await this.tenantContext.client.$transaction(async (tx) => {
      // 1. Atualizar vacinação
      const updatedVaccination = await tx.vaccination.update({
        where: { id },
        data: {
          ...(updateData as Prisma.VaccinationUncheckedUpdateInput),
          // FIX TIMESTAMPTZ: Processar data se fornecida
          ...(updateData.date && {
            date: parseISO(`${updateData.date}T00:00:00.000Z`),
          }),
          versionNumber: newVersionNumber,
          updatedBy: userId,
        } as Prisma.VaccinationUncheckedUpdateInput,
      });

      // 2. Capturar novo estado
      const newData = {
        vaccine: updatedVaccination.vaccine,
        dose: updatedVaccination.dose,
        date: updatedVaccination.date,
        batch: updatedVaccination.batch,
        manufacturer: updatedVaccination.manufacturer,
        cnes: updatedVaccination.cnes,
        healthUnit: updatedVaccination.healthUnit,
        municipality: updatedVaccination.municipality,
        state: updatedVaccination.state,
        certificateUrl: updatedVaccination.certificateUrl,
        notes: updatedVaccination.notes,
        residentId: updatedVaccination.residentId,
        versionNumber: updatedVaccination.versionNumber,
      };

      // 3. Criar entrada no histórico
      await tx.vaccinationHistory.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          vaccinationId: id,
          versionNumber: newVersionNumber,
          changeType: ChangeType.UPDATE,
          changeReason,
          previousData: previousData as Prisma.InputJsonValue,
          newData: newData as Prisma.InputJsonValue,
          changedFields,
          changedAt: new Date(),
          changedBy: userId,
        },
      });

      return updatedVaccination;
    });

    this.logger.info('Vacinação atualizada com versionamento', {
      vaccinationId: id,
      versionNumber: newVersionNumber,
      changedFields,
      tenantId: this.tenantContext.tenantId,
      userId,
    });

    return result;
  }

  /**
   * Soft delete de registro de vacinação COM versionamento
   */
  async remove(
    id: string,
    userId: string,
    deleteReason: string,
  ) {
    // Buscar vacinação existente
    const vaccination = await this.tenantContext.client.vaccination.findFirst({
      where: { id, deletedAt: null },
    });

    if (!vaccination) {
      this.logger.error('Erro ao remover vacinação', {
        error: 'Vacinação não encontrada',
        vaccinationId: id,
        tenantId: this.tenantContext.tenantId,
        userId,
      });
      throw new NotFoundException('Vacinação não encontrada');
    }

    // Capturar estado antes da exclusão
    const previousData = {
      vaccine: vaccination.vaccine,
      dose: vaccination.dose,
      date: vaccination.date,
      batch: vaccination.batch,
      manufacturer: vaccination.manufacturer,
      cnes: vaccination.cnes,
      healthUnit: vaccination.healthUnit,
      municipality: vaccination.municipality,
      state: vaccination.state,
      certificateUrl: vaccination.certificateUrl,
      notes: vaccination.notes,
      residentId: vaccination.residentId,
      versionNumber: vaccination.versionNumber,
      deletedAt: null,
    };

    // Incrementar versão
    const newVersionNumber = vaccination.versionNumber + 1;

    // Executar soft delete e criar histórico em transação atômica
    const result = await this.tenantContext.client.$transaction(async (tx) => {
      // 1. Soft delete
      const deletedVaccination = await tx.vaccination.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          versionNumber: newVersionNumber,
          updatedBy: userId,
        },
      });

      // 2. Criar entrada no histórico
      await tx.vaccinationHistory.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          vaccinationId: id,
          versionNumber: newVersionNumber,
          changeType: ChangeType.DELETE,
          changeReason: deleteReason,
          previousData: previousData as Prisma.InputJsonValue,
          newData: {
            ...previousData,
            deletedAt: deletedVaccination.deletedAt,
            versionNumber: newVersionNumber,
          } as Prisma.InputJsonValue,
          changedFields: ['deletedAt'],
          changedAt: new Date(),
          changedBy: userId,
        },
      });

      return deletedVaccination;
    });

    this.logger.info('Vacinação removida com versionamento', {
      vaccinationId: id,
      versionNumber: newVersionNumber,
      tenantId: this.tenantContext.tenantId,
      userId,
    });

    return {
      message: 'Vacinação removida com sucesso',
      vaccination: result,
    };
  }

  /**
   * Consultar histórico completo de vacinação
   */
  async getHistory(vaccinationId: string) {
    // Verificar se a vacinação existe
    const vaccination = await this.tenantContext.client.vaccination.findFirst({
      where: { id: vaccinationId },
    });

    if (!vaccination) {
      this.logger.error('Erro ao consultar histórico de vacinação', {
        error: 'Vacinação não encontrada',
        vaccinationId,
        tenantId: this.tenantContext.tenantId,
      });
      throw new NotFoundException('Vacinação não encontrada');
    }

    // Buscar histórico ordenado por versão decrescente
    const history = await this.tenantContext.client.vaccinationHistory.findMany({
      where: {
        vaccinationId,
      },
      orderBy: {
        versionNumber: 'desc',
      },
    });

    this.logger.info('Histórico de vacinação consultado', {
      vaccinationId,
      totalVersions: history.length,
      tenantId: this.tenantContext.tenantId,
    });

    return {
      vaccinationId,
      vaccine: vaccination.vaccine,
      vaccinationVaccine: vaccination.vaccine,
      currentVersion: vaccination.versionNumber,
      totalVersions: history.length,
      history,
    };
  }

  /**
   * Upload de comprovante de vacinação com processamento institucional
   *
   * Fluxo:
   * 1. Validar arquivo (tamanho, formato)
   * 2. Fazer upload do arquivo original para S3
   * 3. Processar arquivo (converter imagem → PDF se necessário)
   * 4. Adicionar carimbo institucional com:
   *    - Dados da ILPI (nome, CNPJ)
   *    - Dados do responsável pelo upload (nome, cargo, registro profissional)
   *    - Hash SHA-256 do arquivo
   *    - Token público para validação
   * 5. Fazer upload do arquivo processado para S3
   * 6. Atualizar registro de vacinação com metadados dos arquivos
   */
  async uploadProof(
    vaccinationId: string,
    file: Express.Multer.File,
    user: JwtPayload,
  ) {
    // 1. Validar arquivo
    if (!file) {
      throw new BadRequestException('Nenhum arquivo fornecido');
    }

    // Validar tamanho (máximo 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('Arquivo muito grande (máximo 10MB)');
    }

    // Validar formato
    const ALLOWED_MIMETYPES = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf',
    ];
    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Formato inválido. Permitidos: JPG, PNG, WEBP, PDF',
      );
    }

    // 2. Buscar vacinação
    const vaccination = await this.tenantContext.client.vaccination.findFirst({
      where: {
        id: vaccinationId,
        deletedAt: null,
      },
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!vaccination) {
      throw new NotFoundException('Vacinação não encontrada');
    }

    // 3. Buscar dados do usuário (para carimbo institucional)
    const userData = await this.tenantContext.client.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profile: {
          select: {
            registrationType: true,
            registrationNumber: true,
            registrationState: true,
          },
        },
      },
    });

    if (!userData) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // 4. Buscar dados do tenant (para carimbo institucional)
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId! },
      select: {
        id: true,
        name: true,
        cnpj: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    try {
      // 5. Gerar publicToken único
      const publicToken = randomUUID();

      // 6. Processar arquivo com carimbo institucional PRIMEIRO
      const stampMetadata = {
        tenantName: tenant.name,
        tenantCnpj: tenant.cnpj || 'N/A',
        tenantId: tenant.id,
        userName: userData.name,
        userRole: userData.role || 'N/A',
        userProfessionalRegistry: userData.profile?.registrationNumber
          ? `${userData.profile.registrationType || ''} ${userData.profile.registrationNumber}${userData.profile.registrationState ? '-' + userData.profile.registrationState : ''}`
          : undefined,
        uploadDate: new Date(),
        hashOriginal: '', // Será calculado pelo FileProcessingService
        publicToken,
      };

      const processedResult =
        file.mimetype === 'application/pdf'
          ? await this.fileProcessingService.processPdf(
              file.buffer,
              stampMetadata,
            )
          : await this.fileProcessingService.processImage(
              file.buffer,
              stampMetadata,
            );

      // 7. Upload do arquivo original para S3
      const originalUpload = await this.filesService.uploadFile(
        this.tenantContext.tenantId,
        file,
        'vaccinations',
        vaccinationId,
      );

      this.logger.info('Arquivo original enviado para S3', {
        vaccinationId,
        originalFileId: originalUpload.fileId,
        originalUrl: originalUpload.fileUrl,
        tenantId: this.tenantContext.tenantId,
      });

      // 8. Upload do arquivo processado para S3
      // Criar um objeto File compatível com Multer a partir do buffer processado
      const processedFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: `${vaccination.vaccine}_${vaccination.dose}_processado.pdf`,
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: processedResult.pdfBuffer.length,
        buffer: processedResult.pdfBuffer,
        stream: Readable.from(processedResult.pdfBuffer),
        destination: '',
        filename: '',
        path: '',
      };

      const processedUpload = await this.filesService.uploadFile(
        this.tenantContext.tenantId,
        processedFile,
        'vaccinations',
        vaccinationId,
      );

      this.logger.info('Arquivo processado enviado para S3', {
        vaccinationId,
        processedFileId: processedUpload.fileId,
        processedUrl: processedUpload.fileUrl,
        tenantId: this.tenantContext.tenantId,
      });

      // 9. Atualizar registro de vacinação com metadados dos arquivos
      const updatedVaccination = await this.tenantContext.client.vaccination.update({
        where: { id: vaccinationId },
        data: {
          // Arquivo original
          originalFileUrl: originalUpload.fileUrl,
          originalFileKey: originalUpload.fileId,
          originalFileName: originalUpload.fileName,
          originalFileSize: originalUpload.fileSize,
          originalFileMimeType: originalUpload.mimeType,
          originalFileHash: processedResult.hashOriginal,

          // Arquivo processado
          processedFileUrl: processedUpload.fileUrl,
          processedFileKey: processedUpload.fileId,
          processedFileName: processedUpload.fileName,
          processedFileSize: processedUpload.fileSize,
          processedFileHash: processedResult.hashFinal,

          // Token público
          publicToken,

          // Metadados do processamento
          processingMetadata: {
            uploadedBy: userData.name,
            uploadedAt: new Date().toISOString(),
            userRole: userData.role,
            registrationType: userData.profile?.registrationType,
            registrationNumber: userData.profile?.registrationNumber,
            registrationState: userData.profile?.registrationState,
            tenantName: tenant.name,
            tenantCnpj: tenant.cnpj,
            originalMimeType: file.mimetype,
          } as Prisma.InputJsonValue,

          // Campos de auditoria
          updatedBy: user.id,
        },
      });

      this.logger.info('Comprovante de vacinação processado com sucesso', {
        vaccinationId,
        publicToken,
        originalFileHash: processedResult.hashOriginal,
        processedFileHash: processedResult.hashFinal,
        tenantId: this.tenantContext.tenantId,
        userId: user.id,
      });

      return {
        message: 'Comprovante processado e salvo com sucesso',
        vaccination: updatedVaccination,
        publicToken,
        validationUrl: `/vaccinations/validate/${publicToken}`,
      };
    } catch (error) {
      this.logger.error('Erro ao processar comprovante de vacinação', {
        error: error.message,
        vaccinationId,
        tenantId: this.tenantContext.tenantId,
        userId: user.id,
      });
      throw error;
    }
  }

  /**
   * Consultar versão específica do histórico
   */
  async getHistoryVersion(
    vaccinationId: string,
    versionNumber: number,
  ) {
    // Verificar se a vacinação existe
    const vaccination = await this.tenantContext.client.vaccination.findFirst({
      where: { id: vaccinationId },
    });

    if (!vaccination) {
      this.logger.error('Erro ao consultar versão do histórico', {
        error: 'Vacinação não encontrada',
        vaccinationId,
        versionNumber,
        tenantId: this.tenantContext.tenantId,
      });
      throw new NotFoundException('Vacinação não encontrada');
    }

    // Buscar versão específica
    const historyVersion = await this.tenantContext.client.vaccinationHistory.findFirst({
      where: {
        vaccinationId,
        versionNumber,
      },
    });

    if (!historyVersion) {
      this.logger.error('Erro ao consultar versão do histórico', {
        error: `Versão ${versionNumber} não encontrada para esta vacinação`,
        vaccinationId,
        versionNumber,
        tenantId: this.tenantContext.tenantId,
      });
      throw new NotFoundException(
        `Versão ${versionNumber} não encontrada para esta vacinação`,
      );
    }

    this.logger.info('Versão específica do histórico consultada', {
      vaccinationId,
      versionNumber,
      tenantId: this.tenantContext.tenantId,
    });

    return historyVersion;
  }
}
