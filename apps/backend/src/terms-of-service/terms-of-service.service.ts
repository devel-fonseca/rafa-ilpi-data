import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ContractStatus } from '@prisma/client';
import { CreateTermsOfServiceDto } from './dto/create-terms-of-service.dto';
import { UpdateTermsOfServiceDto } from './dto/update-terms-of-service.dto';
import { PublishTermsOfServiceDto } from './dto/publish-terms-of-service.dto';
import { PrepareTermsAcceptanceDto } from './dto/accept-terms-of-service.dto';
import { generateTermsHash } from './utils/hash-generator';
import { renderTemplate } from './utils/template-engine';

@Injectable()
export class TermsOfServiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Criar termo de uso DRAFT
   */
  async create(dto: CreateTermsOfServiceDto, createdBy: string) {
    // Verificar se já existe termo de uso com mesma versão e planId
    const planIdValue = dto.planId || null;
    const existing = await this.prisma.termsOfService.findFirst({
      where: {
        version: dto.version,
        planId: planIdValue,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Já existe um termo de uso com versão ${dto.version} para este plano`,
      );
    }

    // Gerar hash do conteúdo
    const contentHash = generateTermsHash(dto.content);

    const terms = await this.prisma.termsOfService.create({
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
        // ⚠️ REMOVED creator include - User está em schema de tenant, não pode fazer JOIN com TermsOfService (public schema)
        // Para obter dados do creator, fazer query separada usando getTenantClient() se necessário
      },
    });

    return terms;
  }

  /**
   * Gerar próxima versão automaticamente
   */
  async getNextVersion(planId?: string, isMajor = false): Promise<string> {
    // Buscar termos de uso com o planId específico ou genéricos (planId null)
    const planIdValue = planId || null;
    const terms = await this.prisma.termsOfService.findMany({
      where: { planId: planIdValue },
      orderBy: { createdAt: 'desc' },
      select: { version: true },
    });

    if (terms.length === 0) {
      return 'v1.0';
    }

    // Extrair versões e encontrar a maior
    const versions = terms
      .map((t) => {
        const match = t.version.match(/v?(\d+)\.(\d+)/);
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
   * Atualizar termo de uso (apenas DRAFT)
   */
  async update(id: string, dto: UpdateTermsOfServiceDto) {
    const terms = await this.prisma.termsOfService.findUnique({
      where: { id },
    });

    if (!terms) {
      throw new NotFoundException('Termo de uso não encontrado');
    }

    if (terms.status !== ContractStatus.DRAFT) {
      throw new ForbiddenException(
        'Apenas termos de uso em DRAFT podem ser editados',
      );
    }

    // Se conteúdo foi alterado, regerar hash
    const contentHash = dto.content
      ? generateTermsHash(dto.content)
      : terms.contentHash;

    const updated = await this.prisma.termsOfService.update({
      where: { id },
      data: {
        ...dto,
        contentHash,
      },
      include: {
        plan: true,
        // ⚠️ REMOVED creator include - User está em schema de tenant, não pode fazer JOIN com TermsOfService (public schema)
      },
    });

    return updated;
  }

  /**
   * Publicar termo de uso (DRAFT → ACTIVE)
   * Revoga versão anterior do mesmo plano automaticamente
   */
  async publish(id: string, dto: PublishTermsOfServiceDto, publishedBy: string) {
    const terms = await this.prisma.termsOfService.findUnique({
      where: { id },
    });

    if (!terms) {
      throw new NotFoundException('Termo de uso não encontrado');
    }

    if (terms.status !== ContractStatus.DRAFT) {
      throw new ForbiddenException('Apenas termos de uso DRAFT podem ser publicados');
    }

    const effectiveFrom = dto.effectiveFrom
      ? new Date(dto.effectiveFrom)
      : new Date();

    // Revogar versão anterior do mesmo plano (se existir)
    await this.prisma.termsOfService.updateMany({
      where: {
        planId: terms.planId,
        status: ContractStatus.ACTIVE,
        NOT: {
          id: terms.id,
        },
      },
      data: {
        status: ContractStatus.REVOKED,
        revokedAt: new Date(),
        revokedBy: publishedBy,
      },
    });

    // Publicar novo termo de uso
    const published = await this.prisma.termsOfService.update({
      where: { id },
      data: {
        status: ContractStatus.ACTIVE,
        effectiveFrom,
      },
      include: {
        plan: true,
        // ⚠️ REMOVED creator include - User está em schema de tenant, não pode fazer JOIN com TermsOfService (public schema)
      },
    });

    return published;
  }

  /**
   * Deletar termo de uso (apenas DRAFT sem aceites)
   */
  async delete(id: string) {
    const terms = await this.prisma.termsOfService.findUnique({
      where: { id },
      include: {
        acceptances: true,
      },
    });

    if (!terms) {
      throw new NotFoundException('Termo de uso não encontrado');
    }

    if (terms.status !== ContractStatus.DRAFT) {
      throw new ForbiddenException('Apenas termos de uso DRAFT podem ser deletados');
    }

    if (terms.acceptances.length > 0) {
      throw new ForbiddenException(
        'Não é possível deletar termo de uso que já possui aceites',
      );
    }

    await this.prisma.termsOfService.delete({
      where: { id },
    });

    return { message: 'Termo de uso deletado com sucesso' };
  }

  /**
   * Listar termos de uso com filtros
   */
  async findAll(filters?: {
    status?: ContractStatus;
    planId?: string;
  }) {
    const terms = await this.prisma.termsOfService.findMany({
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
        // ⚠️ REMOVED creator include - User está em schema de tenant, não pode fazer JOIN com TermsOfService (public schema)
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

    return terms;
  }

  /**
   * Buscar termo de uso por ID
   */
  async findOne(id: string) {
    const terms = await this.prisma.termsOfService.findUnique({
      where: { id },
      include: {
        plan: true,
        // ⚠️ REMOVED creator/revoker includes - User está em schema de tenant, não pode fazer JOIN com TermsOfService (public schema)
        _count: {
          select: {
            acceptances: true,
          },
        },
      },
    });

    if (!terms) {
      throw new NotFoundException('Termo de uso não encontrado');
    }

    return terms;
  }

  /**
   * Buscar termo de uso ACTIVE para um plano específico
   * (ou genérico se não houver específico)
   */
  async getActiveTermsForPlan(planId?: string) {
    // Prioridade: termo de uso específico do plano, senão genérico
    const terms = await this.prisma.termsOfService.findFirst({
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

    if (!terms) {
      throw new NotFoundException(
        'Nenhum termo de uso ativo disponível no momento',
      );
    }

    return terms;
  }

  /**
   * Renderizar termo de uso substituindo variáveis
   */
  async renderTerms(termsId: string, variables?: Record<string, unknown>) {
    const terms = await this.findOne(termsId);

    const rendered = renderTemplate(terms.content, variables || {});

    return {
      ...terms,
      content: rendered,
    };
  }

  /**
   * Preparar token de aceite do termo de uso
   * (usado no step 4 do registro, antes de criar tenant)
   */
  async prepareAcceptance(dto: PrepareTermsAcceptanceDto) {
    const terms = await this.findOne(dto.termsId);

    if (terms.status !== ContractStatus.ACTIVE) {
      throw new BadRequestException('Apenas termos de uso ACTIVE podem ser aceitos');
    }

    // Renderizar conteúdo com variáveis substituídas
    const renderedContent = renderTemplate(terms.content, dto.variables || {});

    // Gerar hash do conteúdo RENDERIZADO (com valores reais)
    const renderedHash = generateTermsHash(renderedContent);

    // Criar token JWT com snapshot imutável do termo de uso RENDERIZADO
    const token = this.jwtService.sign(
      {
        termsId: terms.id,
        planId: dto.planId,
        termsVersion: terms.version,
        termsHash: renderedHash, // Hash do conteúdo renderizado
        termsContent: renderedContent, // Conteúdo com variáveis substituídas
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
   * Buscar aceites de um termo de uso
   */
  async getAcceptances(termsId: string) {
    const acceptances = await this.prisma.termsOfServiceAcceptance.findMany({
      where: { termsId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        // ⚠️ REMOVED user include - User está em schema de tenant, não pode fazer JOIN com TermsOfServiceAcceptance (public schema)
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
    const acceptance = await this.prisma.termsOfServiceAcceptance.findUnique({
      where: { tenantId },
      include: {
        terms: {
          select: {
            id: true,
            version: true,
            title: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
            schemaName: true,
          },
        },
        // ⚠️ REMOVED user include - User está em schema de tenant, não pode fazer JOIN com TermsOfServiceAcceptance (public schema)
      },
    });

    if (!acceptance) {
      throw new NotFoundException('Aceite não encontrado para este tenant');
    }

    // Buscar dados do usuário no schema do tenant
    let user: { name: string; email: string } | null = null;
    if (acceptance.userId && acceptance.tenant?.schemaName) {
      try {
        console.log('[getTenantAcceptance] Buscando usuário:', {
          userId: acceptance.userId,
          schemaName: acceptance.tenant.schemaName,
        });

        const userResult = await this.prisma.$queryRawUnsafe<[{ name: string; email: string }]>(
          `SELECT name, email FROM "${acceptance.tenant.schemaName}"."users" WHERE id = $1::uuid LIMIT 1`,
          acceptance.userId
        );

        console.log('[getTenantAcceptance] Resultado da query:', userResult);

        if (userResult[0]) {
          user = {
            name: userResult[0].name,
            email: userResult[0].email,
          };
        }
      } catch (error) {
        console.error('[getTenantAcceptance] Erro ao buscar usuário:', error);
      }
    } else {
      console.log('[getTenantAcceptance] Dados ausentes:', {
        userId: acceptance.userId,
        schemaName: acceptance.tenant?.schemaName,
      });
    }

    console.log('[getTenantAcceptance] Retornando user:', user);

    return {
      ...acceptance,
      user,
    };
  }
}
