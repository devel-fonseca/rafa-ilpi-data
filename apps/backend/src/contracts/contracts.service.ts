import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ContractStatus } from '@prisma/client';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { PublishContractDto } from './dto/publish-contract.dto';
import { PrepareAcceptanceDto } from './dto/accept-contract.dto';
import { generateContractHash } from './utils/hash-generator';
import { renderTemplate } from './utils/template-engine';

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Criar contrato DRAFT
   */
  async create(dto: CreateContractDto, createdBy: string) {
    // Verificar se já existe contrato com mesma versão e planId
    const planIdValue = dto.planId || null;
    const existing = await this.prisma.serviceContract.findFirst({
      where: {
        version: dto.version,
        planId: planIdValue,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Já existe um contrato com versão ${dto.version} para este plano`,
      );
    }

    // Gerar hash do conteúdo
    const contentHash = generateContractHash(dto.content);

    const contract = await this.prisma.serviceContract.create({
      data: {
        version: dto.version,
        title: dto.title,
        content: dto.content,
        contentHash,
        planId: dto.planId || null,
        createdBy,
        status: ContractStatus.DRAFT,
      },
      include: {
        plan: true,
        // ⚠️ REMOVED creator include - User está em schema de tenant, não pode fazer JOIN com ServiceContract (public schema)
        // Para obter dados do creator, fazer query separada usando getTenantClient() se necessário
      },
    });

    return contract;
  }

  /**
   * Gerar próxima versão automaticamente
   */
  async getNextVersion(planId?: string, isMajor = false): Promise<string> {
    // Buscar contratos com o planId específico ou genéricos (planId null)
    const planIdValue = planId || null;
    const contracts = await this.prisma.serviceContract.findMany({
      where: { planId: planIdValue },
      orderBy: { createdAt: 'desc' },
      select: { version: true },
    });

    if (contracts.length === 0) {
      return 'v1.0';
    }

    // Extrair versões e encontrar a maior
    const versions = contracts
      .map((c) => {
        const match = c.version.match(/v?(\d+)\.(\d+)/);
        return match
          ? { major: parseInt(match[1]), minor: parseInt(match[2]) }
          : null;
      })
      .filter((v) => v !== null);

    if (versions.length === 0) {
      return 'v1.0';
    }

    const latest = versions.reduce((max, v) =>
      v.major > max.major || (v.major === max.major && v.minor > max.minor)
        ? v
        : max,
    );

    if (isMajor) {
      return `v${latest.major + 1}.0`;
    } else {
      return `v${latest.major}.${latest.minor + 1}`;
    }
  }

  /**
   * Atualizar contrato (apenas DRAFT)
   */
  async update(id: string, dto: UpdateContractDto) {
    const contract = await this.prisma.serviceContract.findUnique({
      where: { id },
    });

    if (!contract) {
      throw new NotFoundException('Contrato não encontrado');
    }

    if (contract.status !== ContractStatus.DRAFT) {
      throw new ForbiddenException(
        'Apenas contratos em DRAFT podem ser editados',
      );
    }

    // Se conteúdo foi alterado, regerar hash
    const contentHash = dto.content
      ? generateContractHash(dto.content)
      : contract.contentHash;

    const updated = await this.prisma.serviceContract.update({
      where: { id },
      data: {
        ...dto,
        contentHash,
      },
      include: {
        plan: true,
        // ⚠️ REMOVED creator include - User está em schema de tenant, não pode fazer JOIN com ServiceContract (public schema)
      },
    });

    return updated;
  }

  /**
   * Publicar contrato (DRAFT → ACTIVE)
   * Revoga versão anterior do mesmo plano automaticamente
   */
  async publish(id: string, dto: PublishContractDto, publishedBy: string) {
    const contract = await this.prisma.serviceContract.findUnique({
      where: { id },
    });

    if (!contract) {
      throw new NotFoundException('Contrato não encontrado');
    }

    if (contract.status !== ContractStatus.DRAFT) {
      throw new ForbiddenException('Apenas contratos DRAFT podem ser publicados');
    }

    const effectiveFrom = dto.effectiveFrom
      ? new Date(dto.effectiveFrom)
      : new Date();

    // Revogar versão anterior do mesmo plano (se existir)
    await this.prisma.serviceContract.updateMany({
      where: {
        planId: contract.planId,
        status: ContractStatus.ACTIVE,
        NOT: {
          id: contract.id,
        },
      },
      data: {
        status: ContractStatus.REVOKED,
        revokedAt: new Date(),
        revokedBy: publishedBy,
      },
    });

    // Publicar novo contrato
    const published = await this.prisma.serviceContract.update({
      where: { id },
      data: {
        status: ContractStatus.ACTIVE,
        effectiveFrom,
      },
      include: {
        plan: true,
        // ⚠️ REMOVED creator include - User está em schema de tenant, não pode fazer JOIN com ServiceContract (public schema)
      },
    });

    return published;
  }

  /**
   * Deletar contrato (apenas DRAFT sem aceites)
   */
  async delete(id: string) {
    const contract = await this.prisma.serviceContract.findUnique({
      where: { id },
      include: {
        acceptances: true,
      },
    });

    if (!contract) {
      throw new NotFoundException('Contrato não encontrado');
    }

    if (contract.status !== ContractStatus.DRAFT) {
      throw new ForbiddenException('Apenas contratos DRAFT podem ser deletados');
    }

    if (contract.acceptances.length > 0) {
      throw new ForbiddenException(
        'Não é possível deletar contrato que já possui aceites',
      );
    }

    await this.prisma.serviceContract.delete({
      where: { id },
    });

    return { message: 'Contrato deletado com sucesso' };
  }

  /**
   * Listar contratos com filtros
   */
  async findAll(filters?: {
    status?: ContractStatus;
    planId?: string;
  }) {
    const contracts = await this.prisma.serviceContract.findMany({
      where: {
        ...(filters?.status && { status: filters.status }),
        ...(filters?.planId && { planId: filters.planId }),
      },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
        // ⚠️ REMOVED creator include - User está em schema de tenant, não pode fazer JOIN com ServiceContract (public schema)
        _count: {
          select: {
            acceptances: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return contracts;
  }

  /**
   * Buscar contrato por ID
   */
  async findOne(id: string) {
    const contract = await this.prisma.serviceContract.findUnique({
      where: { id },
      include: {
        plan: true,
        // ⚠️ REMOVED creator/revoker includes - User está em schema de tenant, não pode fazer JOIN com ServiceContract (public schema)
        _count: {
          select: {
            acceptances: true,
          },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException('Contrato não encontrado');
    }

    return contract;
  }

  /**
   * Buscar contrato ACTIVE para um plano específico
   * (ou genérico se não houver específico)
   */
  async getActiveContractForPlan(planId?: string) {
    // Prioridade: contrato específico do plano, senão genérico
    const contract = await this.prisma.serviceContract.findFirst({
      where: {
        status: ContractStatus.ACTIVE,
        OR: [
          { planId: planId || null },
          { planId: null }, // Genérico
        ],
      },
      orderBy: [
        { planId: 'desc' }, // Específico primeiro (nulls last)
        { effectiveFrom: 'desc' },
      ],
      include: {
        plan: true,
      },
    });

    if (!contract) {
      throw new NotFoundException(
        'Nenhum contrato ativo disponível no momento',
      );
    }

    return contract;
  }

  /**
   * Renderizar contrato substituindo variáveis
   */
  async renderContract(contractId: string, variables?: Record<string, unknown>) {
    const contract = await this.findOne(contractId);

    const rendered = renderTemplate(contract.content, variables || {});

    return {
      ...contract,
      content: rendered,
    };
  }

  /**
   * Preparar token de aceite do contrato
   * (usado no step 4 do registro, antes de criar tenant)
   */
  async prepareAcceptance(dto: PrepareAcceptanceDto) {
    const contract = await this.findOne(dto.contractId);

    if (contract.status !== ContractStatus.ACTIVE) {
      throw new BadRequestException('Apenas contratos ACTIVE podem ser aceitos');
    }

    // Renderizar conteúdo com variáveis substituídas
    const renderedContent = renderTemplate(contract.content, dto.variables || {});

    // Gerar hash do conteúdo RENDERIZADO (com valores reais)
    const renderedHash = generateContractHash(renderedContent);

    // Criar token JWT com snapshot imutável do contrato RENDERIZADO
    const token = this.jwtService.sign(
      {
        contractId: contract.id,
        contractVersion: contract.version,
        contractHash: renderedHash, // Hash do conteúdo renderizado
        contractContent: renderedContent, // Conteúdo com variáveis substituídas
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
      },
      {
        expiresIn: '5m', // Token expira em 5 minutos
      },
    );

    return {
      acceptanceToken: token,
      expiresIn: 300, // segundos
    };
  }

  /**
   * Buscar aceites de um contrato
   */
  async getAcceptances(contractId: string) {
    const acceptances = await this.prisma.contractAcceptance.findMany({
      where: { contractId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        // ⚠️ REMOVED user include - User está em schema de tenant, não pode fazer JOIN com ContractAcceptance (public schema)
      },
      orderBy: {
        acceptedAt: 'desc',
      },
    });

    return acceptances;
  }

  /**
   * Buscar aceite de um tenant específico
   */
  async getTenantAcceptance(tenantId: string) {
    const acceptance = await this.prisma.contractAcceptance.findUnique({
      where: { tenantId },
      include: {
        contract: {
          select: {
            id: true,
            version: true,
            title: true,
          },
        },
        // ⚠️ REMOVED user include - User está em schema de tenant, não pode fazer JOIN com ContractAcceptance (public schema)
      },
    });

    if (!acceptance) {
      throw new NotFoundException('Aceite não encontrado para este tenant');
    }

    return acceptance;
  }
}
