import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  HttpException,
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
import * as crypto from 'crypto';
import { TenantStatus, Prisma, PositionCode, FinancialCategoryType } from '@prisma/client';
import { addDays } from 'date-fns';
import { execSync } from 'child_process';

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

    if (!privacyPolicyAccepted) {
      throw new BadRequestException(
        'É obrigatório aceitar a Política de Privacidade para concluir o cadastro.',
      );
    }

    // Decodificar e validar token de aceite do termo de uso
    let acceptanceData: Record<string, unknown>;
    try {
      acceptanceData = this.jwtService.verify(acceptanceToken) as Record<string, unknown>;
    } catch (_error) {
      throw new BadRequestException(
        'Token de aceite do termo de uso inválido ou expirado',
      );
    }

    const acceptedPlanId = acceptanceData.planId;
    if (typeof acceptedPlanId !== 'string' || acceptedPlanId !== planId) {
      throw new BadRequestException(
        'Token de aceite inválido para o plano selecionado. Gere o aceite novamente e tente de novo.',
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
      // STEP 1: Criar tenant e subscription no schema public (transação)
      const { tenant, subscription } = await this.prisma.$transaction(async (prisma) => {
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
        const now = new Date();
        const trialEndDate = addDays(now, plan.trialDays); // Usar trialDays do plano
        const subscription = await prisma.subscription.create({
          data: {
            tenantId: tenant.id,
            planId,
            status: 'trialing',
            startDate: now,
            trialEndDate,
            currentPeriodStart: now,
            currentPeriodEnd: trialEndDate,
            // Snapshot das features no momento da assinatura
            subscribedFeatures: plan.features as Prisma.InputJsonValue,
            // Novos campos de billing
            billingCycle,
            preferredPaymentMethod: paymentMethod,
            discountPercent: discountPercent ? new Prisma.Decimal(discountPercent) : null,
          },
        });

        return { tenant, subscription };
      });

      // STEP 2: Criar o schema PostgreSQL (FORA da transação)
      try {
        await this.prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
        this.logger.log(`Schema ${schemaName} criado com sucesso`);

        // STEP 3: Executar migrations para popular o schema com tabelas
        await this.createTenantSchema(schemaName);
      } catch (schemaError) {
        // Se falhar ao criar schema, fazer rollback do tenant
        this.logger.error(`Erro ao criar schema ${schemaName}, fazendo rollback:`, schemaError);
        await this.prisma.tenant.delete({ where: { id: tenant.id } });
        throw new InternalServerErrorException('Erro ao criar estrutura do banco de dados');
      }

      // STEP 4: Criar usuário e perfil NO SCHEMA DO TENANT (transação)
      const tenantClient = this.prisma.getTenantClient(schemaName);
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      const userResult = await tenantClient.$transaction(async (tx) => {
        // STEP 4.1: Inserir registro do tenant na tabela LOCAL do schema
        // IMPORTANTE: Migrations Prisma criam TODAS as tabelas em TODOS os schemas (public + tenant)
        // FK users_tenantId_fkey aponta para tenant_xyz.tenants (tabela LOCAL no schema, não public.tenants)
        // Por isso precisamos inserir o registro do tenant aqui antes de criar usuários
        await tx.$executeRawUnsafe(
          `INSERT INTO "${schemaName}".tenants (id, name, slug, cnpj, email, phone, status, "schemaName", "asaasCustomerId", "createdAt", "updatedAt")
           VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::"TenantStatus", $8, $9, $10, $11)
           ON CONFLICT (id) DO NOTHING`,
          tenant.id, // id
          tenant.name, // name
          tenant.slug, // slug
          tenant.cnpj, // cnpj
          tenant.email, // email
          tenant.phone, // phone
          tenant.status, // status (cast para TenantStatus enum)
          tenant.schemaName, // schemaName
          tenant.asaasCustomerId, // asaasCustomerId
          tenant.createdAt, // createdAt
          tenant.updatedAt, // updatedAt
        );

        // STEP 4.2: Criar o primeiro usuário (admin) NO SCHEMA DO TENANT
        // Agora a FK users_tenantId_fkey pode ser validada corretamente
        const userId = crypto.randomUUID();
        await tx.$executeRawUnsafe(
          `INSERT INTO "${schemaName}".users (id, "tenantId", name, cpf, email, password, role, "isActive", "versionNumber", "createdAt", "updatedAt")
           VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          userId, // id
          tenant.id, // tenantId (agora existe na tabela local)
          adminName, // name
          adminCpf, // cpf
          adminEmail, // email
          hashedPassword, // password
          UserRole.ADMIN, // role
          true, // isActive
          1, // versionNumber
          new Date(), // createdAt
          new Date(), // updatedAt
        );

        // Buscar user recém-criado
        const user = await tx.user.findFirst({
          where: { email: adminEmail },
        });

        if (!user) {
          throw new Error('Falha ao criar usuário');
        }

        // 4. Criar perfil do usuário com cargo de ADMINISTRATOR
        await tx.$executeRawUnsafe(
          `INSERT INTO "${schemaName}".user_profiles (id, "userId", "tenantId", cpf, "positionCode", department, notes, "createdBy", "createdAt", "updatedAt")
           VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::"PositionCode", $6, $7, $8::uuid, $9, $10)`,
          crypto.randomUUID(), // id
          user.id, // userId
          tenant.id, // tenantId
          adminCpf, // cpf
          'ADMINISTRATOR', // positionCode (cast para PositionCode enum)
          'Administração', // department
          'Primeiro usuário administrador criado no onboarding', // notes
          user.id, // createdBy
          new Date(), // createdAt
          new Date(), // updatedAt
        );

        const userProfile = await tx.userProfile.findFirst({
          where: { userId: user.id },
        });

        // Inicializa defaults do módulo financeiro para novos tenants
        await this.seedFinancialDefaultsForTenant(tx, tenant.id, user.id);

        return { user, userProfile };
      });

      // STEP 5: Registrar aceites do termo de uso e LGPD no schema PUBLIC (tabelas compartilhadas)
      // IMPORTANTE: userId está no schema do tenant, mas acceptances estão no public
      // FKs userId foram REMOVIDAS permanentemente via migration (20260117000000_drop_cross_schema_user_fks)
      // porque são incompatíveis com multi-tenancy schema-per-tenant
      // Integridade referencial garantida por: validação em código + aceites append-only

      const termsAcceptanceId = crypto.randomUUID();
      const privacyPolicyAcceptanceId = crypto.randomUUID();
      const acceptedAt = new Date();

      // Agora podemos inserir sem validação de FK
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO public.terms_of_service_acceptances (id, terms_id, "tenantId", "userId", accepted_at, ip_address, user_agent, terms_version, terms_hash, terms_content)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, $6, $7, $8, $9, $10)`,
        termsAcceptanceId,
        acceptanceData.termsId,
        tenant.id,
        userResult.user.id,
        acceptedAt,
        acceptanceData.ipAddress,
        acceptanceData.userAgent,
        acceptanceData.termsVersion,
        acceptanceData.termsHash,
        acceptanceData.termsContent,
      );

      await this.prisma.$executeRawUnsafe(
        `INSERT INTO public.privacy_policy_acceptances (id, "tenantId", "userId", "acceptedAt", "ipAddress", "userAgent", "policyVersion", "policyEffectiveDate", "policyContent", "lgpdIsDataController", "lgpdHasLegalBasis", "lgpdAcknowledgesResponsibility")
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        privacyPolicyAcceptanceId,
        tenant.id,
        userResult.user.id,
        acceptedAt,
        acceptanceData.ipAddress,
        acceptanceData.userAgent,
        privacyPolicyData.version,
        privacyPolicyData.effectiveDate,
        privacyPolicyData.content,
        lgpdIsDataController,
        lgpdHasLegalBasis,
        lgpdAcknowledgesResponsibility,
      );

      // Buscar registros criados para retornar
      const termsAcceptance = await this.prisma.termsOfServiceAcceptance.findUnique({
        where: { id: termsAcceptanceId },
      });

      const privacyPolicyAcceptance = await this.prisma.privacyPolicyAcceptance.findUnique({
        where: { id: privacyPolicyAcceptanceId },
      });

      this.logger.log(`✅ Tenant criado com sucesso: ${tenant.id} (${schemaName})`);

      return {
        tenant,
        subscription,
        user: {
          id: userResult.user.id,
          name: userResult.user.name,
          email: userResult.user.email,
          role: userResult.user.role,
        },
        userProfile: userResult.userProfile,
        termsAcceptance,
        privacyPolicyAcceptance,
      };
    } catch (error) {
      this.logger.error('Erro ao criar tenant:', error);
      if (error instanceof HttpException) {
        throw error;
      }
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
    // Verificar se tenant existe
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
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

    // Obter tenant client para acessar User (TENANT table)
    const tenantClient = this.prisma.getTenantClient(tenant.schemaName);

    // Verificar se usuário atual é admin (usando tenant client)
    const currentUser = await tenantClient.user.findUnique({
      where: { id: currentUserId },
      select: { role: true },
    });

    if (!currentUser || currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Apenas administradores podem adicionar usuários');
    }

    // Verificar limite de usuários do plano
    const plan = tenant.subscriptions[0]?.plan;
    if (plan) {
      const currentUserCount = await tenantClient.user.count({
        where: { isActive: true },
      });

      if (plan.maxUsers !== -1 && currentUserCount >= plan.maxUsers) {
        throw new BadRequestException(
          `Limite de usuários do plano ${plan.name} atingido (${plan.maxUsers} usuários)`,
        );
      }
    }

    // Verificar se email já existe neste tenant (usando tenant client)
    const existingUser = await tenantClient.user.findFirst({
      where: {
        email: addUserDto.email,
        deletedAt: null,
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

    // Criar usuário E perfil em transação atômica usando tenant client
    const result = await tenantClient.$transaction(async (tx) => {
      // 1. Criar o usuário
      const user = await tx.user.create({
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
      await tx.userProfile.create({
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
        const emailSent = await this.emailService.sendUserInvite(
          user.email,
          {
            name: user.name,
            email: user.email,
            temporaryPassword,
            tenantName: tenant.name,
          },
          tenantId, // Incluir tenantId para tracking no histórico de emails
        );

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
  async listUsers(
    tenantId: string,
    currentUserId: string,
    query?: { isActive?: boolean; positionCodes?: string },
  ) {
    // Obter tenant para pegar schemaName
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { schemaName: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    const tenantClient = this.prisma.getTenantClient(tenant.schemaName);

    // Verificar se usuário pertence ao tenant
    const user = await tenantClient.user.findFirst({
      where: {
        id: currentUserId,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new ForbiddenException('Acesso negado');
    }

    // Construir filtros
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
    };

    // Filtro por isActive
    if (query?.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    // Filtro por positionCodes (requer join com user_profiles)
    if (query?.positionCodes) {
      const positionCodesArray = query.positionCodes
        .split(',')
        .map((code) => code.trim()) as PositionCode[];
      where.profile = {
        positionCode: {
          in: positionCodesArray,
        },
      };
    }

    return tenantClient.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        passwordResetRequired: true,
        createdAt: true,
        lastLogin: true,
        profile: {
          select: {
            positionCode: true,
            department: true,
            phone: true,
          },
        },
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
    // Obter tenant para pegar schemaName
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { schemaName: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    const tenantClient = this.prisma.getTenantClient(tenant.schemaName);

    // Verificar se usuário atual é admin
    const currentUser = await tenantClient.user.findFirst({
      where: {
        id: currentUserId,
        deletedAt: null,
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
    const userToRemove = await tenantClient.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
    });

    if (!userToRemove) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Verificar se não é o último admin
    if (userToRemove.role === UserRole.ADMIN) {
      const adminCount = await tenantClient.user.count({
        where: {
          role: UserRole.ADMIN,
          isActive: true,
          deletedAt: null,
        },
      });

      if (adminCount <= 1) {
        throw new BadRequestException('Não é possível remover o último administrador');
      }
    }

    // Soft delete - desativar usuário
    return tenantClient.user.update({
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

  /**
   * Cria o schema do tenant e executa todas as migrations do Prisma.
   * Isso garante que TODAS as tabelas isoladas do tenant sejam criadas:
   * users, user_profiles, residents, beds, rooms, medications, prescriptions,
   * clinical_profiles, vital_signs, daily_records, audit_logs, etc. (66+ tabelas)
   *
   * @param schemaName - Nome do schema do tenant (ex: tenant_ilpi_exemplo_abc123)
   */
  private async createTenantSchema(schemaName: string): Promise<void> {
    try {
      // 1. Criar o schema vazio no PostgreSQL
      await this.prisma.$executeRawUnsafe(
        `CREATE SCHEMA IF NOT EXISTS "${schemaName}";`,
      );

      this.logger.log(`Schema ${schemaName} criado com sucesso`);

      await this.ensureFinancialEnumsInSchema(schemaName);

      // 2. Executar todas as migrations do Prisma para popular o schema
      // Conecta ao banco usando o schema específico do tenant
      const DATABASE_URL = process.env.DATABASE_URL;
      if (!DATABASE_URL) {
        throw new InternalServerErrorException(
          'DATABASE_URL não configurada',
        );
      }

      const tenantUrl = `${DATABASE_URL}?schema=${schemaName}`;

      this.logger.log(
        `Executando migrations do Prisma no schema ${schemaName}...`,
      );

      // Executa o comando npx prisma migrate deploy com a DATABASE_URL do tenant
      execSync(`DATABASE_URL="${tenantUrl}" npx prisma migrate deploy`, {
        stdio: 'inherit',
        cwd: process.cwd(),
      });

      this.logger.log(
        `Migrations executadas com sucesso no schema ${schemaName}`,
      );

      // ShiftTemplates são populados via seed file no public schema (shared reference data)
      // Não precisam ser criados por tenant - veja apps/backend/prisma/seeds/shift-templates.seed.ts
    } catch (error) {
      this.logger.error(
        `Erro ao criar schema ${schemaName}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Falha ao criar schema do tenant: ${error.message}`,
      );
    }
  }

  /**
   * Garante enums do módulo financeiro no schema do tenant.
   *
   * Tradeoff documentado:
   * - A migration de financeiro faz checagem de tipo por nome global em pg_type.
   * - Se o tipo já existir no public, pode não ser criado no schema tenant.
   * - Este passo garante consistência para novos tenants sem depender da ordem histórica de migrations.
   */
  private async ensureFinancialEnumsInSchema(schemaName: string): Promise<void> {
    const safeSchemaName = schemaName.replace(/"/g, '""');

    await this.prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'FinancialCategoryType'
            AND n.nspname = '${safeSchemaName}'
        ) THEN
          EXECUTE 'CREATE TYPE "${safeSchemaName}"."FinancialCategoryType" AS ENUM (''INCOME'', ''EXPENSE'')';
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'FinancialAccountType'
            AND n.nspname = '${safeSchemaName}'
        ) THEN
          EXECUTE 'CREATE TYPE "${safeSchemaName}"."FinancialAccountType" AS ENUM (''CHECKING'', ''SAVINGS'', ''PAYMENT'')';
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'FinancialTransactionType'
            AND n.nspname = '${safeSchemaName}'
        ) THEN
          EXECUTE 'CREATE TYPE "${safeSchemaName}"."FinancialTransactionType" AS ENUM (''INCOME'', ''EXPENSE'')';
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'FinancialTransactionStatus'
            AND n.nspname = '${safeSchemaName}'
        ) THEN
          EXECUTE 'CREATE TYPE "${safeSchemaName}"."FinancialTransactionStatus" AS ENUM (''PENDING'', ''PAID'', ''OVERDUE'', ''CANCELLED'', ''REFUNDED'', ''PARTIALLY_PAID'')';
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'FinancialReconciliationStatus'
            AND n.nspname = '${safeSchemaName}'
        ) THEN
          EXECUTE 'CREATE TYPE "${safeSchemaName}"."FinancialReconciliationStatus" AS ENUM (''PENDING'', ''IN_PROGRESS'', ''RECONCILED'', ''DISCREPANCY'')';
        END IF;
      END $$;
    `);
  }

  /**
   * Cria categorias e métodos de pagamento padrão do financeiro operacional
   * para um tenant recém-criado. Idempotente: cria apenas itens ausentes.
   */
  private async seedFinancialDefaultsForTenant(
    tx: Prisma.TransactionClient,
    tenantId: string,
    seedUserId: string,
  ): Promise<void> {
    const categorySeed: Array<{
      name: string;
      type: FinancialCategoryType;
      description?: string;
      parentName?: string;
    }> = [
      { name: 'Receitas Operacionais', type: FinancialCategoryType.INCOME },
      {
        name: 'Mensalidades de residentes',
        type: FinancialCategoryType.INCOME,
        parentName: 'Receitas Operacionais',
      },
      {
        name: 'Taxas de adesão/matrícula',
        type: FinancialCategoryType.INCOME,
        parentName: 'Receitas Operacionais',
      },
      { name: 'Receitas Não Operacionais', type: FinancialCategoryType.INCOME },
      {
        name: 'Doações e contribuições',
        type: FinancialCategoryType.INCOME,
        parentName: 'Receitas Não Operacionais',
      },
      { name: 'Despesas Operacionais', type: FinancialCategoryType.EXPENSE },
      {
        name: 'Alimentação e nutrição',
        type: FinancialCategoryType.EXPENSE,
        parentName: 'Despesas Operacionais',
      },
      {
        name: 'Medicamentos e insumos',
        type: FinancialCategoryType.EXPENSE,
        parentName: 'Despesas Operacionais',
      },
      { name: 'Despesas Administrativas', type: FinancialCategoryType.EXPENSE },
      {
        name: 'Folha administrativa',
        type: FinancialCategoryType.EXPENSE,
        parentName: 'Despesas Administrativas',
      },
      {
        name: 'Contabilidade e jurídico',
        type: FinancialCategoryType.EXPENSE,
        parentName: 'Despesas Administrativas',
      },
      { name: 'Despesas Fixas', type: FinancialCategoryType.EXPENSE },
      {
        name: 'Energia elétrica',
        type: FinancialCategoryType.EXPENSE,
        parentName: 'Despesas Fixas',
      },
      {
        name: 'Água e gás',
        type: FinancialCategoryType.EXPENSE,
        parentName: 'Despesas Fixas',
      },
    ];

    const paymentMethodSeed = [
      {
        name: 'PIX',
        code: 'pix',
        description: 'Pagamento instantâneo via PIX',
        requiresManualConfirmation: true,
        allowsInstallments: false,
        maxInstallments: 1,
      },
      {
        name: 'Boleto',
        code: 'bank_slip',
        description: 'Boleto bancário',
        requiresManualConfirmation: true,
        allowsInstallments: false,
        maxInstallments: 1,
      },
      {
        name: 'Transferência bancária',
        code: 'bank_transfer',
        description: 'TED/DOC/Transferência',
        requiresManualConfirmation: true,
        allowsInstallments: false,
        maxInstallments: 1,
      },
      {
        name: 'Cartão de crédito',
        code: 'credit_card',
        description: 'Pagamento em cartão de crédito',
        requiresManualConfirmation: true,
        allowsInstallments: true,
        maxInstallments: 12,
      },
      {
        name: 'Dinheiro',
        code: 'cash',
        description: 'Pagamento em espécie',
        requiresManualConfirmation: true,
        allowsInstallments: false,
        maxInstallments: 1,
      },
    ];

    const existingCategories = await tx.financialCategory.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
    });

    const categoryMap = new Map(existingCategories.map((c) => [c.name, c.id]));

    for (const category of categorySeed.filter((entry) => !entry.parentName)) {
      if (categoryMap.has(category.name)) {
        continue;
      }

      const created = await tx.financialCategory.create({
        data: {
          tenantId,
          name: category.name,
          description: category.description,
          type: category.type,
          isSystemDefault: true,
          isActive: true,
          createdBy: seedUserId,
          updatedBy: seedUserId,
        },
        select: { id: true, name: true },
      });

      categoryMap.set(created.name, created.id);
    }

    for (const category of categorySeed.filter((entry) => entry.parentName)) {
      if (categoryMap.has(category.name)) {
        continue;
      }

      const parentId = categoryMap.get(category.parentName!);
      if (!parentId) {
        continue;
      }

      const created = await tx.financialCategory.create({
        data: {
          tenantId,
          name: category.name,
          description: category.description,
          type: category.type,
          parentCategoryId: parentId,
          isSystemDefault: true,
          isActive: true,
          createdBy: seedUserId,
          updatedBy: seedUserId,
        },
        select: { id: true, name: true },
      });

      categoryMap.set(created.name, created.id);
    }

    const existingMethods = await tx.financialPaymentMethod.findMany({
      where: { deletedAt: null },
      select: { code: true },
    });
    const existingCodes = new Set(existingMethods.map((method) => method.code));

    for (const method of paymentMethodSeed) {
      if (existingCodes.has(method.code)) {
        continue;
      }

      await tx.financialPaymentMethod.create({
        data: {
          tenantId,
          ...method,
          isActive: true,
        },
      });
    }
  }

  /**
   * Busca subscription ativa do tenant com contagens de usuários e residentes
   */
  async getMySubscription(tenantId: string) {
    // Buscar subscription ativa mais recente (SHARED table)
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: {
          in: ['trialing', 'active'],
        },
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!subscription) {
      throw new NotFoundException('Nenhuma subscription ativa encontrada');
    }

    // Buscar tenant para pegar schemaName e status (SHARED table)
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        status: true,
        schemaName: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    // Obter client do tenant para acessar dados isolados
    const tenantClient = this.prisma.getTenantClient(tenant.schemaName);

    // Contar usuários ativos (TENANT table)
    const activeUsersCount = await tenantClient.user.count({
      where: {
        isActive: true,
        deletedAt: null,
      },
    });

    // Contar residentes ativos (TENANT table)
    const activeResidentsCount = await tenantClient.resident.count({
      where: {
        status: 'Ativo',
        deletedAt: null,
      },
    });

    return {
      subscription: {
        id: subscription.id,
        status: subscription.status,
        trialEndDate: subscription.trialEndDate,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
      plan: {
        id: subscription.plan.id,
        name: subscription.plan.name,
        displayName: subscription.plan.displayName,
        type: subscription.plan.type,
        maxUsers: subscription.plan.maxUsers,
        maxResidents: subscription.plan.maxResidents,
      },
      usage: {
        activeUsers: activeUsersCount,
        activeResidents: activeResidentsCount,
      },
      tenantStatus: tenant?.status || 'TRIAL',
    };
  }

  /**
   * Busca features disponíveis no plano do tenant
   * SUPERADMIN (tenantId = null) recebe todas as features
   */
  /**
   * Calcula os limites e features efetivos de um tenant
   * Aplica overrides customizados sobre os limites do plano base
   *
   * Lógica de resolução:
   * - customMaxUsers ?? plan.maxUsers ?? -1
   * - customMaxResidents ?? plan.maxResidents ?? -1
   * - merge(plan.features, customFeatures)
   *
   * @param tenantId - ID do tenant
   * @returns Limites e features efetivos (com overrides aplicados)
   */
  async getTenantEffectiveLimits(tenantId: string) {
    // Buscar tenant com customizações
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        customMaxUsers: true,
        customMaxResidents: true,
        customFeatures: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    // Buscar subscription ativa para pegar plano base
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: {
          in: ['active', 'trialing', 'ACTIVE', 'TRIAL'],
        },
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!subscription) {
      throw new NotFoundException('Nenhuma assinatura ativa encontrada');
    }

    const plan = subscription.plan;

    // Resolver limites efetivos (custom override ou plano base)
    const effectiveMaxUsers = tenant.customMaxUsers ?? plan.maxUsers;
    const effectiveMaxResidents =
      tenant.customMaxResidents ?? plan.maxResidents;

    // Resolver features efetivas (3 camadas: subscribed → plan → custom)
    // 1. subscribedFeatures: snapshot no momento da assinatura (base histórica)
    // 2. plan.features: fallback se não houver snapshot (planos antigos)
    // 3. customFeatures: overrides do SuperAdmin (adição/remoção manual)
    const subscribedFeatures = (subscription.subscribedFeatures as Record<string, boolean>) || {};
    const planFeatures = (plan.features as Record<string, boolean>) || {};
    const customFeatures =
      (tenant.customFeatures as Record<string, boolean>) || {};

    // Base: usar features assinadas, ou features do plano como fallback
    const baseFeatures = Object.keys(subscribedFeatures).length > 0
      ? subscribedFeatures
      : planFeatures;

    // Merge: customFeatures sobrescreve baseFeatures
    // Se customFeatures[key] === false, remove a feature
    // Se customFeatures[key] === true, adiciona a feature
    const effectiveFeatures = { ...baseFeatures };
    Object.entries(customFeatures).forEach(([key, value]) => {
      if (value === false) {
        delete effectiveFeatures[key]; // Remove feature
      } else {
        effectiveFeatures[key] = true; // Adiciona feature
      }
    });

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      plan: plan.displayName || plan.name,
      planType: plan.type,
      subscriptionStatus: subscription.status,
      // Limites base do plano
      baseLimits: {
        maxUsers: plan.maxUsers,
        maxResidents: plan.maxResidents,
        features: planFeatures,
      },
      // Features assinadas (snapshot no momento da assinatura)
      subscribedFeatures: subscribedFeatures,
      // Overrides customizados (null se não houver)
      customOverrides: {
        customMaxUsers: tenant.customMaxUsers,
        customMaxResidents: tenant.customMaxResidents,
        customFeatures: customFeatures,
      },
      // Limites efetivos (base + overrides)
      effectiveLimits: {
        maxUsers: effectiveMaxUsers,
        maxResidents: effectiveMaxResidents,
        features: effectiveFeatures,
      },
      // Indicador se tem customizações ativas
      hasCustomizations:
        tenant.customMaxUsers !== null ||
        tenant.customMaxResidents !== null ||
        Object.keys(customFeatures).length > 0,
    };
  }

  async getMyFeatures(tenantId: string | null, _userId: string) {
    // SUPERADMIN tem acesso a todas as features
    if (!tenantId) {
      // Retornar todas as features como true
      const allFeatures: Record<string, boolean> = {
        // Core (sempre habilitadas)
        residentes: true,
        usuarios: true,
        prontuario: true,
        // Módulos clínicos
        medicacoes: true,
        sinais_vitais: true,
        registros_diarios: true,
        eventos_sentinela: true,
        // Gestão e operações
        quartos: true,
        financeiro: true,
        relatorios: true,
        agenda: true,
        documentos_institucionais: true,
        // Comunicação
        alertas: true,
        mensagens: true,
        whatsapp: true,
        // Conformidade
        conformidade: true,
        // Recursos avançados
        versoes: true,
        backup: true,
      };

      return {
        plan: 'SUPERADMIN',
        planType: 'SUPERADMIN',
        features: allFeatures,
      };
    }

    // Usar método que calcula limites efetivos (com overrides)
    const effectiveLimits = await this.getTenantEffectiveLimits(tenantId);

    return {
      plan: effectiveLimits.plan,
      planType: effectiveLimits.planType,
      features: effectiveLimits.effectiveLimits.features,
      subscriptionStatus: effectiveLimits.subscriptionStatus,
      // Informações adicionais sobre customizações
      hasCustomizations: effectiveLimits.hasCustomizations,
      maxUsers: effectiveLimits.effectiveLimits.maxUsers,
      maxResidents: effectiveLimits.effectiveLimits.maxResidents,
      // Detalhes para tenant admin
      subscribedFeatures: effectiveLimits.subscribedFeatures,
      customOverrides: effectiveLimits.customOverrides,
    };
  }
}
