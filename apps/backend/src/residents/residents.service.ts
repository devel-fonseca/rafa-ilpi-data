import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FilesService } from '../files/files.service';
import { CreateResidentDto } from './dto/create-resident.dto';
import { UpdateResidentDto } from './dto/update-resident.dto';
import { QueryResidentDto } from './dto/query-resident.dto';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class ResidentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * Valida e processa a acomodação (roomId e bedId)
   * Verifica: existência, disponibilidade, e conflitos de ocupação
   */
  private async validateAndProcessAccommodation(
    roomId: string | undefined,
    bedId: string | undefined,
    tenantId: string,
    currentResidentId?: string, // Para saber qual residente está sendo atualizado
  ) {
    // Se não há acomodação a definir, retorna undefined
    if (!roomId && !bedId) {
      return { roomId: undefined, bedId: undefined };
    }

    // Se há bedId, validar
    if (bedId) {
      // Verificar se o leito existe
      const bed = await this.prisma.bed.findFirst({
        where: {
          id: bedId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!bed) {
        throw new BadRequestException(`Leito com ID ${bedId} não encontrado`);
      }

      // Verificar se o leito está disponível
      if (bed.status === 'Ocupado') {
        // Permitir se é o mesmo residente que já estava nesse leito
        const existingResident = await this.prisma.resident.findFirst({
          where: {
            bedId,
            tenantId,
            deletedAt: null,
          },
        });

        if (existingResident && existingResident.id !== currentResidentId) {
          throw new BadRequestException(
            `Leito ${bed.code} já está ocupado por outro residente`,
          );
        }
      }

      // Se roomId não foi fornecido, extrair do leito
      if (!roomId) {
        roomId = bed.roomId;
      }
    }

    // Se há roomId, validar
    if (roomId) {
      const room = await this.prisma.room.findFirst({
        where: {
          id: roomId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!room) {
        throw new BadRequestException(`Quarto com ID ${roomId} não encontrado`);
      }
    }

    return { roomId, bedId };
  }

  /**
   * Atualiza o status do leito quando um residente é associado/dissociado
   */
  private async updateBedStatus(
    bedId: string | undefined,
    newStatus: 'Ocupado' | 'Disponível',
    tenantId: string,
  ) {
    if (!bedId) return;

    await this.prisma.bed.update({
      where: { id: bedId },
      data: { status: newStatus },
    });

    this.logger.info(`Bed status atualizado`, {
      bedId,
      newStatus,
      tenantId,
    });
  }

  /**
   * Cria um novo residente usando o Prisma Client
   */
  async create(createResidentDto: CreateResidentDto, tenantId: string, userId: string) {
    try {
      // Buscar o tenant
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          subscriptions: {
            where: {
              status: { in: ['trialing', 'active'] },
            },
            include: { plan: true },
            take: 1,
          },
        },
      });

      if (!tenant) {
        throw new NotFoundException('Tenant não encontrado');
      }

      // Verificar limite de residentes
      if (tenant.subscriptions[0]?.plan) {
        const currentCount = await this.prisma.resident.count({
          where: {
            tenantId,
            deletedAt: null,
          },
        });

        const maxResidents = tenant.subscriptions[0].plan.maxResidents;
        if (maxResidents !== -1 && currentCount >= maxResidents) {
          throw new BadRequestException(
            `Limite de ${maxResidents} residentes atingido para o plano atual`,
          );
        }
      }

      // Verificar CPF duplicado
      if (createResidentDto.cpf) {
        const existingCpf = await this.prisma.resident.findFirst({
          where: {
            tenantId,
            cpf: createResidentDto.cpf,
            deletedAt: null,
          },
        });

        if (existingCpf) {
          throw new BadRequestException('CPF já cadastrado');
        }
      }

      // Validar acomodação (roomId e bedId)
      const accommodation = await this.validateAndProcessAccommodation(
        createResidentDto.roomId,
        createResidentDto.bedId,
        tenantId,
      );

      // Criar o residente
      const resident = await this.prisma.resident.create({
        data: {
          tenantId,

          // 0. Status
          status: createResidentDto.status || 'Ativo',

          // 1. Dados Pessoais
          fullName: createResidentDto.fullName,
          socialName: createResidentDto.socialName,
          cpf: createResidentDto.cpf,
          rg: createResidentDto.rg,
          rgIssuer: createResidentDto.rgIssuer,
          education: createResidentDto.education,
          profession: createResidentDto.profession,
          cns: createResidentDto.cns,
          gender: createResidentDto.gender,
          civilStatus: createResidentDto.civilStatus,
          religion: createResidentDto.religion,
          birthDate: createResidentDto.birthDate,
          nationality: createResidentDto.nationality || 'Brasileira',
          birthCity: createResidentDto.birthCity,
          birthState: createResidentDto.birthState,
          motherName: createResidentDto.motherName,
          fatherName: createResidentDto.fatherName,
          fotoUrl: createResidentDto.fotoUrl,
          documents: createResidentDto.documents || [],

          // 2. Endereços
          currentCep: createResidentDto.currentCep,
          currentState: createResidentDto.currentState,
          currentCity: createResidentDto.currentCity,
          currentStreet: createResidentDto.currentStreet,
          currentNumber: createResidentDto.currentNumber,
          currentComplement: createResidentDto.currentComplement,
          currentDistrict: createResidentDto.currentDistrict,
          currentPhone: createResidentDto.currentPhone,

          originCep: createResidentDto.originCep,
          originState: createResidentDto.originState,
          originCity: createResidentDto.originCity,
          originStreet: createResidentDto.originStreet,
          originNumber: createResidentDto.originNumber,
          originComplement: createResidentDto.originComplement,
          originDistrict: createResidentDto.originDistrict,
          originPhone: createResidentDto.originPhone,

          addressDocuments: createResidentDto.addressDocuments || [],

          // 3. Contatos de Emergência
          emergencyContacts: (createResidentDto.emergencyContacts || []) as any,

          // 4. Responsável Legal
          legalGuardianName: createResidentDto.legalGuardianName,
          legalGuardianCpf: createResidentDto.legalGuardianCpf,
          legalGuardianRg: createResidentDto.legalGuardianRg,
          legalGuardianPhone: createResidentDto.legalGuardianPhone,
          legalGuardianType: createResidentDto.legalGuardianType,
          legalGuardianCep: createResidentDto.legalGuardianCep,
          legalGuardianState: createResidentDto.legalGuardianState,
          legalGuardianCity: createResidentDto.legalGuardianCity,
          legalGuardianStreet: createResidentDto.legalGuardianStreet,
          legalGuardianNumber: createResidentDto.legalGuardianNumber,
          legalGuardianComplement: createResidentDto.legalGuardianComplement,
          legalGuardianDistrict: createResidentDto.legalGuardianDistrict,
          legalGuardianDocuments: createResidentDto.legalGuardianDocuments || [],

          // 5. Admissão
          admissionDate: createResidentDto.admissionDate,
          admissionType: createResidentDto.admissionType,
          admissionReason: createResidentDto.admissionReason,
          admissionConditions: createResidentDto.admissionConditions,
          dischargeDate: createResidentDto.dischargeDate,
          dischargeReason: createResidentDto.dischargeReason,

          // 6. Saúde
          healthStatus: createResidentDto.healthStatus,
          bloodType: createResidentDto.bloodType || 'NAO_INFORMADO',
          height: createResidentDto.height,
          weight: createResidentDto.weight,
          dependencyLevel: createResidentDto.dependencyLevel,
          mobilityAid: createResidentDto.mobilityAid,
          specialNeeds: createResidentDto.specialNeeds,
          functionalAspects: createResidentDto.functionalAspects,
          medicationsOnAdmission: createResidentDto.medicationsOnAdmission,
          allergies: createResidentDto.allergies,
          chronicConditions: createResidentDto.chronicConditions,
          dietaryRestrictions: createResidentDto.dietaryRestrictions,
          medicalReport: (createResidentDto.medicalReport || []) as any,

          // 7. Convênios
          healthPlans: (createResidentDto.healthPlans || []) as any,

          // 8. Pertences
          belongings: createResidentDto.belongings || [],

          // 9. Acomodação
          roomId: accommodation.roomId,
          bedId: accommodation.bedId,
        },
      });

      // Atualizar status do leito para "Ocupado" se foi atribuído
      if (accommodation.bedId) {
        await this.updateBedStatus(accommodation.bedId, 'Ocupado', tenantId);
      }

      this.logger.info('Residente criado', {
        residentId: resident.id,
        tenantId,
        userId,
        bedId: accommodation.bedId,
      });

      return resident;
    } catch (error) {
      this.logger.error('Erro ao criar residente', {
        error: error.message,
        tenantId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Lista todos os residentes do tenant com filtros e paginação
   */
  async findAll(query: QueryResidentDto, tenantId: string) {
    try {
      const page = parseInt(query.page || '1');
      const limit = parseInt(query.limit || '10');
      const skip = (page - 1) * limit;

      // Construir filtros
      const where: any = {
        tenantId,
        deletedAt: null,
      };

      if (query.search) {
        where.OR = [
          { fullName: { contains: query.search, mode: 'insensitive' } },
          { cpf: query.search },
        ];
      }

      if (query.status) {
        where.status = query.status;
      }

      if (query.gender) {
        where.gender = query.gender;
      }

      // Buscar residentes
      const [residents, total] = await Promise.all([
        this.prisma.resident.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            [query.sortBy || 'fullName']: query.sortOrder || 'asc',
          },
          select: {
            id: true,
            fullName: true,
            cpf: true,
            rg: true,
            gender: true,
            birthDate: true,
            civilStatus: true,
            status: true,
            admissionDate: true,
            legalGuardianName: true,
            legalGuardianPhone: true,
            fotoUrl: true,
            roomId: true,
            bedId: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        this.prisma.resident.count({ where }),
      ]);

      return {
        data: residents,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error('Erro ao listar residentes', {
        error: error.message,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Busca um residente específico
   */
  async findOne(id: string, tenantId: string) {
    try {
      const resident = await this.prisma.resident.findFirst({
        where: {
          id,
          tenantId,
          deletedAt: null,
        },
      });

      if (!resident) {
        throw new NotFoundException('Residente não encontrado');
      }

      // Buscar dados de quarto e leito se os IDs existirem
      let room = null;
      let bed = null;

      if (resident.roomId) {
        room = await this.prisma.room.findFirst({
          where: { id: resident.roomId, deletedAt: null },
          select: { id: true, name: true, code: true },
        });
      }

      if (resident.bedId) {
        bed = await this.prisma.bed.findFirst({
          where: { id: resident.bedId, deletedAt: null },
          select: { id: true, code: true, status: true },
        });
      }

      // Gerar URLs assinadas para documentos
      const residentWithUrls = await this.generateSignedUrls(resident);

      // Adicionar room e bed aos dados do residente
      return {
        ...residentWithUrls,
        room,
        bed,
      };
    } catch (error) {
      this.logger.error('Erro ao buscar residente', {
        error: error.message,
        residentId: id,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Atualiza um residente
   */
  async update(id: string, updateResidentDto: UpdateResidentDto, tenantId: string, userId: string) {
    try {
      // Verificar se residente existe
      const existingResident = await this.prisma.resident.findFirst({
        where: {
          id,
          tenantId,
          deletedAt: null,
        },
      });

      if (!existingResident) {
        throw new NotFoundException('Residente não encontrado');
      }

      // Verificar CPF duplicado (se estiver sendo atualizado)
      if (updateResidentDto.cpf && updateResidentDto.cpf !== existingResident.cpf) {
        const existingCpf = await this.prisma.resident.findFirst({
          where: {
            tenantId,
            cpf: updateResidentDto.cpf,
            id: { not: id },
            deletedAt: null,
          },
        });

        if (existingCpf) {
          throw new BadRequestException('CPF já cadastrado');
        }
      }

      // Validar acomodação (roomId e bedId) se estiverem sendo atualizados
      let accommodationToUpdate: { roomId?: string; bedId?: string } | null = null;
      let oldBedId = existingResident.bedId;
      let newBedId: string | undefined;

      if (updateResidentDto.roomId !== undefined || updateResidentDto.bedId !== undefined) {
        accommodationToUpdate = await this.validateAndProcessAccommodation(
          updateResidentDto.roomId,
          updateResidentDto.bedId,
          tenantId,
          id, // currentResidentId
        );

        newBedId = accommodationToUpdate.bedId;

        // Se está mudando de leito, liberar o antigo
        if (oldBedId && newBedId && oldBedId !== newBedId) {
          await this.updateBedStatus(oldBedId, 'Disponível', tenantId);
          this.logger.info('Leito antigo liberado', {
            residentId: id,
            oldBedId,
            newBedId,
            tenantId,
          });
        }

        // Se está sendo removido de leito
        if (oldBedId && !newBedId) {
          await this.updateBedStatus(oldBedId, 'Disponível', tenantId);
        }
      }

      // Atualizar o residente
      // Extrair campos JSON para tratamento explícito (conversão de tipo necessária para Prisma)
      const {
        emergencyContacts,
        documents,
        addressDocuments,
        legalGuardianDocuments,
        medicalReport,
        healthPlans,
        belongings,
        roomId,
        bedId,
        ...restDto
      } = updateResidentDto;

      // Construir objeto de atualização com tipos corretos
      // Cast para 'any' necessário porque Prisma espera InputJsonValue para campos JSON
      // Filtrar apenas campos undefined para não sobrescrever valores existentes
      // Nota: null e '' são valores válidos que o usuário pode querer salvar
      const dataToUpdate: any = Object.fromEntries(
        Object.entries(restDto).filter(([_, value]) => value !== undefined)
      );

      // Log para debug
      this.logger.debug('Update resident data', {
        residentId: id,
        fieldsReceived: Object.keys(updateResidentDto),
        fieldsToUpdate: Object.keys(dataToUpdate),
        healthFields: {
          healthStatus: updateResidentDto.healthStatus,
          specialNeeds: updateResidentDto.specialNeeds,
          medicationsOnAdmission: updateResidentDto.medicationsOnAdmission,
          allergies: updateResidentDto.allergies,
          chronicConditions: updateResidentDto.chronicConditions,
        },
      });

      // Adicionar campos JSON apenas se foram enviados
      if (emergencyContacts !== undefined) dataToUpdate.emergencyContacts = emergencyContacts;
      if (documents !== undefined) dataToUpdate.documents = documents;
      if (addressDocuments !== undefined) dataToUpdate.addressDocuments = addressDocuments;
      if (legalGuardianDocuments !== undefined) dataToUpdate.legalGuardianDocuments = legalGuardianDocuments;
      if (medicalReport !== undefined) dataToUpdate.medicalReport = medicalReport;
      if (healthPlans !== undefined) dataToUpdate.healthPlans = healthPlans;
      if (belongings !== undefined) dataToUpdate.belongings = belongings;

      // Adicionar acomodação validada se foi processada
      if (accommodationToUpdate) {
        if (accommodationToUpdate.roomId !== undefined) dataToUpdate.roomId = accommodationToUpdate.roomId;
        if (accommodationToUpdate.bedId !== undefined) dataToUpdate.bedId = accommodationToUpdate.bedId;
      }

      const updated = await this.prisma.resident.update({
        where: { id },
        data: dataToUpdate,
      });

      // Atualizar status do novo leito para "Ocupado" se foi atribuído
      if (newBedId && newBedId !== oldBedId) {
        await this.updateBedStatus(newBedId, 'Ocupado', tenantId);
      }

      this.logger.info('Residente atualizado', {
        residentId: id,
        tenantId,
        userId,
        oldBedId,
        newBedId,
      });

      return updated;
    } catch (error) {
      this.logger.error('Erro ao atualizar residente', {
        error: error.message,
        residentId: id,
        tenantId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Remove um residente (soft delete)
   */
  async remove(id: string, tenantId: string, userId: string) {
    try {
      // Verificar se residente existe
      const existingResident = await this.prisma.resident.findFirst({
        where: {
          id,
          tenantId,
          deletedAt: null,
        },
      });

      if (!existingResident) {
        throw new NotFoundException('Residente não encontrado');
      }

      // Soft delete
      await this.prisma.resident.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });

      this.logger.info('Residente removido (soft delete)', {
        residentId: id,
        tenantId,
        userId,
      });

      return { message: 'Residente removido com sucesso' };
    } catch (error) {
      this.logger.error('Erro ao remover residente', {
        error: error.message,
        residentId: id,
        tenantId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Gera URLs assinadas para todos os campos de arquivo
   */
  private async generateSignedUrls(resident: any): Promise<any> {
    const urlFields = ['documents', 'addressDocuments', 'legalGuardianDocuments'];

    for (const field of urlFields) {
      if (resident[field] && Array.isArray(resident[field])) {
        resident[field] = await Promise.all(
          resident[field].map(async (url: string) => {
            try {
              return await this.filesService.getFileUrl(url);
            } catch (error) {
              this.logger.warn(`Erro ao gerar URL assinada para ${field}:`, error);
              return url;
            }
          })
        );
      }
    }

    // Processar medicalReport e healthPlans se existirem
    if (resident.medicalReport && Array.isArray(resident.medicalReport)) {
      resident.medicalReport = await Promise.all(
        resident.medicalReport.map(async (report: any) => {
          try {
            return {
              ...report,
              url: await this.filesService.getFileUrl(report.url),
            };
          } catch (error) {
            this.logger.warn('Erro ao gerar URL assinada para laudo médico:', error);
            return report;
          }
        })
      );
    }

    if (resident.healthPlans && Array.isArray(resident.healthPlans)) {
      resident.healthPlans = await Promise.all(
        resident.healthPlans.map(async (plan: any) => {
          if (plan.cardUrl) {
            try {
              return {
                ...plan,
                cardUrl: await this.filesService.getFileUrl(plan.cardUrl),
              };
            } catch (error) {
              this.logger.warn('Erro ao gerar URL assinada para cartão do convênio:', error);
              return plan;
            }
          }
          return plan;
        })
      );
    }

    // Processar fotoUrl se existir (gera original + thumbnails)
    if (resident.fotoUrl) {
      try {
        const basePath = resident.fotoUrl; // Path no MinIO antes de assinar

        // Derivar paths dos thumbnails usando convenção de nomenclatura
        const smallPath = basePath.replace('.webp', '_small.webp');
        const mediumPath = basePath.replace('.webp', '_medium.webp');

        // Gerar URLs assinadas para todas as variantes
        const [originalUrl, smallUrl, mediumUrl] = await Promise.allSettled([
          this.filesService.getFileUrl(basePath),
          this.filesService.getFileUrl(smallPath),
          this.filesService.getFileUrl(mediumPath),
        ]);

        // Atribuir URL original (sempre existe)
        resident.fotoUrl = originalUrl.status === 'fulfilled' ? originalUrl.value : basePath;

        // Atribuir URLs de thumbnails (fallback para original se não existirem)
        resident.fotoUrlSmall =
          smallUrl.status === 'fulfilled' ? smallUrl.value : resident.fotoUrl;
        resident.fotoUrlMedium =
          mediumUrl.status === 'fulfilled' ? mediumUrl.value : resident.fotoUrl;
      } catch (error) {
        this.logger.warn('Erro ao gerar URL assinada para foto do residente:', error);
        // Mantém URL original se falhar
      }
    }

    return resident;
  }

  /**
   * Retorna estatísticas dos residentes
   */
  async getStats(tenantId: string) {
    const where = {
      tenantId,
      deletedAt: null,
    };

    // Total de residentes
    const total = await this.prisma.resident.count({ where });

    // Ativos
    const ativos = await this.prisma.resident.count({
      where: { ...where, status: 'Ativo' },
    });

    // Inativos
    const inativos = await this.prisma.resident.count({
      where: { ...where, status: 'Inativo' },
    });

    // Por grau de dependência (somente ativos)
    const grauI = await this.prisma.resident.count({
      where: {
        ...where,
        status: 'Ativo',
        dependencyLevel: 'Grau I - Independente',
      },
    });

    const grauII = await this.prisma.resident.count({
      where: {
        ...where,
        status: 'Ativo',
        dependencyLevel: 'Grau II - Parcialmente Dependente',
      },
    });

    const grauIII = await this.prisma.resident.count({
      where: {
        ...where,
        status: 'Ativo',
        dependencyLevel: 'Grau III - Totalmente Dependente',
      },
    });

    // Por gênero
    const masculino = await this.prisma.resident.count({
      where: { ...where, gender: 'MASCULINO' },
    });

    const feminino = await this.prisma.resident.count({
      where: { ...where, gender: 'FEMININO' },
    });

    return {
      total,
      ativos,
      inativos,
      grauI,
      grauII,
      grauIII,
      masculino,
      feminino,
    };
  }
}
