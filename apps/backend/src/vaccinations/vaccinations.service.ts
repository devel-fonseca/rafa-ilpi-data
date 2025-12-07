import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { WINSTON_MODULE_PROVIDER } from 'nest-winston'
import { Logger } from 'winston'
import { parseISO, startOfDay } from 'date-fns'
import { CreateVaccinationDto, UpdateVaccinationDto } from './dto'

@Injectable()
export class VaccinationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * Criar novo registro de vacinação
   * Com validações conforme RDC 502/2021
   */
  async create(
    dto: CreateVaccinationDto,
    tenantId: string,
    userId: string,
  ) {
    // Verificar se residente existe e pertence ao tenant
    const resident = await this.prisma.resident.findFirst({
      where: {
        id: dto.residentId,
        tenantId,
        deletedAt: null,
      },
    })

    if (!resident) {
      throw new NotFoundException('Residente não encontrado')
    }

    // FIX TIMESTAMPTZ: Validar data não está no futuro usando date-fns
    // Usar parseISO com meio-dia para garantir timestamp consistente
    const vaccinationDate = parseISO(`${dto.date}T12:00:00.000`)
    const today = startOfDay(new Date())

    if (vaccinationDate > today) {
      throw new BadRequestException('Data de vacinação não pode ser no futuro')
    }

    // Validar UF
    if (!/^[A-Z]{2}$/.test(dto.state)) {
      throw new BadRequestException('UF deve conter 2 caracteres maiúsculos')
    }

    // Validar CNES
    if (!/^\d{8,10}$/.test(dto.cnes)) {
      throw new BadRequestException('CNES deve conter 8 a 10 dígitos')
    }

    // Criar registro com transação para incluir documento se houver comprovante
    const vaccination = await this.prisma.$transaction(async (tx) => {
      // 1. Criar registro de vacinação
      const vaccinationRecord = await tx.vaccination.create({
        data: {
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
          tenant: {
            connect: { id: tenantId },
          },
          resident: {
            connect: { id: dto.residentId },
          },
          user: {
            connect: { id: userId },
          },
        },
        include: {
          resident: {
            select: {
              id: true,
              fullName: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      // 2. Se houver comprovante de vacinação, criar documento do residente
      if (dto.certificateUrl) {
        const formattedDate = vaccinationDate.toLocaleDateString('pt-BR')

        await tx.residentDocument.create({
          data: {
            tenantId,
            residentId: dto.residentId,
            type: 'COMPROVANTE_VACINACAO',
            fileUrl: dto.certificateUrl,
            fileName: `Vacinação - ${dto.vaccine} - ${formattedDate}`,
            details: `${dto.vaccine} - ${dto.dose} - ${formattedDate}`,
            uploadedBy: userId,
          },
        })
      }

      return vaccinationRecord
    })

    this.logger.info('Vacinação registrada com sucesso', {
      vaccinationId: vaccination.id,
      residentId: dto.residentId,
      vaccine: dto.vaccine,
      tenantId,
      userId,
    })

    return vaccination
  }

  /**
   * Listar vacinações por residente (ordenadas por data DESC)
   */
  async findByResident(residentId: string, tenantId: string) {
    // Verificar se residente existe
    const resident = await this.prisma.resident.findFirst({
      where: {
        id: residentId,
        tenantId,
        deletedAt: null,
      },
    })

    if (!resident) {
      throw new NotFoundException('Residente não encontrado')
    }

    return await this.prisma.vaccination.findMany({
      where: {
        residentId,
        tenantId,
        deletedAt: null,
      },
      orderBy: {
        date: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })
  }

  /**
   * Obter um registro de vacinação por ID
   */
  async findOne(id: string, tenantId: string) {
    const vaccination = await this.prisma.vaccination.findFirst({
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
            cpf: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!vaccination) {
      throw new NotFoundException('Vacinação não encontrada')
    }

    return vaccination
  }

  /**
   * Atualizar registro de vacinação
   */
  async update(
    id: string,
    dto: UpdateVaccinationDto,
    tenantId: string,
    userId: string,
  ) {
    // Verificar se vacinação existe
    const existing = await this.prisma.vaccination.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    })

    if (!existing) {
      throw new NotFoundException('Vacinação não encontrada')
    }

    // Se trocar residente, validar novo residente
    if (dto.residentId && dto.residentId !== existing.residentId) {
      const resident = await this.prisma.resident.findFirst({
        where: {
          id: dto.residentId,
          tenantId,
          deletedAt: null,
        },
      })

      if (!resident) {
        throw new NotFoundException('Novo residente não encontrado')
      }
    }

    // FIX TIMESTAMPTZ: Validar data se foi fornecida usando date-fns
    if (dto.date) {
      const vaccinationDate = parseISO(`${dto.date}T12:00:00.000`)
      const today = startOfDay(new Date())

      if (vaccinationDate > today) {
        throw new BadRequestException('Data de vacinação não pode ser no futuro')
      }
    }

    // Validar UF se foi fornecido
    if (dto.state && !/^[A-Z]{2}$/.test(dto.state)) {
      throw new BadRequestException('UF deve conter 2 caracteres maiúsculos')
    }

    // Validar CNES se foi fornecido
    if (dto.cnes && !/^\d{8,10}$/.test(dto.cnes)) {
      throw new BadRequestException('CNES deve conter 8 a 10 dígitos')
    }

    const updated = await this.prisma.vaccination.update({
      where: { id },
      data: {
        vaccine: dto.vaccine,
        dose: dto.dose,
        // FIX TIMESTAMPTZ: Usar parseISO com meio-dia para evitar shifts de timezone
        date: dto.date ? parseISO(`${dto.date}T12:00:00.000`) : undefined,
        batch: dto.batch,
        manufacturer: dto.manufacturer,
        cnes: dto.cnes,
        healthUnit: dto.healthUnit,
        municipality: dto.municipality,
        state: dto.state,
        certificateUrl: dto.certificateUrl,
        notes: dto.notes,
        ...(dto.residentId && {
          resident: {
            connect: { id: dto.residentId },
          },
        }),
      },
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    this.logger.info('Vacinação atualizada com sucesso', {
      vaccinationId: id,
      tenantId,
      userId,
    })

    return updated
  }

  /**
   * Soft delete de registro de vacinação
   */
  async remove(id: string, tenantId: string, userId: string) {
    const existing = await this.prisma.vaccination.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    })

    if (!existing) {
      throw new NotFoundException('Vacinação não encontrada')
    }

    await this.prisma.vaccination.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    })

    this.logger.info('Vacinação removida (soft delete)', {
      vaccinationId: id,
      tenantId,
      userId,
    })

    return { message: 'Vacinação removida com sucesso' }
  }
}
