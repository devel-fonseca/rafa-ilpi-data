import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { PrivacyPolicyService } from '../privacy-policy/privacy-policy.service';
import { AsaasService } from '../payments/services/asaas.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { AddUserToTenantDto, UserRole } from './dto/add-user.dto';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { TenantStatus, Prisma } from '@prisma/client';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly privacyPolicyService: PrivacyPolicyService,
    private readonly asaasService: AsaasService,
    private readonly emailService?: EmailService,
  ) {}

  /**
   * Cria um novo tenant (ILPI) e o primeiro usuário admin
   * Este método é usado no auto-registro
   */
  async create(createTenantDto: CreateTenantDto) {
    const {
      name,
      cnpj,
      email,
      phone,
      addressStreet,
      addressNumber,
      addressComplement,
      addressDistrict,
      addressCity,
      addressState,
      addressZipCode,
      adminName,
      adminCpf,
      adminEmail,
      adminPassword,
      planId,
      acceptanceToken,
      lgpdIsDataController,
      lgpdHasLegalBasis,
      lgpdAcknowledgesResponsibility,
      privacyPolicyAccepted,
      billingCycle,
      paymentMethod,
    } = createTenantDto;

    // Decodificar e validar token de aceite do contrato
    let acceptanceData: any;
    try {
      acceptanceData = this.jwtService.verify(acceptanceToken);
    } catch (error) {
      throw new BadRequestException(
        'Token de aceite do contrato inválido ou expirado',
      );
    }

    // Buscar Política de Privacidade atual para snapshot
    const privacyPolicyData = await this.privacyPolicyService.getCurrentPolicy();

    // Validar se CNPJ já existe
    if (cnpj) {
      const existingCnpj = await this.prisma.tenant.findUnique({
        where: { cnpj },
      });
      if (existingCnpj) {
        throw new ConflictException('CNPJ já cadastrado');
      }
    }

    // Validar se plano existe
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });
    if (!plan) {
      throw new NotFoundException('Plano não encontrado');
    }

    // Gerar slug único baseado no nome
    const baseSlug = this.generateSlug(name);
    let slug = baseSlug;
    let counter = 1;
    while (await this.prisma.tenant.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Gerar nome do schema
    const schemaName = `tenant_${slug.replace(/-/g, '_')}_${randomBytes(3).toString('hex')}`;

    // ==============================================================================
    // PASSO 1: Criar customer no Asaas ANTES da transação
    // ==============================================================================
    let asaasCustomerId: string | null = null;
    try {
      this.logger.log(`Criando customer no Asaas para: ${email}`);

      const asaasCustomer = await this.asaasService.createCustomer({
        name,
        cpfCnpj: cnpj?.replace(/\D/g, '') || '',
        email,
        phone: phone?.replace(/\D/g, ''),
        address: addressStreet,
        addressNumber,
        complement: addressComplement,
        province: addressDistrict,
        city: addressCity,
        state: addressState,
        postalCode: addressZipCode?.replace(/\D/g, ''),
      });

      asaasCustomerId = asaasCustomer.id;
      this.logger.log(`✓ Customer Asaas criado: ${asaasCustomerId}`);
    } catch (error) {
      this.logger.error('Falha ao criar customer no Asaas:', error.message);
      throw new InternalServerErrorException(
        'Gateway de pagamento temporariamente indisponível. Tente novamente em instantes.',
      );
    }

    // ==============================================================================
    // PASSO 2: Calcular desconto se ANNUAL
    // ==============================================================================
    let discountPercent: number | null = null;
    if (billingCycle === 'ANNUAL' && plan.annualDiscountPercent) {
      discountPercent = Number(plan.annualDiscountPercent);
      this.logger.log(`Aplicando desconto anual de ${discountPercent}% ao plano ${plan.displayName}`);
    }

    try {
      // Iniciar transação para criar tenant, subscription e usuário
      const result = await this.prisma.$transaction(async (prisma) => {
        // 1. Criar o tenant
        const tenant = await prisma.tenant.create({
          data: {
            name,
            slug,
            cnpj,
            email,
            phone,
            addressStreet,
            addressNumber,
            addressComplement,
            addressDistrict,
            addressCity,
            addressState,
            addressZipCode,
            schemaName,
            status: TenantStatus.TRIAL, // Iniciar com trial
            asaasCustomerId, // ID do customer criado no Asaas
          },
        });

        // 2. Criar a subscription
        const subscription = await prisma.subscription.create({
          data: {
            tenantId: tenant.id,
            planId,
            status: 'trialing',
            startDate: new Date(),
            trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias de trial
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            // Novos campos de billing
            billingCycle,
            preferredPaymentMethod: paymentMethod,
            discountPercent: discountPercent ? new Prisma.Decimal(discountPercent) : null,
          },
        });

        // 3. Criar o primeiro usuário (admin)
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        const user = await prisma.user.create({
          data: {
            tenantId: tenant.id,
            name: adminName,
            cpf: adminCpf,
            email: adminEmail,
            password: hashedPassword,
            role: UserRole.ADMIN,
            isActive: true,
          },
        });

        // 4. Criar perfil do usuário com cargo de ADMINISTRATOR
        const userProfile = await prisma.userProfile.create({
          data: {
            userId: user.id,
            tenantId: tenant.id,
            cpf: adminCpf, // Campo imutável
            positionCode: 'ADMINISTRATOR',
            department: 'Administração',
            notes: 'Primeiro usuário administrador criado no onboarding',
            createdBy: user.id, // Auto-criação
          },
        });

        // 5. Registrar aceite do contrato
        const contractAcceptance = await prisma.contractAcceptance.create({
          data: {
            contractId: acceptanceData.contractId,
            tenantId: tenant.id,
            userId: user.id,
            ipAddress: acceptanceData.ipAddress,
            userAgent: acceptanceData.userAgent,
            contractVersion: acceptanceData.contractVersion,
            contractHash: acceptanceData.contractHash,
            contractContent: acceptanceData.contractContent,
          },
        });

        // 6. Registrar aceite da Política de Privacidade
        const privacyPolicyAcceptance = await prisma.privacyPolicyAcceptance.create({
          data: {
            tenantId: tenant.id,
            userId: user.id,
            ipAddress: acceptanceData.ipAddress, // Mesmo IP do aceite do contrato
            userAgent: acceptanceData.userAgent, // Mesmo User-Agent
            policyVersion: privacyPolicyData.version,
            policyEffectiveDate: privacyPolicyData.effectiveDate,
            policyContent: privacyPolicyData.content, // Snapshot completo Markdown
            lgpdIsDataController,
            lgpdHasLegalBasis,
            lgpdAcknowledgesResponsibility,
          },
        });

        return {
          tenant,
          subscription,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
          userProfile,
          contractAcceptance,
          privacyPolicyAcceptance,
        };
      });

      // 5. Criar o schema no PostgreSQL (FORA da transação)
      try {
        await this.prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

        // 6. Criar as tabelas do tenant no novo schema
        await this.createTenantSchema(schemaName);

        this.logger.log(`Tenant criado com sucesso: ${result.tenant.id} (${schemaName})`);
      } catch (schemaError) {
        // Se falhar ao criar schema, fazer rollback do tenant
        this.logger.error(`Erro ao criar schema ${schemaName}, fazendo rollback:`, schemaError);
        await this.prisma.tenant.delete({ where: { id: result.tenant.id } });
        throw new InternalServerErrorException('Erro ao criar estrutura do banco de dados');
      }

      return result;
    } catch (error) {
      this.logger.error('Erro ao criar tenant:', error);
      throw new InternalServerErrorException('Erro ao criar ILPI');
    }
  }

  /**
   * Lista todos os tenants (apenas SUPERADMIN)
   */
  async findAll(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        skip,
        take: limit,
        include: {
          subscriptions: {
            include: {
              plan: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              isActive: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.tenant.count(),
    ]);

    return {
      data: tenants,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Busca um tenant específico
   */
  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        subscriptions: {
          include: {
            plan: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    return tenant;
  }

  /**
   * Atualiza dados de um tenant
   */
  async update(id: string, updateTenantDto: UpdateTenantDto, currentUserId: string) {
    // Verificar se tenant existe
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          where: { id: currentUserId },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    // Verificar se usuário é admin do tenant
    if (!tenant.users[0] || tenant.users[0].role !== UserRole.ADMIN) {
      throw new ForbiddenException('Apenas administradores podem atualizar dados da ILPI');
    }

    // Validar CNPJ único se estiver sendo atualizado
    if (updateTenantDto.cnpj && updateTenantDto.cnpj !== tenant.cnpj) {
      const existingCnpj = await this.prisma.tenant.findUnique({
        where: { cnpj: updateTenantDto.cnpj },
      });
      if (existingCnpj) {
        throw new ConflictException('CNPJ já cadastrado');
      }
    }

    return this.prisma.tenant.update({
      where: { id },
      data: updateTenantDto,
    });
  }

  /**
   * Soft delete de um tenant
   */
  async remove(id: string, currentUserId: string) {
    // Verificar se tenant existe e usuário é admin
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          where: { id: currentUserId },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    if (!tenant.users[0] || tenant.users[0].role !== UserRole.ADMIN) {
      throw new ForbiddenException('Apenas administradores podem desativar a ILPI');
    }

    // Soft delete - apenas mudar status
    return this.prisma.tenant.update({
      where: { id },
      data: {
        status: TenantStatus.SUSPENDED,
        deletedAt: new Date(),
      },
    });
  }

  /**
   * Adiciona um novo usuário ao tenant
   */
  async addUser(tenantId: string, addUserDto: AddUserToTenantDto, currentUserId: string) {
    // Verificar se tenant existe e usuário é admin
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        users: {
          where: { id: currentUserId },
        },
        subscriptions: {
          include: {
            plan: true,
          },
          where: {
            status: {
              in: ['ACTIVE', 'TRIAL'],
            },
          },
          take: 1,
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    if (!tenant.users[0] || tenant.users[0].role !== UserRole.ADMIN) {
      throw new ForbiddenException('Apenas administradores podem adicionar usuários');
    }

    // Verificar limite de usuários do plano
    const plan = tenant.subscriptions[0]?.plan;
    if (plan) {
      const currentUserCount = await this.prisma.user.count({
        where: { tenantId, isActive: true },
      });

      if (plan.maxUsers !== -1 && currentUserCount >= plan.maxUsers) {
        throw new BadRequestException(
          `Limite de usuários do plano ${plan.name} atingido (${plan.maxUsers} usuários)`,
        );
      }
    }

    // Verificar se email já existe neste tenant
    const existingUser = await this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email: addUserDto.email,
        },
      },
    });

    if (existingUser) {
      throw new ConflictException('Email já cadastrado nesta ILPI');
    }

    // Gerar senha temporária se não fornecida
    const temporaryPassword =
      addUserDto.temporaryPassword ||
      `Temp${randomBytes(4).toString('hex')}!`;

    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    // Criar usuário E perfil em transação atômica (tudo ou nada)
    const result = await this.prisma.$transaction(async (prisma) => {
      // 1. Criar o usuário
      const user = await prisma.user.create({
        data: {
          tenantId,
          name: addUserDto.name,
          email: addUserDto.email,
          cpf: addUserDto.cpf, // CPF agora obrigatório
          password: hashedPassword,
          role: addUserDto.role,
          isActive: true,
          passwordResetRequired: true, // Forçar troca de senha no primeiro login
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      // 2. Criar perfil na MESMA transação (sincronizar CPF)
      await prisma.userProfile.create({
        data: {
          userId: user.id,
          tenantId,
          cpf: addUserDto.cpf, // Sincronizar CPF entre User e UserProfile
          phone: addUserDto.phone,
          department: addUserDto.department,
          positionCode: addUserDto.positionCode,
          createdBy: currentUserId, // Admin que criou o usuário
        },
      });

      return user;
    });

    // Se chegar aqui, ambos foram criados com sucesso
    // Se qualquer um falhar, rollback automático
    const user = result;

    // Enviar email de convite se solicitado
    if (addUserDto.sendInviteEmail && this.emailService) {
      try {
        const emailSent = await this.emailService.sendUserInvite(user.email, {
          name: user.name,
          email: user.email,
          temporaryPassword,
          tenantName: tenant.name,
        });

        if (emailSent) {
          this.logger.log(`Email de convite enviado com sucesso para ${user.email}`);
        } else {
          this.logger.warn(`Falha ao enviar email de convite para ${user.email}`);
        }
      } catch (error) {
        this.logger.error(`Erro ao enviar email de convite: ${error.message}`);
        // Não bloqueia a criação do usuário se o email falhar
      }
    }

    return {
      user,
      temporaryPassword: addUserDto.sendInviteEmail ? undefined : temporaryPassword,
    };
  }

  /**
   * Lista usuários de um tenant
   */
  async listUsers(tenantId: string, currentUserId: string) {
    // Verificar se usuário pertence ao tenant
    const user = await this.prisma.user.findFirst({
      where: {
        id: currentUserId,
        tenantId,
      },
    });

    if (!user) {
      throw new ForbiddenException('Acesso negado');
    }

    return this.prisma.user.findMany({
      where: {
        tenantId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        passwordResetRequired: true,
        createdAt: true,
        lastLogin: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Remove um usuário do tenant
   */
  async removeUser(tenantId: string, userId: string, currentUserId: string) {
    // Verificar se tenant existe e usuário atual é admin
    const currentUser = await this.prisma.user.findFirst({
      where: {
        id: currentUserId,
        tenantId,
      },
    });

    if (!currentUser || currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Apenas administradores podem remover usuários');
    }

    // Não permitir auto-remoção
    if (userId === currentUserId) {
      throw new BadRequestException('Você não pode remover a si mesmo');
    }

    // Verificar se usuário a ser removido existe
    const userToRemove = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
      },
    });

    if (!userToRemove) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Verificar se não é o último admin
    if (userToRemove.role === UserRole.ADMIN) {
      const adminCount = await this.prisma.user.count({
        where: {
          tenantId,
          role: UserRole.ADMIN,
          isActive: true,
        },
      });

      if (adminCount <= 1) {
        throw new BadRequestException('Não é possível remover o último administrador');
      }
    }

    // Soft delete - desativar usuário
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });
  }

  /**
   * Métodos auxiliares
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s-]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '-') // Substitui espaços por hífens
      .replace(/-+/g, '-') // Remove hífens duplicados
      .trim();
  }

  private async createTenantSchema(schemaName: string) {
    // Criar tabelas específicas do tenant
    // Estrutura completa baseada no schema.prisma e migration mais recente

    const queries = [
      // Tabela de residentes - ESTRUTURA COMPLETA
      `CREATE TABLE IF NOT EXISTS "${schemaName}"."residents" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        -- ========================================
        -- SEÇÃO 1: DADOS PESSOAIS DO RESIDENTE
        -- ========================================
        foto_url TEXT,
        nome TEXT NOT NULL,
        nome_social TEXT,
        cns TEXT,
        cpf TEXT NOT NULL,
        rg TEXT,
        orgao_expedidor TEXT,
        escolaridade TEXT,
        profissao TEXT,
        genero TEXT NOT NULL,
        estado_civil TEXT,
        religiao TEXT,
        data_nascimento TIMESTAMP NOT NULL,
        nacionalidade TEXT NOT NULL DEFAULT 'Brasileira',
        naturalidade TEXT,
        uf_nascimento TEXT,
        nome_mae TEXT,
        nome_pai TEXT,
        cns_card_url TEXT,

        -- ========================================
        -- SEÇÃO 2: ENDEREÇOS
        -- ========================================
        -- Endereço Atual
        cep_atual TEXT,
        estado_atual TEXT,
        cidade_atual TEXT,
        logradouro_atual TEXT,
        numero_atual TEXT,
        complemento_atual TEXT,
        bairro_atual TEXT,
        telefone_atual TEXT,

        -- Endereço de Procedência
        cep_procedencia TEXT,
        estado_procedencia TEXT,
        cidade_procedencia TEXT,
        logradouro_procedencia TEXT,
        numero_procedencia TEXT,
        complemento_procedencia TEXT,
        bairro_procedencia TEXT,
        telefone_procedencia TEXT,

        -- ========================================
        -- SEÇÃO 3: CONTATOS DE EMERGÊNCIA
        -- ========================================
        contatos_emergencia JSONB,

        -- ========================================
        -- SEÇÃO 4: RESPONSÁVEL LEGAL
        -- ========================================
        responsavel_legal_nome TEXT,
        responsavel_legal_cpf TEXT,
        responsavel_legal_rg TEXT,
        responsavel_legal_telefone TEXT,
        responsavel_legal_tipo TEXT,
        responsavel_legal_cep TEXT,
        responsavel_legal_uf TEXT,
        responsavel_legal_cidade TEXT,
        responsavel_legal_logradouro TEXT,
        responsavel_legal_numero TEXT,
        responsavel_legal_complemento TEXT,
        responsavel_legal_bairro TEXT,

        -- ========================================
        -- SEÇÃO 5: DADOS DE ADMISSÃO
        -- ========================================
        data_admissao TIMESTAMP NOT NULL,
        tipo_admissao TEXT,
        motivo_admissao TEXT,
        condicoes_admissao TEXT,
        data_desligamento TIMESTAMP,
        motivo_desligamento TEXT,
        data_saida TIMESTAMP,
        motivo_saida TEXT,
        status TEXT NOT NULL DEFAULT 'ATIVO',

        -- ========================================
        -- SEÇÃO 6: INFORMAÇÕES DE SAÚDE
        -- ========================================
        necessidades_especiais TEXT,
        restricoes_alimentares TEXT,
        aspectos_funcionais TEXT,
        necessita_auxilio_mobilidade BOOLEAN NOT NULL DEFAULT false,
        situacao_saude TEXT,
        tipo_sanguineo TEXT NOT NULL DEFAULT 'NAO_INFORMADO',
        altura DECIMAL(5,2),
        peso DECIMAL(5,2),
        grau_dependencia TEXT,
        medicamentos_uso TEXT,
        alergias TEXT,
        condicoes_cronicas TEXT,
        observacoes_saude TEXT,

        -- ========================================
        -- SEÇÃO 7: PLANOS DE SAÚDE / CONVÊNIOS
        -- ========================================
        convenios JSONB,

        -- ========================================
        -- SEÇÃO 8: PERTENCES
        -- ========================================
        pertences_lista TEXT,
        pertences_observacoes TEXT,

        -- ========================================
        -- SEÇÃO 9: ACOMODAÇÃO
        -- ========================================
        quarto_numero TEXT,
        leito_numero TEXT,

        -- ========================================
        -- AUDITORIA
        -- ========================================
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_by UUID,
        updated_by UUID,
        deleted_at TIMESTAMP,
        deleted_by UUID
      )`,

      // Índices para a tabela residents
      `CREATE INDEX IF NOT EXISTS idx_residents_cpf ON "${schemaName}"."residents"(cpf)`,
      `CREATE INDEX IF NOT EXISTS idx_residents_nome ON "${schemaName}"."residents"(nome)`,
      `CREATE INDEX IF NOT EXISTS idx_residents_status ON "${schemaName}"."residents"(status)`,
      `CREATE INDEX IF NOT EXISTS idx_residents_deleted_at ON "${schemaName}"."residents"(deleted_at)`,

      // Tabela de audit_logs
      `CREATE TABLE IF NOT EXISTS "${schemaName}"."audit_logs" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        action VARCHAR(20) NOT NULL,
        user_id UUID NOT NULL,
        user_name VARCHAR(255),
        ip_address VARCHAR(45),
        user_agent TEXT,
        changes JSONB,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,

      // Índices para audit_logs
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON "${schemaName}"."audit_logs"(entity_type, entity_id)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON "${schemaName}"."audit_logs"(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON "${schemaName}"."audit_logs"(created_at DESC)`,
    ];

    for (const query of queries) {
      await this.prisma.$executeRawUnsafe(query);
    }

    this.logger.log(`Schema ${schemaName} criado com sucesso - tabelas: residents, audit_logs`);
  }
}