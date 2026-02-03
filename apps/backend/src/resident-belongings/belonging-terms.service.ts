import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { FilesService } from '../files/files.service';
import { CreateTermDto, UploadSignedTermDto } from './dto';
import {
  BelongingTermType,
  BelongingTermStatus,
  Prisma,
} from '@prisma/client';

/**
 * Serviço de gestão de termos de pertences
 *
 * Responsável por:
 * - Geração de termos de recebimento, atualização e devolução
 * - Numeração sequencial por residente (TERM-[CPF]-001)
 * - Snapshot imutável dos itens no momento do termo
 * - Upload de termo assinado
 * - Geração de PDF para impressão
 */
@Injectable()
export class BelongingTermsService {
  private readonly logger = new Logger(BelongingTermsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly filesService: FilesService,
  ) {}

  /**
   * Gerar novo termo
   */
  async generate(
    residentId: string,
    userId: string,
    dto: CreateTermDto,
  ) {
    this.logger.log(`Gerando termo ${dto.type} para residente ${residentId}`);

    // Validar residente e obter CPF
    const resident = await this.tenantContext.client.resident.findFirst({
      where: { id: residentId, deletedAt: null },
      select: { id: true, fullName: true, cpf: true },
    });

    if (!resident) {
      throw new NotFoundException('Residente não encontrado');
    }

    // Validar que há itens no termo
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('O termo deve conter pelo menos um item');
    }

    // Buscar próximo número sequencial para o residente
    const lastTerm = await this.tenantContext.client.belongingTerm.findFirst({
      where: { residentId },
      orderBy: { sequenceNumber: 'desc' },
      select: { sequenceNumber: true },
    });

    const sequenceNumber = (lastTerm?.sequenceNumber || 0) + 1;

    // Formatar CPF para número do termo (apenas dígitos)
    const cpfDigits = resident.cpf.replace(/\D/g, '');
    const termNumber = `TERM-${cpfDigits}-${String(sequenceNumber).padStart(3, '0')}`;

    // Validar e buscar os pertences
    const belongingIds = dto.items.map((item) => item.belongingId);
    const belongings = await this.tenantContext.client.residentBelonging.findMany({
      where: {
        id: { in: belongingIds },
        residentId,
        deletedAt: null,
      },
    });

    if (belongings.length !== belongingIds.length) {
      throw new BadRequestException(
        'Um ou mais pertences não foram encontrados ou não pertencem ao residente',
      );
    }

    const termId = crypto.randomUUID();

    const term = await this.tenantContext.client.$transaction(async (tx) => {
      // Criar termo
      const created = await tx.belongingTerm.create({
        data: {
          id: termId,
          tenantId: this.tenantContext.tenantId,
          residentId,
          type: dto.type,
          termNumber,
          sequenceNumber,
          termDate: new Date(dto.termDate),
          issuedBy: dto.issuedBy,
          receivedBy: dto.receivedBy,
          receiverDocument: dto.receiverDocument,
          notes: dto.notes,
          status: BelongingTermStatus.PENDENTE,
          createdBy: userId,
        },
      });

      // Criar itens do termo com snapshot
      for (const itemDto of dto.items) {
        const belonging = belongings.find((b) => b.id === itemDto.belongingId);
        if (!belonging) continue;

        // Criar snapshot dos dados do pertence
        const snapshotData = {
          category: belonging.category,
          description: belonging.description,
          brandModel: belonging.brandModel,
          quantity: belonging.quantity,
          conservationState: belonging.conservationState,
          identification: belonging.identification,
          declaredValue: belonging.declaredValue ? Number(belonging.declaredValue) : null,
          storageLocation: belonging.storageLocation,
          status: belonging.status,
        };

        await tx.belongingTermItem.create({
          data: {
            termId: created.id,
            belongingId: itemDto.belongingId,
            movementType: itemDto.movementType,
            snapshotData: snapshotData as Prisma.InputJsonValue,
            previousState: itemDto.previousState,
            newState: itemDto.newState,
            stateChangeReason: itemDto.stateChangeReason,
          },
        });

        // Atualizar referência de termo no pertence (entrada ou saída)
        if (dto.type === BelongingTermType.RECEBIMENTO) {
          await tx.residentBelonging.update({
            where: { id: belonging.id },
            data: { entryTermId: created.id },
          });
        } else if (dto.type === BelongingTermType.DEVOLUCAO_FINAL) {
          await tx.residentBelonging.update({
            where: { id: belonging.id },
            data: { exitTermId: created.id },
          });
        }
      }

      return created;
    });

