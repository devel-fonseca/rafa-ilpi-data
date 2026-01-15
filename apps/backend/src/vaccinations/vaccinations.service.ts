import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { FilesService } from '../files/files.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { parseISO } from 'date-fns';
import { CreateVaccinationDto, UpdateVaccinationDto } from './dto';
import { ChangeType } from '@prisma/client';

@Injectable()
export class VaccinationsService {
  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema)
    private readonly tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
    private readonly filesService: FilesService,
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
    if (!/^\d{8,10}$/.test(dto.cnes)) {
      throw new BadRequestException('CNES deve conter 8 a 10 dígitos');
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
    if (updateData.cnes && !/^\d{8,10}$/.test(updateData.cnes)) {
      throw new BadRequestException('CNES deve conter 8 a 10 dígitos');
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
            JSON.stringify((previousData as any)[key])
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
          ...(updateData as any),
          // FIX TIMESTAMPTZ: Processar data se fornecida
          ...(updateData.date && {
            date: parseISO(`${updateData.date}T00:00:00.000Z`),
          }),
          versionNumber: newVersionNumber,
          updatedBy: userId,
        },
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
          previousData: previousData as any,
          newData: newData as any,
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
          previousData: previousData as any,
          newData: {
            ...previousData,
            deletedAt: deletedVaccination.deletedAt,
            versionNumber: newVersionNumber,
          } as any,
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
