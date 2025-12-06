import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FilesService } from '../files/files.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { QueryPrescriptionDto } from './dto/query-prescription.dto';
import { AdministerMedicationDto } from './dto/administer-medication.dto';
import { AdministerSOSDto } from './dto/administer-sos.dto';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import {
  PrescriptionType,
  ControlledClass,
  NotificationType,
  MedicationPresentation,
  AdministrationRoute,
  MedicationFrequency,
  SOSIndicationType,
} from '@prisma/client';

@Injectable()
export class PrescriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
    private readonly notificationsService: NotificationsService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * Converte campos DateTime que são @db.Date do Prisma para string YYYY-MM-DD
   * Isso evita problemas de timezone causados pela serialização JSON do JavaScript
   *
   * Campos afetados: prescriptionDate, validUntil, reviewDate
   */
  private formatDateOnlyFields(prescription: any): any {
    if (!prescription) return prescription;

    const formatDate = (date: Date | null | undefined): string | null => {
      if (!date) return null;
      // Garantir que é um objeto Date
      const d = date instanceof Date ? date : new Date(date);
      // Formatar como YYYY-MM-DD usando UTC para evitar timezone shift
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      ...prescription,
      prescriptionDate: formatDate(prescription.prescriptionDate),
      validUntil: formatDate(prescription.validUntil),
      reviewDate: formatDate(prescription.reviewDate),
    };
  }

  /**
   * Cria uma nova prescrição
   */
  async create(
    createPrescriptionDto: CreatePrescriptionDto,
    tenantId: string,
    userId: string,
  ) {
    try {
      // 1. Verificar se residente existe e pertence ao tenant
      const resident = await this.prisma.resident.findFirst({
        where: {
          id: createPrescriptionDto.residentId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!resident) {
        throw new NotFoundException('Residente não encontrado');
      }

      // 2. Validar campos obrigatórios por tipo de prescrição
      this.validatePrescriptionByType(createPrescriptionDto);

      // 3. Validar horários dos medicamentos contínuos (se houver)
      if (createPrescriptionDto.medications && createPrescriptionDto.medications.length > 0) {
        for (const medication of createPrescriptionDto.medications) {
          this.validateScheduledTimes(medication.scheduledTimes);
        }
      }

      // 4. Criar prescrição com medicamentos e SOS em transação
      const prescription = await this.prisma.$transaction(async (tx) => {
        // 4.1 Criar a prescrição
        const newPrescription = await tx.prescription.create({
          data: {
            tenantId,
            residentId: createPrescriptionDto.residentId,
            doctorName: createPrescriptionDto.doctorName,
            doctorCrm: createPrescriptionDto.doctorCrm,
            doctorCrmState: createPrescriptionDto.doctorCrmState,
            prescriptionDate: new Date(createPrescriptionDto.prescriptionDate),
            prescriptionType: createPrescriptionDto.prescriptionType as PrescriptionType,
            validUntil: createPrescriptionDto.validUntil
              ? new Date(createPrescriptionDto.validUntil)
              : null,
            reviewDate: createPrescriptionDto.reviewDate
              ? new Date(createPrescriptionDto.reviewDate)
              : null,
            controlledClass: createPrescriptionDto.controlledClass as ControlledClass | null,
            notificationNumber: createPrescriptionDto.notificationNumber || null,
            notificationType: createPrescriptionDto.notificationType as NotificationType | null,
            prescriptionImageUrl:
              createPrescriptionDto.prescriptionImageUrl || null,
            notes: createPrescriptionDto.notes || null,
            createdBy: userId,
            medications: {
              create: createPrescriptionDto.medications.map((med) => ({
                name: med.name,
                presentation: med.presentation as MedicationPresentation,
                concentration: med.concentration,
                dose: med.dose,
                route: med.route as AdministrationRoute,
                frequency: med.frequency as MedicationFrequency,
                scheduledTimes: med.scheduledTimes,
                startDate: new Date(med.startDate),
                endDate: med.endDate ? new Date(med.endDate) : null,
                isControlled: med.isControlled || false,
                isHighRisk: med.isHighRisk || false,
                requiresDoubleCheck: med.requiresDoubleCheck || false,
                instructions: med.instructions || null,
              })),
            },
            sosMedications: createPrescriptionDto.sosMedications
              ? {
                  create: createPrescriptionDto.sosMedications.map((sos) => ({
                    name: sos.name,
                    presentation: sos.presentation as MedicationPresentation,
                    concentration: sos.concentration,
                    dose: sos.dose,
                    route: sos.route as AdministrationRoute,
                    indication: sos.indication as SOSIndicationType,
                    indicationDetails: sos.indicationDetails || null,
                    minInterval: sos.minInterval,
                    maxDailyDoses: sos.maxDailyDoses,
                    startDate: new Date(sos.startDate),
                    endDate: sos.endDate ? new Date(sos.endDate) : null,
                    instructions: sos.instructions || null,
                  })),
                }
              : undefined,
          },
          include: {
            resident: {
              select: {
                id: true,
                fullName: true,
                fotoUrl: true,
              },
            },
            medications: true,
            sosMedications: true,
          },
        });

        // 4.2 Se houver imagem da prescrição, criar documento do residente
        if (createPrescriptionDto.prescriptionImageUrl) {
          const prescriptionDate = new Date(createPrescriptionDto.prescriptionDate);
          const formattedDate = prescriptionDate.toLocaleDateString('pt-BR');

          await tx.residentDocument.create({
            data: {
              tenantId,
              residentId: createPrescriptionDto.residentId,
              type: 'PRESCRICAO_MEDICA',
              fileUrl: createPrescriptionDto.prescriptionImageUrl,
              fileName: `Prescrição - Dr. ${createPrescriptionDto.doctorName} - ${formattedDate}`,
              details: `Laudo Dr. ${createPrescriptionDto.doctorName} - ${formattedDate}`,
              uploadedBy: userId,
            },
          });
        }

        return newPrescription;
      });

      this.logger.info('Prescrição criada', {
        prescriptionId: prescription.id,
        tenantId,
        userId,
      });

      return this.formatDateOnlyFields(prescription);
    } catch (error) {
      this.logger.error('Erro ao criar prescrição', {
        error: error.message,
        tenantId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Lista prescrições com filtros e paginação
   */
  async findAll(query: QueryPrescriptionDto, tenantId: string) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '10', 10);
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      deletedAt: null,
    };

    // Filtros
    if (query.residentId) {
      where.residentId = query.residentId;
    }

    if (query.prescriptionType) {
      where.prescriptionType = query.prescriptionType;
    }

    if (query.isActive) {
      where.isActive = query.isActive === 'true';
    }

    if (query.expiringInDays) {
      const days = parseInt(query.expiringInDays, 10);
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + days);

      where.validUntil = {
        lte: futureDate,
        gte: today,
      };
    }

    if (query.reviewInDays) {
      const days = parseInt(query.reviewInDays, 10);
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + days);

      where.reviewDate = {
        lte: futureDate,
        gte: today,
      };
    }

    if (query.hasControlled === 'true') {
      where.medications = {
        some: {
          isControlled: true,
        },
      };
    }

    // Ordenação
    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [prescriptions, total] = await Promise.all([
      this.prisma.prescription.findMany({
        where,
        include: {
          resident: {
            select: {
              id: true,
              fullName: true,
              fotoUrl: true,
              roomId: true,
              bedId: true,
            },
          },
          medications: {
            where: { deletedAt: null },
            select: {
              id: true,
              name: true,
              presentation: true,
              concentration: true,
              dose: true,
              route: true,
              frequency: true,
              scheduledTimes: true,
              startDate: true,
              endDate: true,
              isControlled: true,
              isHighRisk: true,
              requiresDoubleCheck: true,
              instructions: true,
              administrations: {
                select: {
                  id: true,
                  date: true,
                  scheduledTime: true,
                  actualTime: true,
                  wasAdministered: true,
                  reason: true,
                  administeredBy: true,
                  createdAt: true,
                },
                orderBy: {
                  createdAt: 'desc',
                },
              },
            },
          },
          sosMedications: {
            where: { deletedAt: null },
            select: {
              id: true,
              name: true,
              indication: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.prescription.count({ where }),
    ]);

    return {
      data: prescriptions.map(p => this.formatDateOnlyFields(p)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Busca uma prescrição por ID
   */
  async findOne(id: string, tenantId: string) {
    const prescription = await this.prisma.prescription.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
            fotoUrl: true,
            roomId: true,
            bedId: true,
            birthDate: true,
            bed: {
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
                            code: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        medications: {
          where: { deletedAt: null },
          include: {
            administrations: {
              select: {
                id: true,
                date: true,
                scheduledTime: true,
                actualTime: true,
                wasAdministered: true,
                reason: true,
                administeredBy: true,
                createdAt: true,
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
        sosMedications: {
          where: { deletedAt: null },
        },
      },
    });

    if (!prescription) {
      throw new NotFoundException('Prescrição não encontrada');
    }

    return this.formatDateOnlyFields(prescription);
  }

  /**
   * Atualiza uma prescrição
   */
  async update(
    id: string,
    updatePrescriptionDto: UpdatePrescriptionDto,
    tenantId: string,
    userId: string,
  ) {
    // Verificar se prescrição existe
    const existing = await this.prisma.prescription.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException('Prescrição não encontrada');
    }

    // Validar tipo de prescrição se fornecido
    if (updatePrescriptionDto.prescriptionType) {
      this.validatePrescriptionByType(updatePrescriptionDto as any);
    }

    // Atualizar prescrição
    const updated = await this.prisma.prescription.update({
      where: { id },
      data: {
        doctorName: updatePrescriptionDto.doctorName,
        doctorCrm: updatePrescriptionDto.doctorCrm,
        doctorCrmState: updatePrescriptionDto.doctorCrmState,
        prescriptionDate: updatePrescriptionDto.prescriptionDate
          ? new Date(updatePrescriptionDto.prescriptionDate)
          : undefined,
        prescriptionType: updatePrescriptionDto.prescriptionType as PrescriptionType | undefined,
        validUntil: updatePrescriptionDto.validUntil
          ? new Date(updatePrescriptionDto.validUntil)
          : undefined,
        reviewDate: updatePrescriptionDto.reviewDate
          ? new Date(updatePrescriptionDto.reviewDate)
          : undefined,
        controlledClass: updatePrescriptionDto.controlledClass as ControlledClass | undefined,
        notificationNumber: updatePrescriptionDto.notificationNumber,
        notificationType: updatePrescriptionDto.notificationType as NotificationType | undefined,
        prescriptionImageUrl: updatePrescriptionDto.prescriptionImageUrl,
        notes: updatePrescriptionDto.notes,
        isActive: updatePrescriptionDto.isActive,
      },
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
          },
        },
        medications: true,
        sosMedications: true,
      },
    });

    this.logger.info('Prescrição atualizada', {
      prescriptionId: id,
      tenantId,
      userId,
    });

    return this.formatDateOnlyFields(updated);
  }

  /**
   * Remove (soft delete) uma prescrição
   */
  async remove(id: string, tenantId: string, userId: string) {
    const prescription = await this.prisma.prescription.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!prescription) {
      throw new NotFoundException('Prescrição não encontrada');
    }

    await this.prisma.prescription.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    this.logger.info('Prescrição removida', {
      prescriptionId: id,
      tenantId,
      userId,
    });

    return { message: 'Prescrição removida com sucesso' };
  }

  /**
   * Obtém estatísticas do dashboard
   */
  async getDashboardStats(tenantId: string) {
    const [
      totalActive,
      expiringIn5Days,
      activeAntibiotics,
      activeControlled,
    ] = await Promise.all([
      this.prisma.prescription.count({
        where: { tenantId, isActive: true, deletedAt: null },
      }),
      this.prisma.prescription.count({
        where: {
          tenantId,
          isActive: true,
          deletedAt: null,
          validUntil: {
            lte: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            gte: new Date(),
          },
        },
      }),
      this.prisma.prescription.count({
        where: {
          tenantId,
          isActive: true,
          deletedAt: null,
          prescriptionType: 'ANTIBIOTICO',
        },
      }),
      this.prisma.prescription.count({
        where: {
          tenantId,
          isActive: true,
          deletedAt: null,
          prescriptionType: 'CONTROLADO',
        },
      }),
    ]);

    return {
      totalActive,
      expiringIn5Days,
      activeAntibiotics,
      activeControlled,
    };
  }

  /**
   * Obtém alertas críticos com detalhes completos de cada prescrição
   */
  async getCriticalAlerts(tenantId: string) {
    const alerts = [];
    const now = new Date();

    // Prescrições vencidas
    const expiredPrescriptions = await this.prisma.prescription.findMany({
      where: {
        tenantId,
        isActive: true,
        validUntil: { lt: now },
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
      orderBy: {
        validUntil: 'asc',
      },
    });

    for (const prescription of expiredPrescriptions) {
      if (!prescription.validUntil) continue;
      const daysExpired = Math.floor(
        (now.getTime() - new Date(prescription.validUntil).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      alerts.push({
        prescriptionId: prescription.id,
        residentName: prescription.resident.fullName,
        doctorName: prescription.doctorName,
        message: `Prescrição vencida há ${daysExpired} dia${daysExpired !== 1 ? 's' : ''}`,
        type: 'EXPIRED',
        severity: 'CRITICAL',
        daysUntilExpiry: -daysExpired,
      });
    }

    // Controlados sem receita anexada
    const controlledWithoutReceipt = await this.prisma.prescription.findMany({
      where: {
        tenantId,
        isActive: true,
        prescriptionType: 'CONTROLADO',
        prescriptionImageUrl: null,
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
      orderBy: {
        prescriptionDate: 'desc',
      },
    });

    for (const prescription of controlledWithoutReceipt) {
      alerts.push({
        prescriptionId: prescription.id,
        residentName: prescription.resident.fullName,
        doctorName: prescription.doctorName,
        message: 'Medicamento controlado sem receita anexada',
        type: 'MISSING_RECEIPT',
        severity: 'CRITICAL',
      });
    }

    // Antibióticos sem validade registrada
    const antibioticsWithoutValidity = await this.prisma.prescription.findMany(
      {
        where: {
          tenantId,
          isActive: true,
          prescriptionType: 'ANTIBIOTICO',
          validUntil: null,
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
        orderBy: {
          prescriptionDate: 'desc',
        },
      },
    );

    for (const prescription of antibioticsWithoutValidity) {
      alerts.push({
        prescriptionId: prescription.id,
        residentName: prescription.resident.fullName,
        doctorName: prescription.doctorName,
        message: 'Antibiótico sem validade registrada',
        type: 'MISSING_VALIDITY',
        severity: 'WARNING',
      });
    }

    // Prescrições que precisam revisão em até 30 dias
    const reviewNeeded = await this.prisma.prescription.findMany({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
        reviewDate: {
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          gte: new Date(),
        },
      },
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        reviewDate: 'asc',
      },
    });

    for (const prescription of reviewNeeded) {
      if (!prescription.reviewDate) continue;
      const daysUntilReview = Math.ceil(
        (new Date(prescription.reviewDate).getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      alerts.push({
        prescriptionId: prescription.id,
        residentName: prescription.resident.fullName,
        doctorName: prescription.doctorName,
        message: `Revisão estimada para daqui a ${daysUntilReview} dia${daysUntilReview !== 1 ? 's' : ''}`,
        type: 'REVIEW_NEEDED',
        severity: daysUntilReview <= 7 ? 'WARNING' : 'INFO',
        daysUntilReview,
      });
    }

    // Ordenar por severidade (CRITICAL > WARNING > INFO)
    const severityOrder: Record<string, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };
    alerts.sort((a, b) => (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3));

    return alerts;
  }

  /**
   * Obtém prescrições próximas do vencimento
   */
  async getExpiringPrescriptions(days: number, tenantId: string) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const prescriptions = await this.prisma.prescription.findMany({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
        validUntil: {
          lte: futureDate,
          gte: new Date(),
        },
      },
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
          },
        },
        medications: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        validUntil: 'asc',
      },
    });

    return prescriptions.map((p) => ({
      id: p.id,
      residentId: p.residentId,
      doctorName: p.doctorName,
      doctorCrm: p.doctorCrm,
      doctorCrmState: p.doctorCrmState,
      prescriptionDate: p.prescriptionDate,
      prescriptionType: p.prescriptionType,
      validUntil: p.validUntil,
      resident: p.resident,
      medications: p.medications,
      daysUntilExpiry: p.validUntil
        ? Math.ceil(
            (p.validUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
          )
        : 0,
    }));
  }

  /**
   * Obtém residentes com medicamentos controlados
   */
  async getResidentsWithControlled(tenantId: string) {
    const prescriptions = await this.prisma.prescription.findMany({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
        prescriptionType: 'CONTROLADO',
      },
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
          },
        },
        medications: {
          where: {
            isControlled: true,
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
            dose: true,
            scheduledTimes: true,
          },
        },
      },
    });

    return prescriptions.map((p) => ({
      prescriptionId: p.id,
      residentId: p.resident.id,
      residentName: p.resident.fullName,
      doctorName: p.doctorName,
      doctorCrm: p.doctorCrm,
      controlledClass: p.controlledClass,
      controlledClasses: p.controlledClass ? [p.controlledClass] : [],
      notificationNumber: p.notificationNumber,
      notificationType: p.notificationType,
      medications: p.medications,
    }));
  }

  /**
   * Obtém prescrições que precisam de revisão
   */
  async getReviewNeededPrescriptions(days: number, tenantId: string) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const prescriptions = await this.prisma.prescription.findMany({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
        reviewDate: {
          lte: futureDate,
          gte: new Date(),
        },
      },
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
          },
        },
        medications: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        reviewDate: 'asc',
      },
    });

    return prescriptions.map((p) => ({
      id: p.id,
      residentId: p.residentId,
      doctorName: p.doctorName,
      doctorCrm: p.doctorCrm,
      doctorCrmState: p.doctorCrmState,
      prescriptionDate: p.prescriptionDate,
      prescriptionType: p.prescriptionType,
      reviewDate: p.reviewDate,
      resident: p.resident,
      medications: p.medications,
      daysUntilReview: p.reviewDate
        ? Math.ceil(
            (p.reviewDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
          )
        : 0,
    }));
  }

  /**
   * Administra um medicamento contínuo
   */
  async administerMedication(
    dto: AdministerMedicationDto,
    tenantId: string,
    userId: string,
  ) {
    // Buscar medicamento e validar
    const medication = await this.prisma.medication.findFirst({
      where: {
        id: dto.medicationId,
        deletedAt: null,
        prescription: {
          tenantId,
          isActive: true,
          deletedAt: null,
        },
      },
      include: {
        prescription: {
          select: {
            residentId: true,
          },
        },
      },
    });

    if (!medication) {
      throw new NotFoundException('Medicamento não encontrado');
    }

    // Criar registro de administração
    const administration = await this.prisma.medicationAdministration.create({
      data: {
        tenantId,
        prescriptionId: medication.prescriptionId,
        medicationId: dto.medicationId,
        residentId: medication.prescription.residentId,
        date: new Date(dto.date),
        scheduledTime: dto.scheduledTime,
        actualTime: dto.actualTime || null,
        wasAdministered: dto.wasAdministered,
        reason: dto.reason || null,
        administeredBy: dto.administeredBy,
        userId,
        checkedBy: dto.checkedBy || null,
        checkedByUserId: dto.checkedByUserId || null,
        notes: dto.notes || null,
      },
    });

    this.logger.info('Medicamento administrado', {
      administrationId: administration.id,
      medicationId: dto.medicationId,
      tenantId,
      userId,
    });

    return administration;
  }

  /**
   * Administra uma medicação SOS
   */
  async administerSOSMedication(
    dto: AdministerSOSDto,
    tenantId: string,
    userId: string,
  ) {
    // Buscar medicação SOS e validar
    const sosMedication = await this.prisma.sOSMedication.findFirst({
      where: {
        id: dto.sosMedicationId,
        deletedAt: null,
        prescription: {
          tenantId,
          isActive: true,
          deletedAt: null,
        },
      },
      include: {
        prescription: {
          select: {
            residentId: true,
          },
        },
      },
    });

    if (!sosMedication) {
      throw new NotFoundException('Medicação SOS não encontrada');
    }

    // Verificar limite diário
    const today = new Date(dto.date);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayCount = await this.prisma.sOSAdministration.count({
      where: {
        sosMedicationId: dto.sosMedicationId,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    if (todayCount >= sosMedication.maxDailyDoses) {
      throw new BadRequestException(
        `Limite diário de ${sosMedication.maxDailyDoses} doses já atingido`,
      );
    }

    // Criar registro de administração SOS
    const administration = await this.prisma.sOSAdministration.create({
      data: {
        tenantId,
        prescriptionId: sosMedication.prescriptionId,
        sosMedicationId: dto.sosMedicationId,
        residentId: sosMedication.prescription.residentId,
        date: new Date(dto.date),
        time: dto.time,
        indication: dto.indication,
        administeredBy: dto.administeredBy,
        userId,
        notes: dto.notes || null,
      },
    });

    this.logger.info('Medicação SOS administrada', {
      administrationId: administration.id,
      sosMedicationId: dto.sosMedicationId,
      tenantId,
      userId,
    });

    return administration;
  }

  /**
   * Valida campos obrigatórios por tipo de prescrição
   */
  private validatePrescriptionByType(dto: CreatePrescriptionDto) {
    // CONTROLADO: validade + receita + notificação obrigatórios
    if (dto.prescriptionType === 'CONTROLADO') {
      if (!dto.validUntil) {
        throw new BadRequestException(
          'Validade é obrigatória para medicamentos controlados',
        );
      }
      if (!dto.prescriptionImageUrl) {
        throw new BadRequestException(
          'Receita médica é obrigatória para medicamentos controlados',
        );
      }
      if (!dto.notificationNumber) {
        throw new BadRequestException(
          'Número da notificação é obrigatório para medicamentos controlados',
        );
      }
      if (!dto.notificationType) {
        throw new BadRequestException(
          'Tipo de notificação é obrigatório para medicamentos controlados',
        );
      }
      if (!dto.controlledClass) {
        throw new BadRequestException(
          'Classe do medicamento é obrigatória para medicamentos controlados',
        );
      }
    }

    // ANTIBIOTICO: validade obrigatória
    if (dto.prescriptionType === 'ANTIBIOTICO') {
      if (!dto.validUntil) {
        throw new BadRequestException(
          'Validade é obrigatória para antibióticos',
        );
      }
    }

    // Pelo menos 1 medicamento (contínuo OU SOS) obrigatório
    const hasMedications = dto.medications && dto.medications.length > 0;
    const hasSOSMedications = dto.sosMedications && dto.sosMedications.length > 0;

    if (!hasMedications && !hasSOSMedications) {
      throw new BadRequestException(
        'Pelo menos um medicamento (contínuo ou SOS) é obrigatório',
      );
    }
  }

  // ========== CALENDÁRIO DE ADMINISTRAÇÕES ==========

  /**
   * Buscar datas que possuem administrações de um residente (para calendário)
   * Retorna array de strings no formato YYYY-MM-DD
   */
  async getMedicationAdministrationDates(
    residentId: string,
    year: number,
    month: number,
    tenantId: string,
  ): Promise<string[]> {
    // Validar residente existe e pertence ao tenant
    await this.validateResidentExists(residentId, tenantId);

    // Calcular primeiro e último dia do mês
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0); // Último dia do mês

    // Buscar administrações do residente no período
    const administrations = await this.prisma.medicationAdministration.findMany({
      where: {
        tenantId,
        residentId,
        date: {
          gte: firstDay,
          lte: lastDay,
        },
      },
      select: {
        date: true,
      },
      distinct: ['date'],
      orderBy: {
        date: 'asc',
      },
    });

    // Converter para array de strings YYYY-MM-DD
    return administrations.map((admin) => {
      // admin.date é um Date object do Prisma
      // Converter para YYYY-MM-DD (date-only)
      const date = new Date(admin.date);
      const yearStr = date.getFullYear();
      const monthStr = String(date.getMonth() + 1).padStart(2, '0');
      const dayStr = String(date.getDate()).padStart(2, '0');
      return `${yearStr}-${monthStr}-${dayStr}`;
    });
  }

  /**
   * Buscar administrações de um residente em uma data específica
   * Retorna lista completa com informações do medicamento
   */
  async getMedicationAdministrationsByDate(
    residentId: string,
    dateStr: string, // Formato: YYYY-MM-DD
    tenantId: string,
  ) {
    // Validar residente existe e pertence ao tenant
    await this.validateResidentExists(residentId, tenantId);

    // Validar formato da data
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) {
      throw new BadRequestException('Data inválida. Use o formato YYYY-MM-DD');
    }

    // Converter string para Date (date-only)
    const [yearStr, monthStr, dayStr] = dateStr.split('-');
    const targetDate = new Date(
      parseInt(yearStr),
      parseInt(monthStr) - 1,
      parseInt(dayStr),
    );

    // Buscar administrações da data
    const administrations = await this.prisma.medicationAdministration.findMany({
      where: {
        tenantId,
        residentId,
        date: targetDate,
      },
      include: {
        medication: {
          select: {
            name: true,
            presentation: true,
            concentration: true,
            dose: true,
            route: true,
            isControlled: true,
            isHighRisk: true,
            requiresDoubleCheck: true,
          },
        },
      },
      orderBy: [
        { scheduledTime: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return administrations;
  }

  // ========== VALIDAÇÕES PRIVADAS ==========

  /**
   * Valida formato de horários (HH:mm)
   */
  private validateScheduledTimes(times: string[]) {
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

    for (const time of times) {
      if (!timeRegex.test(time)) {
        throw new BadRequestException(
          `Horário inválido: ${time}. Use o formato HH:mm`,
        );
      }
    }
  }

  /**
   * Valida se o residente existe e pertence ao tenant
   */
  private async validateResidentExists(
    residentId: string,
    tenantId: string,
  ): Promise<void> {
    const resident = await this.prisma.resident.findUnique({
      where: {
        id: residentId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!resident) {
      throw new NotFoundException('Residente não encontrado');
    }
  }
}