    this.logger.log(`Termo ${termNumber} gerado com sucesso`);
    return this.findOne(term.id);
  }

  /**
   * Listar termos de um residente
   */
  async findAll(
    residentId: string,
    filters?: {
      type?: BelongingTermType;
      status?: BelongingTermStatus;
    },
  ) {
    const resident = await this.tenantContext.client.resident.findFirst({
      where: { id: residentId, deletedAt: null },
      select: { id: true },
    });

    if (!resident) {
      throw new NotFoundException('Residente não encontrado');
    }

    const terms = await this.tenantContext.client.belongingTerm.findMany({
      where: {
        residentId,
        ...(filters?.type && { type: filters.type }),
        ...(filters?.status && { status: filters.status }),
      },
      include: {
        creator: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Gerar URLs para termos assinados
    const termsWithUrls = await Promise.all(
      terms.map(async (term) => {
        if (term.signedFileUrl) {
          const signedFileUrl = await this.filesService.getFileUrl(term.signedFileUrl);
          return { ...term, signedFileUrl };
        }
        return term;
      }),
    );

    return termsWithUrls;
  }

  /**
   * Buscar termo por ID com itens
   */
  async findOne(termId: string) {
    const term = await this.tenantContext.client.belongingTerm.findFirst({
      where: { id: termId },
      include: {
        resident: { select: { id: true, fullName: true, cpf: true } },
        creator: { select: { id: true, name: true } },
        items: {
          include: {
            belonging: {
              select: {
                id: true,
                description: true,
                category: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!term) {
      throw new NotFoundException('Termo não encontrado');
    }

    // Gerar URL para termo assinado
    if (term.signedFileUrl) {
      const signedFileUrl = await this.filesService.getFileUrl(term.signedFileUrl);
      return { ...term, signedFileUrl };
    }

    return term;
  }

  /**
   * Upload de termo assinado
   */
  async uploadSigned(
    termId: string,
    userId: string,
    file: Express.Multer.File,
  ) {
    const term = await this.tenantContext.client.belongingTerm.findFirst({
      where: { id: termId },
    });

    if (!term) {
      throw new NotFoundException('Termo não encontrado');
    }

    // Upload do arquivo
    const upload = await this.filesService.uploadFile(
      this.tenantContext.tenantId,
      file,
      'belonging-terms',
      term.residentId,
    );

    // Calcular hash do arquivo
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');

    const updated = await this.tenantContext.client.belongingTerm.update({
      where: { id: termId },
      data: {
        signedFileUrl: upload.fileUrl,
        signedFileKey: upload.fileUrl,
        signedFileName: file.originalname,
        signedFileSize: file.size,
        signedFileHash: hash,
        status: BelongingTermStatus.ASSINADO,
      },
    });

    this.logger.log(`Termo ${term.termNumber} assinado com sucesso`);
    return this.findOne(updated.id);
  }

  /**
   * Cancelar termo
   */
  async cancel(termId: string, userId: string, reason: string) {
    const term = await this.tenantContext.client.belongingTerm.findFirst({
      where: { id: termId },
    });

    if (!term) {
      throw new NotFoundException('Termo não encontrado');
    }

    if (term.status === BelongingTermStatus.ASSINADO) {
      throw new BadRequestException('Não é possível cancelar um termo já assinado');
    }

    const updated = await this.tenantContext.client.belongingTerm.update({
      where: { id: termId },
      data: {
        status: BelongingTermStatus.CANCELADO,
        notes: term.notes
          ? `${term.notes}\n\n[CANCELADO] ${reason}`
          : `[CANCELADO] ${reason}`,
      },
    });

    this.logger.log(`Termo ${term.termNumber} cancelado`);
    return this.findOne(updated.id);
  }

  /**
   * Obter dados para impressão/PDF do termo
   */
  async getPrintData(termId: string) {
    const term = await this.tenantContext.client.belongingTerm.findFirst({
      where: { id: termId },
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
            cpf: true,
            admissionDate: true,
            bed: {
              select: {
                code: true,
                room: {
                  select: { name: true },
                },
              },
            },
          },
        },
        creator: { select: { id: true, name: true } },
        items: {
          include: {
            belonging: {
              select: {
                id: true,
                description: true,
                category: true,
                brandModel: true,
                quantity: true,
                conservationState: true,
                identification: true,
                declaredValue: true,
              },
            },
          },
        },
      },
    });

    if (!term) {
      throw new NotFoundException('Termo não encontrado');
    }

    // Buscar dados do tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: this.tenantContext.tenantId },
      select: { name: true, cnpj: true },
    });

    // Agrupar itens por tipo de movimentação
    const entradas = term.items.filter((i) => i.movementType === 'ENTRADA');
    const saidas = term.items.filter((i) => i.movementType === 'SAIDA');
    const alteracoes = term.items.filter((i) => i.movementType === 'ALTERACAO_ESTADO');

    return {
      term: {
        id: term.id,
        termNumber: term.termNumber,
        type: term.type,
        termDate: term.termDate,
        issuedBy: term.issuedBy,
        receivedBy: term.receivedBy,
        receiverDocument: term.receiverDocument,
        notes: term.notes,
        status: term.status,
      },
      tenant: {
        name: tenant?.name || '',
        cnpj: tenant?.cnpj || '',
      },
      resident: {
        fullName: term.resident.fullName,
        cpf: term.resident.cpf,
        admissionDate: term.resident.admissionDate,
        bedCode: term.resident.bed
          ? `${term.resident.bed.room?.name || ''}-${term.resident.bed.code}`
          : null,
      },
      items: {
        entradas: entradas.map((i) => ({
          ...(i.snapshotData as Record<string, unknown>),
          belongingId: i.belongingId,
        })),
        saidas: saidas.map((i) => ({
          ...(i.snapshotData as Record<string, unknown>),
          belongingId: i.belongingId,
        })),
        alteracoes: alteracoes.map((i) => ({
          ...(i.snapshotData as Record<string, unknown>),
          belongingId: i.belongingId,
          previousState: i.previousState,
          newState: i.newState,
          stateChangeReason: i.stateChangeReason,
        })),
      },
      totals: {
        totalItems: term.items.length,
        totalEntradas: entradas.length,
        totalSaidas: saidas.length,
        totalAlteracoes: alteracoes.length,
      },
    };
  }
}
