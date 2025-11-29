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

      // Verificar se já existe um residente ocupando este leito
      const existingResident = await this.prisma.resident.findFirst({
        where: {
          bedId,
          tenantId,
          deletedAt: null,
        },
      });

      // Se existe outro residente no leito (não é o mesmo que está sendo atualizado)
      if (existingResident && existingResident.id !== currentResidentId) {
        throw new BadRequestException(
          `Leito ${bed.code} já está ocupado por outro residente`,
        );
      }

      // Verificar também o status do leito (dupla validação)
      if (bed.status === 'Ocupado' && !existingResident) {
        // Status está como ocupado mas não há residente - inconsistência de dados
        this.logger.warn('Inconsistência detectada: leito marcado como ocupado sem residente associado', {
          bedId: bed.id,
          bedCode: bed.code,
          tenantId,
        });
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

    try {
      // Verificar se o leito existe antes de atualizar
      const bed = await this.prisma.bed.findFirst({
        where: {
          id: bedId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!bed) {
        this.logger.warn(`Leito não encontrado para atualização de status`, {
          bedId,
          tenantId,
        });
        return;
      }

      await this.prisma.bed.update({
        where: { id: bedId },
        data: { status: newStatus },
      });

      this.logger.info(`Bed status atualizado`, {
        bedId,
        newStatus,
        tenantId,
      });
    } catch (error) {
      this.logger.warn(`Erro ao atualizar status do leito`, {
        bedId,
        newStatus,
        tenantId,
        error: error.message,
      });
      // Não propagar o erro para não bloquear a operação principal
    }
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

      // Buscar residentes (sem relações - hierarquia é buscada manualmente)
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
            cns: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        this.prisma.resident.count({ where }),
      ]);

      // Buscar dados de acomodação para todos os residentes que têm bedId
      const residentsWithBedIds = residents.filter(r => r.bedId);
      const bedIds = residentsWithBedIds.map(r => r.bedId).filter((id): id is string => id !== null);

      let bedsMap = new Map();
      if (bedIds.length > 0) {
        const beds = await this.prisma.bed.findMany({
          where: {
            id: { in: bedIds },
            deletedAt: null,
          },
          select: {
            id: true,
            code: true,
            status: true,
            roomId: true,
          },
        });

        const roomIds = beds.map(b => b.roomId);
        const rooms = await this.prisma.room.findMany({
          where: {
            id: { in: roomIds },
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
            code: true,
            floorId: true,
          },
        });

        const floorIds = rooms.map(r => r.floorId);
        const floors = await this.prisma.floor.findMany({
          where: {
            id: { in: floorIds },
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
            code: true,
            buildingId: true,
          },
        });

        const buildingIds = floors.map(f => f.buildingId);
        const buildings = await this.prisma.building.findMany({
          where: {
            id: { in: buildingIds },
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
            code: true,
          },
        });

        // Criar mapas para lookup rápido
        const roomsMap = new Map(rooms.map(r => [r.id, r]));
        const floorsMap = new Map(floors.map(f => [f.id, f]));
        const buildingsMap = new Map(buildings.map(b => [b.id, b]));

        // Criar mapa de beds com hierarquia completa
        beds.forEach(bed => {
          const room = roomsMap.get(bed.roomId);
          const floor = room ? floorsMap.get(room.floorId) : null;
          const building = floor ? buildingsMap.get(floor.buildingId) : null;

          bedsMap.set(bed.id, {
            bed: {
              id: bed.id,
              code: bed.code,
              status: bed.status,
            },
            room: room ? {
              id: room.id,
              name: room.name,
              code: room.code,
            } : null,
            floor: floor ? {
              id: floor.id,
              name: floor.name,
              code: floor.code,
            } : null,
            building: building ? {
              id: building.id,
              name: building.name,
              code: building.code,
            } : null,
          });
        });
      }

      // Adicionar dados de acomodação aos residentes
      const processedResidents = residents.map(resident => {
        if (resident.bedId && bedsMap.has(resident.bedId)) {
          const accommodation = bedsMap.get(resident.bedId);
          return {
            ...resident,
            ...accommodation,
          };
        }
        return resident;
      });

      return {
        data: processedResidents,
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

      // Buscar dados completos de acomodação com hierarquia
      let room = null;
      let bed = null;
      let floor = null;
      let building = null;

      if (resident.bedId) {
        // Buscar bed com toda a hierarquia
        bed = await this.prisma.bed.findFirst({
          where: { id: resident.bedId, deletedAt: null },
          select: {
            id: true,
            code: true,
            status: true,
            room: {
              select: {
                id: true,
                name: true,
                code: true,
                floor: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    building: {
                      select: {
                        id: true,
                        name: true,
                        code: true
                      }
                    }
                  }
                }
              }
            }
          },
        });

        // Extrair dados da hierarquia
        if (bed?.room) {
          room = {
            id: bed.room.id,
            name: bed.room.name,
            code: bed.room.code
          };

          if (bed.room.floor) {
            floor = {
              id: bed.room.floor.id,
              name: bed.room.floor.name,
              code: bed.room.floor.code
            };

            if (bed.room.floor.building) {
              building = {
                id: bed.room.floor.building.id,
                name: bed.room.floor.building.name,
                code: bed.room.floor.building.code
              };
            }
          }

          // Simplificar o objeto bed
          bed = {
            id: bed.id,
            code: bed.code,
            status: bed.status
          };
        }
      } else if (resident.roomId) {
        // Buscar apenas room se não tem bed (caso legado)
        room = await this.prisma.room.findFirst({
          where: { id: resident.roomId, deletedAt: null },
          select: { id: true, name: true, code: true },
        });
      }

      // Processar foto com URLs assinadas se existir
      let fotoData = {};
      if (resident.fotoUrl) {
        try {
          const basePath = resident.fotoUrl;
          const smallPath = basePath.replace('.webp', '_small.webp');
          const mediumPath = basePath.replace('.webp', '_medium.webp');

          const [originalUrl, smallUrl, mediumUrl] = await Promise.allSettled([
            this.filesService.getFileUrl(basePath),
            this.filesService.getFileUrl(smallPath),
            this.filesService.getFileUrl(mediumPath),
          ]);

          fotoData = {
            fotoUrl: originalUrl.status === 'fulfilled' ? originalUrl.value : basePath,
            fotoUrlSmall: smallUrl.status === 'fulfilled' ? smallUrl.value : (originalUrl.status === 'fulfilled' ? originalUrl.value : basePath),
            fotoUrlMedium: mediumUrl.status === 'fulfilled' ? mediumUrl.value : (originalUrl.status === 'fulfilled' ? originalUrl.value : basePath),
          };
        } catch (error) {
          this.logger.warn('Erro ao gerar URL assinada para foto:', error);
        }
      }

      // Processar healthPlans com URLs assinadas
      let healthPlans = resident.healthPlans || [];
      if (Array.isArray(healthPlans) && healthPlans.length > 0) {
        healthPlans = await Promise.all(
          healthPlans.map(async (plan: any) => {
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

      // Retornar dados do residente com URLs assinadas
      return {
        ...resident,
        ...fotoData,
        healthPlans,
        room,
        bed,
        floor,
        building,
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
        tenantId: _tenantId, // Remove tenantId pois não pode ser atualizado
        ...restDto
      } = updateResidentDto as any;

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
