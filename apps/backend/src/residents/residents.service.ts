import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { FilesService } from '../files/files.service';
import { CreateResidentDto } from './dto/create-resident.dto';
import { UpdateResidentDto } from './dto/update-resident.dto';
import { QueryResidentDto } from './dto/query-resident.dto';
import { TransferBedDto } from './dto/transfer-bed.dto';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ACTIVE_STATUSES } from '../payments/types/subscription-status.enum';
import { ChangeType, DependencyLevel, Gender, Prisma } from '@prisma/client';
import { hasSignedUrlQuery } from '../common/utils/signed-url.util';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class ResidentsService {
  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema)
    private readonly tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
    private readonly filesService: FilesService,
    private readonly eventsGateway: EventsGateway,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  private emitDashboardOverviewUpdate(
    source:
      | 'resident.created'
      | 'resident.updated'
      | 'resident.deleted'
      | 'resident.bed-transferred',
  ) {
    const tenantId = this.tenantContext.tenantId;
    if (!tenantId) return;

    this.eventsGateway.emitDashboardOverviewUpdated({
      tenantId,
      source,
    });
  }

  private validateUnsignedPhotoUrl(fotoUrl?: string | null): void {
    if (!fotoUrl) return;

    if (hasSignedUrlQuery(fotoUrl)) {
      throw new BadRequestException(
        'fotoUrl inválida: envie apenas o path/base URL sem query string de assinatura.',
      );
    }
  }

  /**
   * Cria registro de histórico para auditoria (RDC 502/2021)
   * Sempre executado dentro de transação junto com a operação principal
   */
  private async createHistoryRecord(
    residentId: string,
    changeType: ChangeType,
    changeReason: string,
    changedBy: string,
    previousData: Record<string, unknown> | null,
    newData: Record<string, unknown>,
    changedFields: string[],
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await tx.residentHistory.create({
      data: {
        residentId,
        tenantId: this.tenantContext.tenantId, // ✅ Pega do contexto
        versionNumber: newData.versionNumber as number,
        changeType,
        changeReason,
        changedFields,
        previousData: previousData ? JSON.parse(JSON.stringify(previousData)) : null,
        newData: JSON.parse(JSON.stringify(newData)),
        changedAt: new Date(),
        changedBy,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      },
    });

    this.logger.info('History record created', {
      residentId,
      tenantId: this.tenantContext.tenantId,
      changeType,
      versionNumber: newData.versionNumber,
    });
  }

  /**
   * Calcula quais campos foram alterados comparando previousData e newData
   * Retorna array de nomes de campos modificados
   */
  private calculateChangedFields(previousData: Record<string, unknown>, newData: Record<string, unknown>): string[] {
    const changedFields: string[] = [];
    const allKeys = new Set([...Object.keys(previousData), ...Object.keys(newData)]);

    for (const key of allKeys) {
      // Ignorar campos de metadata que sempre mudam
      if (['updatedAt', 'versionNumber', 'updatedBy'].includes(key)) {
        continue;
      }

      // Ignorar CPF e outros campos criptografados (geram hash diferente a cada update mesmo sem mudança)
      // O middleware de criptografia usa salt+IV aleatórios, criando hashes diferentes para o mesmo valor
      if (['cpf', 'legalGuardianCpf'].includes(key)) {
        continue;
      }

      const oldValue = previousData[key];
      const newValue = newData[key];

      // Comparação profunda para objetos e arrays (JSON fields)
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changedFields.push(key);
      }
    }

    return changedFields;
  }

  /**
   * Converte campos DateTime que são @db.Date do Prisma para string YYYY-MM-DD
   * Isso evita problemas de timezone causados pela serialização JSON do JavaScript
   *
   * Campos afetados: birthDate, admissionDate, dischargeDate
   */
  private formatDateOnlyFields(resident: Record<string, unknown>): Record<string, unknown> {
    if (!resident) return resident;

    const formatDate = (date: Date | null | undefined): string | null => {
      if (!date) return null;
      // Garantir que é um objeto Date
      // eslint-disable-next-line no-restricted-syntax
      const d = date instanceof Date ? date : new Date(date);
      // Formatar como YYYY-MM-DD usando UTC para evitar timezone shift
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      ...resident,
      birthDate: formatDate(resident.birthDate as Date | null | undefined),
      admissionDate: formatDate(resident.admissionDate as Date | null | undefined),
      dischargeDate: formatDate(resident.dischargeDate as Date | null | undefined),
    };
  }

  /**
   * Valida e processa a acomodação (roomId e bedId)
   * Verifica: existência, disponibilidade, e conflitos de ocupação
   */
  private async validateAndProcessAccommodation(
    roomId: string | undefined,
    bedId: string | undefined,
    currentResidentId?: string, // Para saber qual residente está sendo atualizado
  ) {
    // Se não há acomodação a definir, retorna undefined
    if (!roomId && !bedId) {
      return { roomId: undefined, bedId: undefined };
    }

    // Se há bedId, validar
    if (bedId) {
      // Verificar se o leito existe
      const bed = await this.tenantContext.client.bed.findFirst({
        where: {
          id: bedId,
          deletedAt: null, // ✅ Sem tenantId
        },
        select: { id: true, code: true, status: true, roomId: true }, // Otimização: trazer apenas campos necessários
      });

      if (!bed) {
        throw new BadRequestException(`Leito com ID ${bedId} não encontrado`);
      }

      // Verificar se já existe um residente ocupando este leito
      const existingResident = await this.tenantContext.client.resident.findFirst({
        where: {
          bedId,
          deletedAt: null, // ✅ Sem tenantId
        },
        select: { id: true }, // Otimização: trazer apenas ID para validação
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
          tenantId: this.tenantContext.tenantId,
        });
      }

      // Se roomId não foi fornecido, extrair do leito
      if (!roomId) {
        roomId = bed.roomId;
      }
    }

    // Se há roomId, validar
    if (roomId) {
      const room = await this.tenantContext.client.room.findFirst({
        where: {
          id: roomId,
          deletedAt: null, // ✅ Sem tenantId
        },
        select: { id: true }, // Otimização: trazer apenas ID para validação
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
  ) {
    if (!bedId) return;

    try {
      // Verificar se o leito existe antes de atualizar
      const bed = await this.tenantContext.client.bed.findFirst({
        where: {
          id: bedId,
          deletedAt: null, // ✅ Sem tenantId
        },
      });

      if (!bed) {
        this.logger.warn(`Leito não encontrado para atualização de status`, {
          bedId,
          tenantId: this.tenantContext.tenantId,
        });
        return;
      }

      await this.tenantContext.client.bed.update({
        where: { id: bedId },
        data: { status: newStatus },
      });

      this.logger.info(`Bed status atualizado`, {
        bedId,
        newStatus,
        tenantId: this.tenantContext.tenantId,
      });
    } catch (error) {
      this.logger.warn(`Erro ao atualizar status do leito`, {
        bedId,
        newStatus,
        tenantId: this.tenantContext.tenantId,
        error: error.message,
      });
      // Não propagar o erro para não bloquear a operação principal
    }
  }

  /**
   * Atualiza status do leito E cria registro no histórico de status
   * Deve ser usado dentro de transações para garantir atomicidade
   */
  private async updateBedStatusWithHistory(
    bedId: string,
    newStatus: 'Ocupado' | 'Disponível',
    reason: string,
    userId: string,
    tx: Prisma.TransactionClient,
  ) {
    this.logger.info('🔄 Iniciando updateBedStatusWithHistory', {
      bedId,
      newStatus,
      tenantId: this.tenantContext.tenantId,
      userId,
    })

    // Buscar status atual do leito
    const bed = await tx.bed.findFirst({
      where: { id: bedId, deletedAt: null }, // ✅ Sem tenantId
      select: { id: true, code: true, status: true },
    })

    if (!bed) {
      this.logger.warn('❌ Leito não encontrado para atualização de status com histórico', {
        bedId,
        tenantId: this.tenantContext.tenantId,
      })
      return
    }

    const previousStatus = bed.status

    this.logger.info('📊 Status atual do leito', {
      bedCode: bed.code,
      previousStatus,
      newStatus,
    })

    // Atualizar status do leito
    await tx.bed.update({
      where: { id: bedId },
      data: { status: newStatus },
    })

    this.logger.info('✅ Status do leito atualizado no banco')

    // Criar registro no histórico de status
    const historyRecord = await tx.bedStatusHistory.create({
      data: {
        tenantId: this.tenantContext.tenantId,
        bedId,
        previousStatus,
        newStatus,
        reason,
        metadata: undefined,
        changedBy: userId,
      },
    })

    this.logger.info('✅ Registro criado em bed_status_history', {
      historyId: historyRecord.id,
      bedId,
      bedCode: bed.code,
      previousStatus,
      newStatus,
      reason,
      userId,
    })
  }

  /**
   * Cria um novo residente usando o Prisma Client
   */
  async create(createResidentDto: CreateResidentDto, userId: string) {
    try {
      this.validateUnsignedPhotoUrl(createResidentDto.fotoUrl);

      // Buscar o tenant (tabela SHARED - usa this.prisma)
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: this.tenantContext.tenantId },
        include: {
          subscriptions: {
            where: {
              status: { in: ACTIVE_STATUSES },
            },
            include: { plan: true },
            take: 1,
          },
        },
      });

      if (!tenant) {
        throw new NotFoundException('Tenant não encontrado');
      }

      // Verificar limite de residentes (usando limites efetivos com overrides)
      if (tenant.subscriptions[0]?.plan) {
        const currentCount = await this.tenantContext.client.resident.count({
          where: {
            deletedAt: null, // ✅ Sem tenantId - schema já isola
          },
        });

        // ✅ Calcular limite efetivo: customMaxResidents ?? plan.maxResidents
        const planMaxResidents = tenant.subscriptions[0].plan.maxResidents;
        const effectiveMaxResidents = tenant.customMaxResidents ?? planMaxResidents;

        if (effectiveMaxResidents !== -1 && currentCount >= effectiveMaxResidents) {
          throw new BadRequestException(
            `Limite de ${effectiveMaxResidents} residentes atingido para o plano atual`,
          );
        }
      }

      // Verificar CPF duplicado
      if (createResidentDto.cpf) {
        const existingCpf = await this.tenantContext.client.resident.findFirst({
          where: {
            cpf: createResidentDto.cpf,
            deletedAt: null, // ✅ Sem tenantId
          },
          select: { id: true }, // Otimização: trazer apenas ID para validação
        });

        if (existingCpf) {
          throw new BadRequestException('CPF já cadastrado');
        }
      }

      // Validar acomodação (roomId e bedId)
      const accommodation = await this.validateAndProcessAccommodation(
        createResidentDto.roomId,
        createResidentDto.bedId,
      );

      // Usar transação para garantir atomicidade (Resident + ResidentHistory)
      const resident = await this.tenantContext.client.$transaction(async (tx) => {
        // Criar o residente
        const newResident = await tx.resident.create({
          data: {
            tenantId: this.tenantContext.tenantId, // Schema isolation já funciona, mas campo ainda é obrigatório
            createdBy: userId, // Auditoria: quem criou
            versionNumber: 1, // Primeira versão

            // 0. Status
            status: createResidentDto.status || 'Ativo',

            // 1. Dados Pessoais
            fullName: createResidentDto.fullName,
            socialName: createResidentDto.socialName,
            email: createResidentDto.email,
            cpf: createResidentDto.cpf,
            rg: createResidentDto.rg,
            rgIssuer: createResidentDto.rgIssuer,
            education: createResidentDto.education,
            profession: createResidentDto.profession,
            cns: createResidentDto.cns,
            gender: createResidentDto.gender,
            civilStatus: createResidentDto.civilStatus,
            religion: createResidentDto.religion,
            birthDate: new Date(createResidentDto.birthDate),
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

            origin: createResidentDto.origin,

            // 3. Contatos de Emergência
            emergencyContacts: (createResidentDto.emergencyContacts || []) as unknown as Prisma.InputJsonValue,

            // 4. Responsável Legal
            legalGuardianName: createResidentDto.legalGuardianName,
            legalGuardianEmail: createResidentDto.legalGuardianEmail,
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
            admissionDate: new Date(createResidentDto.admissionDate),
            admissionType: createResidentDto.admissionType,
            admissionReason: createResidentDto.admissionReason,
            admissionConditions: createResidentDto.admissionConditions,
            dischargeDate: createResidentDto.dischargeDate ? new Date(createResidentDto.dischargeDate) : null,
            dischargeReason: createResidentDto.dischargeReason,

            // 6. Saúde (migrado para tabelas separadas: resident_blood_types, resident_anthropometry, resident_dependency_assessments)
            // Campos removidos: bloodType, height, weight, dependencyLevel, mobilityAid, medicationsOnAdmission

            // 7. Convênios
            healthPlans: (createResidentDto.healthPlans || []) as unknown as Prisma.InputJsonValue,

            // 8. Pertences - Movido para módulo ResidentBelongings
            // Agora gerenciado via /residents/:id/belongings

            // 9. Acomodação
            roomId: accommodation.roomId,
            bedId: accommodation.bedId,
          },
        });

        // Criar histórico de criação (RDC 502/2021 - rastreabilidade completa)
        await this.createHistoryRecord(
          newResident.id,
          ChangeType.CREATE,
          'Criação inicial do registro do residente',
          userId,
          null, // previousData é null em CREATE
          newResident,
          [], // changedFields vazio em CREATE (todos os campos são novos)
          tx,
        );

        // Atualizar status do leito para "Ocupado" se foi atribuído
        if (accommodation.bedId) {
          await this.updateBedStatusWithHistory(
            accommodation.bedId,
            'Ocupado',
            `Designação inicial de leito no cadastro do residente ${newResident.fullName}`,
            userId,
            tx,
          );

          // ✅ Criar registro de histórico de primeira designação de leito
          await tx.bedTransferHistory.create({
            data: {
              tenantId: this.tenantContext.tenantId,
              residentId: newResident.id,
              fromBedId: null, // null = primeira designação (não tinha leito antes)
              toBedId: accommodation.bedId,
              reason: 'Designação inicial de leito no cadastro do residente',
              transferredAt: new Date(),
              transferredBy: userId,
            },
          });
        }

        // Criar ClinicalProfile se campos clínicos foram fornecidos
        // (campos migraram de Resident para ClinicalProfile)
        if (
          createResidentDto.healthStatus ||
          createResidentDto.specialNeeds ||
          createResidentDto.functionalAspects
        ) {
          await tx.clinicalProfile.create({
            data: {
              tenantId: this.tenantContext.tenantId,
              residentId: newResident.id,
              healthStatus: createResidentDto.healthStatus,
              specialNeeds: createResidentDto.specialNeeds,
              functionalAspects: createResidentDto.functionalAspects,
              updatedBy: userId,
            },
          });
        }

        // TODO: Implementar criação de Allergies, Conditions e DietaryRestrictions
        // quando o frontend enviar os dados no formato correto (não apenas strings CSV)

        return newResident;
      });

      this.logger.info('Residente criado com histórico', {
        residentId: resident.id,
        tenantId: this.tenantContext.tenantId,
        userId,
        bedId: accommodation.bedId,
        versionNumber: 1,
      });

      this.emitDashboardOverviewUpdate('resident.created');

      return this.formatDateOnlyFields(resident);
    } catch (error) {
      this.logger.error('Erro ao criar residente', {
        error: error.message,
        tenantId: this.tenantContext.tenantId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Lista todos os residentes do tenant com filtros e paginação
   */
  async findAll(query: QueryResidentDto) {
    try {
      const page = parseInt(query.page || '1');
      const limit = parseInt(query.limit || '10');
      const skip = (page - 1) * limit;

      // Construir filtros
      const where: Prisma.ResidentWhereInput = {
        deletedAt: null, // ✅ Sem tenantId
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
        where.gender = query.gender as Gender;
      }

      if (query.dependencyLevel) {
        where.dependencyAssessments = {
          some: {
            dependencyLevel: query.dependencyLevel as DependencyLevel,
            deletedAt: null,
          },
        };
      }

      // Buscar residentes (sem relações - hierarquia é buscada manualmente)
      const [residents, total] = await Promise.all([
        this.tenantContext.client.resident.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            [query.sortBy || 'fullName']: query.sortOrder || 'asc',
          },
          select: {
            id: true,
            tenantId: true, // CRITICAL: Necessário para descriptografia do middleware
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
            // Dados de saúde migrados para tabelas separadas:
            // - bloodType → resident_blood_types
            // - height, weight → resident_anthropometry
            // - dependencyLevel, mobilityAid → resident_dependency_assessments
            createdAt: true,
            updatedAt: true,
          },
        }),
        this.tenantContext.client.resident.count({ where }),
      ]);

      // Buscar dados de acomodação para todos os residentes que têm bedId
      const residentsWithBedIds = residents.filter(r => r.bedId);
      const bedIds = residentsWithBedIds.map(r => r.bedId).filter((id): id is string => id !== null);

      const bedsMap = new Map();
      if (bedIds.length > 0) {
        const beds = await this.tenantContext.client.bed.findMany({
          where: {
            id: { in: bedIds },
            deletedAt: null, // ✅ Sem tenantId
          },
          select: {
            id: true,
            code: true,
            status: true,
            roomId: true,
          },
        });

        const roomIds = beds.map(b => b.roomId);
        const rooms = await this.tenantContext.client.room.findMany({
          where: {
            id: { in: roomIds },
            deletedAt: null, // ✅ Sem tenantId
          },
          select: {
            id: true,
            name: true,
            code: true,
            floorId: true,
          },
        });

        const floorIds = rooms.map(r => r.floorId);
        const floors = await this.tenantContext.client.floor.findMany({
          where: {
            id: { in: floorIds },
            deletedAt: null, // ✅ Sem tenantId
          },
          select: {
            id: true,
            name: true,
            code: true,
            buildingId: true,
          },
        });

        const buildingIds = floors.map(f => f.buildingId);
        const buildings = await this.tenantContext.client.building.findMany({
          where: {
            id: { in: buildingIds },
            deletedAt: null, // ✅ Sem tenantId
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

      // Buscar dados da última avaliação de dependência de cada residente
      const residentIds = residents.map(r => r.id);
      const dependencyDataMap = new Map<string, { mobilityAid: boolean; dependencyLevel: string | null }>();

      if (residentIds.length > 0) {
        // Buscar a última avaliação de dependência de cada residente
        const latestAssessments = await this.tenantContext.client.residentDependencyAssessment.findMany({
          where: {
            residentId: { in: residentIds },
            deletedAt: null,
          },
          orderBy: { effectiveDate: 'desc' },
          distinct: ['residentId'],
          select: {
            residentId: true,
            mobilityAid: true,
            dependencyLevel: true,
          },
        });

        latestAssessments.forEach(assessment => {
          dependencyDataMap.set(assessment.residentId, {
            mobilityAid: assessment.mobilityAid,
            dependencyLevel: assessment.dependencyLevel,
          });
        });
      }

      // Adicionar dados de acomodação e dependência aos residentes e formatar datas
      const processedResidents = residents.map(resident => {
        const residentWithAccommodation = resident.bedId && bedsMap.has(resident.bedId)
          ? {
              ...resident,
              ...bedsMap.get(resident.bedId),
            }
          : resident;

        // Adicionar dados da última avaliação de dependência
        const dependencyData = dependencyDataMap.get(resident.id);
        const residentWithDependency = {
          ...residentWithAccommodation,
          mobilityAid: dependencyData?.mobilityAid ?? false,
          dependencyLevel: dependencyData?.dependencyLevel ?? null,
        };

        return this.formatDateOnlyFields(residentWithDependency);
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
        tenantId: this.tenantContext.tenantId,
      });
      throw error;
    }
  }

  /**
   * Busca um residente específico
   */
  async findOne(id: string) {
    try {
      const resident = await this.tenantContext.client.resident.findFirst({
        where: {
          id,
          deletedAt: null, // ✅ Sem tenantId
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
        bed = await this.tenantContext.client.bed.findFirst({
          where: { id: resident.bedId, deletedAt: null }, // ✅ Sem tenantId
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
        room = await this.tenantContext.client.room.findFirst({
          where: { id: resident.roomId, deletedAt: null }, // ✅ Sem tenantId
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
        healthPlans = (await Promise.all(
          healthPlans.map(async (plan) => {
            const planObj = plan as Record<string, unknown>;
            if (planObj.cardUrl) {
              try {
                return {
                  ...planObj,
                  cardUrl: await this.filesService.getFileUrl(planObj.cardUrl as string),
                };
              } catch (error) {
                this.logger.warn('Erro ao gerar URL assinada para cartão do convênio:', error);
                return planObj;
              }
            }
            return plan;
          })
        )) as unknown as Prisma.JsonArray;
      }

      // Buscar alergias da tabela Allergy
      const allergies = await this.tenantContext.client.allergy.findMany({
        where: {
          residentId: id,
          deletedAt: null, // ✅ Sem tenantId
        },
        select: {
          id: true,
          substance: true,
          reaction: true,
          severity: true,
          notes: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Buscar restrições alimentares da tabela DietaryRestriction
      const dietaryRestrictions = await this.tenantContext.client.dietaryRestriction.findMany({
        where: {
          residentId: id,
          deletedAt: null, // ✅ Sem tenantId
        },
        select: {
          id: true,
          restrictionType: true,
          description: true,
          notes: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Buscar condições crônicas da tabela Condition
      const conditions = await this.tenantContext.client.condition.findMany({
        where: {
          residentId: id,
          deletedAt: null, // ✅ Sem tenantId
        },
        select: {
          id: true,
          condition: true,
          icdCode: true,
          notes: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Verificar se possui medicações controladas ativas
      const hasControlledMedication = await this.tenantContext.client.medication.findFirst({
        where: {
          prescription: {
            residentId: id,
            isActive: true,
            deletedAt: null, // ✅ Sem tenantId na nested relation
          },
          isControlled: true,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      // Retornar dados do residente com URLs assinadas e datas formatadas
      return this.formatDateOnlyFields({
        ...resident,
        ...fotoData,
        healthPlans,
        room,
        bed,
        floor,
        building,
        allergies, // Substituir campo allergies do Resident pelas alergias da tabela Allergy
        dietaryRestrictions, // Adicionar restrições alimentares
        conditions, // Adicionar condições crônicas
        hasControlledMedication: !!hasControlledMedication, // Retornar boolean
      });
    } catch (error) {
      this.logger.error('Erro ao buscar residente', {
        error: error.message,
        residentId: id,
        tenantId: this.tenantContext.tenantId,
      });
      throw error;
    }
  }

  /**
   * Atualiza um residente COM VERSIONAMENTO
   * IMPORTANTE: updateResidentDto DEVE conter changeReason (validado no DTO)
   */
  async update(id: string, updateResidentDto: UpdateResidentDto, userId: string) {
    try {
      if (updateResidentDto.fotoUrl !== undefined) {
        this.validateUnsignedPhotoUrl(updateResidentDto.fotoUrl);
      }

      // Extrair changeReason do DTO (será validado no DTO layer)
      const changeReason = (updateResidentDto as UpdateResidentDto & { changeReason: string }).changeReason;

      if (!changeReason || changeReason.trim().length < 10) {
        throw new BadRequestException(
          'changeReason é obrigatório e deve ter no mínimo 10 caracteres',
        );
      }

      // Verificar se residente existe
      // Nota: Precisa buscar todos os campos pois são usados para criar o histórico de versões
      const existingResident = await this.tenantContext.client.resident.findFirst({
        where: {
          id,
          deletedAt: null, // ✅ Sem tenantId
        },
      });

      if (!existingResident) {
        throw new NotFoundException('Residente não encontrado');
      }

      // Verificar CPF duplicado (se estiver sendo atualizado)
      if (updateResidentDto.cpf && updateResidentDto.cpf !== existingResident.cpf) {
        const existingCpf = await this.tenantContext.client.resident.findFirst({
          where: {
            cpf: updateResidentDto.cpf,
            id: { not: id },
            deletedAt: null, // ✅ Sem tenantId
          },
          select: { id: true }, // Otimização: trazer apenas ID para validação
        });

        if (existingCpf) {
          throw new BadRequestException('CPF já cadastrado');
        }
      }

      // Validar acomodação (roomId e bedId) se estiverem sendo atualizados
      let accommodationToUpdate: { roomId?: string; bedId?: string } | null = null;
      const oldBedId = existingResident.bedId;
      let newBedId: string | undefined;

      if (updateResidentDto.roomId !== undefined || updateResidentDto.bedId !== undefined) {
        accommodationToUpdate = await this.validateAndProcessAccommodation(
          updateResidentDto.roomId,
          updateResidentDto.bedId,
          id, // currentResidentId
        );

        newBedId = accommodationToUpdate.bedId;
      }

      // Criar snapshot completo do estado anterior (para histórico)
      const previousData = JSON.parse(JSON.stringify(existingResident));

      // Extrair campos JSON para tratamento explícito (conversão de tipo necessária para Prisma)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const {
        emergencyContacts,
        documents,
        addressDocuments,
        legalGuardianDocuments,
        medicalReport,
        healthPlans,
        roomId: _roomId,
        bedId: _bedId,
        tenantId: _tenantId, // Remove tenantId pois não pode ser atualizado
        changeReason: _changeReason, // Remove changeReason pois não é campo do modelo
        ...restDto
      } = updateResidentDto as UpdateResidentDto & Record<string, unknown>;

      // Construir objeto de atualização com tipos corretos
      const dataToUpdate: Record<string, unknown> = Object.fromEntries(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        Object.entries(restDto).filter(([_key, value]) => value !== undefined)
      );

      // Converter campos DATE de string YYYY-MM-DD para Date objects
      if (dataToUpdate.birthDate) dataToUpdate.birthDate = new Date(dataToUpdate.birthDate as string);
      if (dataToUpdate.admissionDate) dataToUpdate.admissionDate = new Date(dataToUpdate.admissionDate as string);
      if (dataToUpdate.dischargeDate) dataToUpdate.dischargeDate = new Date(dataToUpdate.dischargeDate as string);

      // Adicionar campos JSON apenas se foram enviados
      if (emergencyContacts !== undefined) dataToUpdate.emergencyContacts = emergencyContacts;
      if (documents !== undefined) dataToUpdate.documents = documents;
      if (addressDocuments !== undefined) dataToUpdate.addressDocuments = addressDocuments;
      if (legalGuardianDocuments !== undefined) dataToUpdate.legalGuardianDocuments = legalGuardianDocuments;
      if (medicalReport !== undefined) dataToUpdate.medicalReport = medicalReport;
      if (healthPlans !== undefined) dataToUpdate.healthPlans = healthPlans;

      // Adicionar acomodação validada se foi processada
      // ✅ IMPORTANTE: Sempre atualizar roomId e bedId, mesmo quando são null (remoção de leito)
      if (accommodationToUpdate) {
        dataToUpdate.roomId = accommodationToUpdate.roomId;
        dataToUpdate.bedId = accommodationToUpdate.bedId;
      }

      // Adicionar campos de auditoria e versionamento
      dataToUpdate.updatedBy = userId;
      dataToUpdate.versionNumber = existingResident.versionNumber + 1;

      // Usar transação para garantir atomicidade (UPDATE + HISTORY + BED STATUS)
      const updated = await this.tenantContext.client.$transaction(async (tx) => {
        // Atualizar o residente
        const updatedResident = await tx.resident.update({
          where: { id },
          data: dataToUpdate,
        });

        // Criar snapshot do novo estado
        const newData = JSON.parse(JSON.stringify(updatedResident));

        // Calcular campos alterados
        const changedFields = this.calculateChangedFields(previousData, newData);

        // Criar histórico da alteração
        await this.createHistoryRecord(
          id,
          ChangeType.UPDATE,
          changeReason,
          userId,
          previousData,
          newData,
          changedFields,
          tx,
        );

        // Atualizar status do leito se mudou
        if (oldBedId && newBedId && oldBedId !== newBedId) {
          // Caso 1: Mudança de leito (transferência via edição)
          // Liberar leito antigo
          await this.updateBedStatusWithHistory(
            oldBedId,
            'Disponível',
            `Residente ${updatedResident.fullName} saiu do leito (editado por usuário). Motivo: ${changeReason}`,
            userId,
            tx,
          );

          // Ocupar novo leito
          await this.updateBedStatusWithHistory(
            newBedId,
            'Ocupado',
            `Residente ${updatedResident.fullName} designado ao leito (editado por usuário). Motivo: ${changeReason}`,
            userId,
            tx,
          );

          // ✅ Criar registro de histórico de transferência
          await tx.bedTransferHistory.create({
            data: {
              tenantId: this.tenantContext.tenantId,
              residentId: id,
              fromBedId: oldBedId,
              toBedId: newBedId,
              reason: changeReason || 'Transferência via edição de cadastro',
              transferredAt: new Date(),
              transferredBy: userId,
            },
          });
        } else if (oldBedId && !newBedId) {
          // Caso 2: Remoção de leito
          await this.updateBedStatusWithHistory(
            oldBedId,
            'Disponível',
            `Residente ${updatedResident.fullName} removido do leito (editado por usuário). Motivo: ${changeReason}`,
            userId,
            tx,
          );
        } else if (!oldBedId && newBedId) {
          // Caso 3: Designação de leito via edição (residente não tinha leito antes)
          await this.updateBedStatusWithHistory(
            newBedId,
            'Ocupado',
            `Residente ${updatedResident.fullName} designado ao leito (editado por usuário). Motivo: ${changeReason}`,
            userId,
            tx,
          );

          // ✅ Criar registro de histórico de primeira designação de leito
          await tx.bedTransferHistory.create({
            data: {
              tenantId: this.tenantContext.tenantId,
              residentId: id,
              fromBedId: null, // null = primeira designação (não tinha leito antes)
              toBedId: newBedId,
              reason: changeReason || 'Primeira designação de leito via cadastro',
              transferredAt: new Date(),
              transferredBy: userId,
            },
          });
        }

        return updatedResident;
      });

      this.logger.info('Residente atualizado com versionamento', {
        residentId: id,
        tenantId: this.tenantContext.tenantId,
        userId,
        oldBedId,
        newBedId,
        versionNumber: updated.versionNumber,
        changedFieldsCount: this.calculateChangedFields(previousData, updated).length,
      });

      this.emitDashboardOverviewUpdate('resident.updated');

      return this.formatDateOnlyFields(updated);
    } catch (error) {
      this.logger.error('Erro ao atualizar residente', {
        error: error.message,
        residentId: id,
        tenantId: this.tenantContext.tenantId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Remove um residente (soft delete COM VERSIONAMENTO)
   * IMPORTANTE: Requer changeReason para documentar o motivo da exclusão
   */
  async remove(id: string, userId: string, changeReason: string) {
    try {
      // Validar changeReason
      if (!changeReason || changeReason.trim().length < 10) {
        throw new BadRequestException(
          'changeReason é obrigatório e deve ter no mínimo 10 caracteres',
        );
      }

      // Verificar se residente existe
      // Nota: Precisa buscar todos os campos pois são usados para criar o histórico de versões
      const existingResident = await this.tenantContext.client.resident.findFirst({
        where: {
          id,
          deletedAt: null, // ✅ Sem tenantId
        },
      });

      if (!existingResident) {
        throw new NotFoundException('Residente não encontrado');
      }

      // Criar snapshot do estado anterior
      const previousData = JSON.parse(JSON.stringify(existingResident));

      // Usar transação para soft delete + histórico
      const deleted = await this.tenantContext.client.$transaction(async (tx) => {
        // Soft delete
        const deletedResident = await tx.resident.update({
          where: { id },
          data: {
            deletedAt: new Date(),
            updatedBy: userId,
            versionNumber: existingResident.versionNumber + 1,
          },
        });

        // Criar snapshot do estado deletado
        const newData = JSON.parse(JSON.stringify(deletedResident));

        // Criar histórico da deleção
        await this.createHistoryRecord(
          id,
          ChangeType.DELETE,
          changeReason,
          userId,
          previousData,
          newData,
          ['deletedAt'], // Campo alterado
          tx,
        );

        // Liberar leito se estava ocupado
        if (existingResident.bedId) {
          await tx.bed.update({
            where: { id: existingResident.bedId },
            data: { status: 'Disponível' },
          });
        }

        return deletedResident;
      });

      this.logger.info('Residente removido (soft delete) com versionamento', {
        residentId: id,
        tenantId: this.tenantContext.tenantId,
        userId,
        versionNumber: deleted.versionNumber,
      });

      this.emitDashboardOverviewUpdate('resident.deleted');

      return { message: 'Residente removido com sucesso' };
    } catch (error) {
      this.logger.error('Erro ao remover residente', {
        error: error.message,
        residentId: id,
        tenantId: this.tenantContext.tenantId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Retorna estatísticas dos residentes
   */
  async getStats() {
    const where = {
      deletedAt: null, // ✅ Sem tenantId
    };

    // Total de residentes
    const total = await this.tenantContext.client.resident.count({ where });

    // Ativos
    const ativos = await this.tenantContext.client.resident.count({
      where: { ...where, status: 'Ativo' },
    });

    // Inativos
    const inativos = await this.tenantContext.client.resident.count({
      where: { ...where, status: 'Inativo' },
    });

    // Por grau de dependência (somente ativos) - agora busca da tabela resident_dependency_assessments
    // Busca residentes ativos que têm avaliação vigente (endDate IS NULL)
    const grauI = await this.tenantContext.client.residentDependencyAssessment.count({
      where: {
        deletedAt: null,
        endDate: null, // Avaliação vigente
        dependencyLevel: 'GRAU_I',
        resident: {
          status: 'Ativo',
          deletedAt: null,
        },
      },
    });

    const grauII = await this.tenantContext.client.residentDependencyAssessment.count({
      where: {
        deletedAt: null,
        endDate: null, // Avaliação vigente
        dependencyLevel: 'GRAU_II',
        resident: {
          status: 'Ativo',
          deletedAt: null,
        },
      },
    });

    const grauIII = await this.tenantContext.client.residentDependencyAssessment.count({
      where: {
        deletedAt: null,
        endDate: null, // Avaliação vigente
        dependencyLevel: 'GRAU_III',
        resident: {
          status: 'Ativo',
          deletedAt: null,
        },
      },
    });

    // Por gênero
    const masculino = await this.tenantContext.client.resident.count({
      where: { ...where, gender: 'MASCULINO' },
    });

    const feminino = await this.tenantContext.client.resident.count({
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

  /**
   * Retorna o histórico completo de alterações de um residente
   * Ordenado por versionNumber DESC (mais recente primeira)
   */
  async getHistory(residentId: string) {
    try {
      // Verificar se residente existe (permitir deletados para ver histórico completo)
      const resident = await this.tenantContext.client.resident.findFirst({
        where: {
          id: residentId,
        },
        select: {
          id: true,
          fullName: true,
          cpf: true,
          versionNumber: true,
          status: true,
          deletedAt: true
        }, // Otimização: trazer apenas campos usados na resposta
      });

      if (!resident) {
        throw new NotFoundException('Residente não encontrado');
      }

      // Buscar histórico completo com informações do usuário que fez a alteração
      const history = await this.tenantContext.client.residentHistory.findMany({
        where: {
          residentId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          versionNumber: 'desc',
        },
      });

      return {
        resident: {
          id: resident.id,
          fullName: resident.fullName,
          cpf: resident.cpf,
          versionNumber: resident.versionNumber,
          status: resident.status,
          deletedAt: resident.deletedAt,
        },
        history: history.map(entry => ({
          id: entry.id,
          versionNumber: entry.versionNumber,
          changeType: entry.changeType,
          changeReason: entry.changeReason,
          changedFields: entry.changedFields,
          changedAt: entry.changedAt,
          changedBy: {
            id: entry.user.id,
            name: entry.user.name,
            email: entry.user.email,
          },
          // previousData e newData estão disponíveis mas não retornados por padrão
          // para evitar payload muito grande - pode ser adicionado via query param
        })),
        totalVersions: history.length,
      };
    } catch (error) {
      this.logger.error('Erro ao buscar histórico do residente', {
        error: error.message,
        residentId,
        tenantId: this.tenantContext.tenantId,
      });
      throw error;
    }
  }

  /**
   * Retorna uma versão específica do histórico com snapshots completos
   */
  async getHistoryVersion(residentId: string, versionNumber: number) {
    try {
      const historyEntry = await this.tenantContext.client.residentHistory.findFirst({
        where: {
          residentId,
          versionNumber,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!historyEntry) {
        throw new NotFoundException(`Versão ${versionNumber} não encontrada no histórico`);
      }

      return {
        id: historyEntry.id,
        versionNumber: historyEntry.versionNumber,
        changeType: historyEntry.changeType,
        changeReason: historyEntry.changeReason,
        changedFields: historyEntry.changedFields,
        previousData: historyEntry.previousData,
        newData: historyEntry.newData,
        changedAt: historyEntry.changedAt,
        changedBy: {
          id: historyEntry.user.id,
          name: historyEntry.user.name,
          email: historyEntry.user.email,
        },
        metadata: historyEntry.metadata,
      };
    } catch (error) {
      this.logger.error('Erro ao buscar versão específica do histórico', {
        error: error.message,
        residentId,
        versionNumber,
        tenantId: this.tenantContext.tenantId,
      });
      throw error;
    }
  }

  /**
   * Transfere um residente para outro leito com histórico
   * Compliance: RDC 502/2021 Art. 18 - Registro de movimentações
   */
  async transferBed(
    residentId: string,
    transferBedDto: TransferBedDto,
    userId: string,
  ) {
    try {
      this.logger.info('Iniciando transferência de leito', {
        residentId,
        toBedId: transferBedDto.toBedId,
        tenantId: this.tenantContext.tenantId,
        userId,
      });

      const transferResult = await this.tenantContext.client.$transaction(async (prisma) => {
        // 1. Buscar residente com bed atual
        const resident = await prisma.resident.findFirst({
          where: {
            id: residentId,
            deletedAt: null,
          },
          include: {
            bed: true,
          },
        });

        if (!resident) {
          throw new NotFoundException('Residente não encontrado');
        }

        if (!resident.bedId) {
          throw new BadRequestException(
            'Residente não está alocado em nenhum leito',
          );
        }

        // 2. Validar que não está tentando transferir para o mesmo leito
        if (resident.bedId === transferBedDto.toBedId) {
          throw new BadRequestException(
            'O leito de destino é o mesmo que o leito atual',
          );
        }

        // 3. Buscar leito de destino
        const toBed = await prisma.bed.findFirst({
          where: {
            id: transferBedDto.toBedId,
            deletedAt: null,
          },
          include: {
            resident: true,
          },
        });

        if (!toBed) {
          throw new NotFoundException('Leito de destino não encontrado');
        }

        // 4. Validar que leito de destino está disponível
        if (toBed.status === 'Ocupado' || toBed.resident) {
          throw new BadRequestException(
            `Leito ${toBed.code} já está ocupado`,
          );
        }

        if (toBed.status === 'Manutenção') {
          throw new BadRequestException(
            `Leito ${toBed.code} está em manutenção`,
          );
        }

        // 5. Atualizar status do leito de origem para Disponível
        await this.updateBedStatusWithHistory(
          resident.bedId,
          'Disponível',
          `Residente ${resident.fullName} transferido para outro leito. Motivo da transferência: ${transferBedDto.reason}`,
          userId,
          prisma,
        );

        // 6. Atualizar status do leito de destino para Ocupado
        await this.updateBedStatusWithHistory(
          transferBedDto.toBedId,
          'Ocupado',
          `Residente ${resident.fullName} transferido para este leito. Motivo da transferência: ${transferBedDto.reason}`,
          userId,
          prisma,
        );

        // 7. Atualizar bedId do residente
        const updatedResident = await prisma.resident.update({
          where: { id: residentId },
          data: {
            bedId: transferBedDto.toBedId,
            updatedBy: userId,
          },
          include: {
            bed: {
              include: {
                room: {
                  include: {
                    floor: {
                      include: {
                        building: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        // 8. Criar registro de histórico de transferência
        const transferHistory = await prisma.bedTransferHistory.create({
          data: {
            tenantId: this.tenantContext.tenantId,
            residentId,
            fromBedId: resident.bedId,
            toBedId: transferBedDto.toBedId,
            reason: transferBedDto.reason,
            transferredAt: transferBedDto.transferredAt
              ? new Date(transferBedDto.transferredAt)
              : new Date(),
            transferredBy: userId,
          },
          include: {
            fromBed: {
              include: {
                room: {
                  include: {
                    floor: {
                      include: {
                        building: true,
                      },
                    },
                  },
                },
              },
            },
            toBed: {
              include: {
                room: {
                  include: {
                    floor: {
                      include: {
                        building: true,
                      },
                    },
                  },
                },
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        this.logger.info('Transferência de leito concluída', {
          residentId,
          fromBedId: resident.bedId,
          toBedId: transferBedDto.toBedId,
          transferHistoryId: transferHistory.id,
        });

        return {
          resident: updatedResident,
          transferHistory,
          message: `Residente transferido de ${resident.bed?.code || 'leito anterior'} para ${toBed.code} com sucesso`,
        };
      });

      this.emitDashboardOverviewUpdate('resident.bed-transferred');
      return transferResult;
    } catch (error) {
      this.logger.error('Erro ao transferir residente de leito', {
        error: error.message,
        residentId,
        toBedId: transferBedDto.toBedId,
        tenantId: this.tenantContext.tenantId,
      });
      throw error;
    }
  }
}
