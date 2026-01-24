# 📋 Fluxo Completo: Criação de Novo Usuário - Rafa ILPI

**Data:** 2026-01-23
**Versão:** 1.0.0

---

## 🎯 Visão Geral

Este documento mapeia o **fluxo end-to-end** de criação de um novo usuário (colaborador) no sistema, desde o formulário no frontend até a persistência no banco de dados multi-tenant, incluindo:
- **Validações** (CPF, email, limites do plano)
- **Criação Transacional** (User + UserProfile sincronizados)
- **Email de Convite** (template renderizado com Resend)
- **Auditoria** (logs de criação de usuário)

---

## 📊 Diagrama de Fluxo Resumido

```
┌─────────────────────────────────────────────────────────────┐
│              1. FORMULÁRIO (Frontend)                        │
│  UserCreatePage.tsx → Validações Client-side                │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│           2. VERIFICAÇÃO DE LIMITES (Frontend)               │
│  useMySubscription → PlanLimitWarningDialog (>= 80%)        │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│              3. SUBMISSÃO (Frontend → Backend)               │
│  addUserToTenant() → POST /tenants/:tenantId/users          │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│              4. VALIDAÇÃO BACKEND (Controller)               │
│  JwtAuthGuard → RolesGuard (ADMIN) → AddUserToTenantDto     │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│              5. LÓGICA DE NEGÓCIO (Service)                  │
│  TenantsService.addUser() → Validações + Limites            │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│       6. TRANSAÇÃO ATÔMICA (Prisma - Tenant Schema)          │
│  User.create() + UserProfile.create() (sincronização CPF)   │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│           7. EMAIL DE CONVITE (Opcional)                     │
│  EmailService.sendUserInvite() → Resend API                 │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│         8. ATUALIZAÇÃO DE PERFIL ADICIONAL (Frontend)        │
│  updateUserProfile() → PATCH /user-profiles/:userId         │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│              9. RESPOSTA E REDIRECIONAMENTO                  │
│  toast.success() → navigate('/dashboard/usuarios')          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 PASSO 1: Formulário de Criação (Frontend)

### Arquivo: [apps/frontend/src/pages/users/UserCreatePage.tsx](../../apps/frontend/src/pages/users/UserCreatePage.tsx)

**Linha 36-57: Estado do Formulário**

```typescript
const [formData, setFormData] = useState({
  // Dados Básicos
  name: '',
  email: '',
  cpf: '',
  role: 'staff' as UserRole,
  sendInviteEmail: true,
  temporaryPassword: '',

  // Perfil ILPI
  positionCode: null as PositionCode | null,
  department: '',
  registrationType: '' as RegistrationType | '',
  registrationNumber: '',
  registrationState: '',
  phone: '',
  birthDate: '',

  // Flags Especiais
  isTechnicalManager: false,
  isNursingCoordinator: false,
})
```

**Linha 67-90: Validações Client-Side**

```typescript
// Validação de CPF em tempo real
useEffect(() => {
  if (formData.cpf) {
    setCpfValidation(getMensagemValidacaoCPF(formData.cpf))
  } else {
    setCpfValidation({ valido: true, mensagem: '' })
  }
}, [formData.cpf])

// Atualizar role automaticamente quando cargo ou flags mudam
useEffect(() => {
  if (formData.positionCode || formData.isTechnicalManager || formData.isNursingCoordinator) {
    const recommendation = getRoleRecommendation(
      formData.positionCode,
      formData.isTechnicalManager,
      formData.isNursingCoordinator
    )

    setFormData((prev) => ({
      ...prev,
      role: recommendation.suggestedRole,
    }))
  }
}, [formData.positionCode, formData.isTechnicalManager, formData.isNursingCoordinator])
```

---

## ⚠️ PASSO 2: Verificação de Limites do Plano (Frontend)

**Linha 93-104: Warning Dialog Proativo**

```typescript
// Verificar limite ao entrar na página (apenas uma vez)
useEffect(() => {
  if (!subscriptionData || hasSeenWarning) return

  const { usage, plan } = subscriptionData
  const percentage = plan.maxUsers > 0 ? (usage.activeUsers / plan.maxUsers) * 100 : 0

  // Mostrar dialog se >= 80% do limite
  if (percentage >= 80) {
    setShowLimitDialog(true)
    setHasSeenWarning(true)
  }
}, [subscriptionData, hasSeenWarning])
```

**Linha 224-236: PlanLimitWarningDialog**

```typescript
<PlanLimitWarningDialog
  type="users"
  open={showLimitDialog}
  onOpenChange={setShowLimitDialog}
  onProceed={handleProceedWithWarning}
  usage={{
    current: subscriptionData.usage.activeUsers,
    max: subscriptionData.plan.maxUsers,
  }}
/>
```

---

## 📤 PASSO 3: Submissão do Formulário (Frontend)

**Linha 106-211: Handler de Submit**

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  if (!currentUser?.tenantId) {
    toast.error('Erro ao identificar tenant')
    return
  }

  // Validações básicas
  if (!formData.name.trim()) {
    toast.error('Nome é obrigatório')
    return
  }

  // Validar CPF (obrigatório)
  if (!formData.cpf || !formData.cpf.trim()) {
    toast.error('CPF é obrigatório')
    return
  }

  if (!cpfValidation.valido) {
    toast.error('CPF inválido. Por favor, corrija antes de continuar.')
    return
  }

  try {
    setIsSubmitting(true)

    // 1. Criar usuário
    // Mapear 'staff' para 'USER' (nomenclatura do backend)
    const roleMapping: Record<UserRole, 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER'> = {
      admin: 'ADMIN',
      manager: 'MANAGER',
      staff: 'USER',
      viewer: 'VIEWER',
    }

    const newUser = await addUserToTenant(currentUser.tenantId, {
      name: formData.name,
      email: formData.email,
      cpf: cleanCPF(formData.cpf), // Remove formatação (pontos e traços)
      phone: formData.phone?.trim() || undefined,
      department: formData.department?.trim() || undefined,
      positionCode: formData.positionCode || undefined,
      role: roleMapping[formData.role],
      sendInviteEmail: formData.sendInviteEmail,
      temporaryPassword: formData.temporaryPassword || undefined,
    })

    // Verificar se o usuário foi criado corretamente
    if (!newUser || !newUser.id) {
      throw new Error('Usuário criado mas ID não foi retornado')
    }

    // 2. Atualizar perfil com dados adicionais (se houver)
    // CPF, phone, department e positionCode já foram criados na transação atômica do backend
    if (
      formData.registrationType ||
      formData.registrationNumber ||
      formData.birthDate ||
      formData.isTechnicalManager ||
      formData.isNursingCoordinator
    ) {
      const additionalProfileData = {
        registrationType: formData.registrationType || undefined,
        registrationNumber: formData.registrationNumber?.trim() || undefined,
        registrationState: formData.registrationState?.trim() || undefined,
        birthDate: formData.birthDate?.trim() || undefined,
        isTechnicalManager: formData.isTechnicalManager,
        isNursingCoordinator: formData.isNursingCoordinator,
      }

      await updateUserProfile(newUser.id, additionalProfileData)
    }

    toast.success('Usuário criado com sucesso!')
    navigate('/dashboard/usuarios')
  } catch (error: unknown) {
    // Detectar erro de limite do plano
    if (errorMessage.includes('Limite de usuários') || errorMessage.includes('plano')) {
      toast.error(errorMessage, {
        duration: 10000,
        description: 'Considere fazer upgrade do plano para adicionar mais usuários à sua equipe.',
        action: {
          label: 'Ver Planos',
          onClick: () => {
            window.open('https://wa.me/5511999999999?text=Gostaria%20de%20fazer%20upgrade%20do%20plano', '_blank')
          },
        },
      })
    } else {
      toast.error(errorMessage)
    }
  } finally {
    setIsSubmitting(false)
  }
}
```

### Arquivo: [apps/frontend/src/services/api.ts](../../apps/frontend/src/services/api.ts)

**Linha 366-377: Função addUserToTenant**

```typescript
export async function addUserToTenant(tenantId: string, data: {
  name: string
  email: string
  role: 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER'
  sendInviteEmail?: boolean
  temporaryPassword?: string
}) {
  const response = await api.post(`/tenants/${tenantId}/users`, data)
  // Backend retorna { user: {...}, temporaryPassword?: ... }
  // Extraímos apenas o objeto user
  return response.data.user
}
```

---

## 🔐 PASSO 4: Validação Backend (Controller)

### Arquivo: [apps/backend/src/tenants/tenants.controller.ts](../../apps/backend/src/tenants/tenants.controller.ts)

**Linha 188-207: Endpoint POST /tenants/:tenantId/users**

```typescript
@Post(':tenantId/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN') // ✅ Apenas ADMINs podem criar usuários
@AuditAction('CREATE_USER')
@ApiBearerAuth()
@ApiOperation({
  summary: 'Adicionar usuário à ILPI',
  description: 'Adiciona um novo funcionário/usuário à ILPI',
})
@ApiResponse({ status: 201, description: 'Usuário adicionado com sucesso' })
@ApiResponse({ status: 400, description: 'Limite de usuários atingido' })
@ApiResponse({ status: 403, description: 'Acesso negado' })
@ApiResponse({ status: 409, description: 'Email já cadastrado' })
addUser(
  @Param('tenantId') tenantId: string,
  @Body() addUserDto: AddUserToTenantDto, // ✅ Validação automática via class-validator
  @CurrentUser() user: JwtPayload,
) {
  return this.tenantsService.addUser(tenantId, addUserDto, user.id);
}
```

### Arquivo: [apps/backend/src/tenants/dto/add-user.dto.ts](../../apps/backend/src/tenants/dto/add-user.dto.ts)

**Linha 23-118: DTO com Validações**

```typescript
export class AddUserToTenantDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @Transform(({ value }) => {
    // Se for string vazia, retorna undefined para gerar erro de validação
    if (typeof value === 'string' && value.trim() === '') {
      return undefined;
    }
    return value;
  })
  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @IsString({ message: 'CPF deve ser uma string' })
  @IsCPF() // ✅ Validador customizado de CPF
  cpf: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsEnum(PositionCode)
  positionCode?: PositionCode;

  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @IsOptional()
  @IsBoolean()
  sendInviteEmail?: boolean = true;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Senha deve conter pelo menos 1 letra maiúscula, 1 minúscula, 1 número e 1 caractere especial',
  })
  temporaryPassword?: string;
}
```

---

## 🧠 PASSO 5: Lógica de Negócio (Service)

### Arquivo: [apps/backend/src/tenants/tenants.service.ts](../../apps/backend/src/tenants/tenants.service.ts)

**Linha 521-659: Método addUser()**

```typescript
async addUser(tenantId: string, addUserDto: AddUserToTenantDto, currentUserId: string) {
  // ═══════════════════════════════════════════════════════════════════════
  // STEP 1: Verificar se tenant existe
  // ═══════════════════════════════════════════════════════════════════════
  const tenant = await this.prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      subscriptions: {
        include: {
          plan: true,
        },
        where: {
          status: {
            in: ['ACTIVE', 'TRIAL'], // Apenas subscriptions ativas
          },
        },
        take: 1,
      },
    },
  });

  if (!tenant) {
    throw new NotFoundException('Tenant não encontrado');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 2: Obter tenant client (acesso ao schema isolado)
  // ═══════════════════════════════════════════════════════════════════════
  const tenantClient = this.prisma.getTenantClient(tenant.schemaName);

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 3: Verificar se usuário atual é admin
  // ═══════════════════════════════════════════════════════════════════════
  const currentUser = await tenantClient.user.findUnique({
    where: { id: currentUserId },
    select: { role: true },
  });

  if (!currentUser || currentUser.role !== UserRole.ADMIN) {
    throw new ForbiddenException('Apenas administradores podem adicionar usuários');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 4: Verificar limite de usuários do plano
  // ═══════════════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 5: Verificar se email já existe neste tenant
  // ═══════════════════════════════════════════════════════════════════════
  const existingUser = await tenantClient.user.findFirst({
    where: {
      email: addUserDto.email,
      deletedAt: null,
    },
  });

  if (existingUser) {
    throw new ConflictException('Email já cadastrado nesta ILPI');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 6: Gerar senha temporária se não fornecida
  // ═══════════════════════════════════════════════════════════════════════
  const temporaryPassword =
    addUserDto.temporaryPassword ||
    `Temp${randomBytes(4).toString('hex')}!`;

  const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 7: Criar usuário E perfil em TRANSAÇÃO ATÔMICA
  // ═══════════════════════════════════════════════════════════════════════
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
        passwordResetRequired: true, // ✅ Forçar troca de senha no primeiro login
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
        cpf: addUserDto.cpf, // ✅ Sincronizar CPF entre User e UserProfile
        phone: addUserDto.phone,
        department: addUserDto.department,
        positionCode: addUserDto.positionCode,
        createdBy: currentUserId, // Admin que criou o usuário
      },
    });

    return user;
  });

  // ✅ Se chegar aqui, ambos foram criados com sucesso
  // ✅ Se qualquer um falhar, rollback automático
  const user = result;

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 8: Enviar email de convite se solicitado
  // ═══════════════════════════════════════════════════════════════════════
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
      // ✅ Não bloqueia a criação do usuário se o email falhar
    }
  }

  return {
    user,
    temporaryPassword: addUserDto.sendInviteEmail ? undefined : temporaryPassword,
  };
}
```

---

## 💾 PASSO 6: Transação Atômica (Prisma)

### Detalhamento da Transação (tenantClient.$transaction)

```typescript
const result = await tenantClient.$transaction(async (tx) => {
  // ✅ OPERAÇÃO 1: Criar User
  const user = await tx.user.create({
    data: {
      tenantId,
      name: addUserDto.name,
      email: addUserDto.email,
      cpf: addUserDto.cpf,
      password: hashedPassword,
      role: addUserDto.role,
      isActive: true,
      passwordResetRequired: true,
    },
  });

  // ✅ OPERAÇÃO 2: Criar UserProfile (sincronizado com User)
  await tx.userProfile.create({
    data: {
      userId: user.id,
      tenantId,
      cpf: addUserDto.cpf, // ✅ CRÍTICO: CPF duplicado em ambas tabelas (sincronização)
      phone: addUserDto.phone,
      department: addUserDto.department,
      positionCode: addUserDto.positionCode,
      createdBy: currentUserId,
    },
  });

  return user;
});
```

**Garantias da Transação:**
- ✅ **Atomicidade**: Ambos User e UserProfile são criados ou nenhum é criado
- ✅ **Consistência**: CPF sincronizado entre User e UserProfile
- ✅ **Isolamento**: Nenhum outro processo vê estado intermediário
- ✅ **Rollback Automático**: Se qualquer operação falhar, tudo é revertido

---

## 📧 PASSO 7: Email de Convite (Opcional)

### Arquivo: [apps/backend/src/email/email.service.ts](../../apps/backend/src/email/email.service.ts)

**Linha 46-100: Método sendUserInvite()**

```typescript
async sendUserInvite(
  to: string,
  userData: {
    name: string;
    email: string;
    temporaryPassword: string;
    tenantName: string;
  },
  tenantId?: string,
): Promise<boolean> {
  if (!this.resend) {
    this.logger.warn('Tentativa de envio de email sem API Key configurada');
    return false;
  }

  try {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';

    // Buscar template do banco de dados
    const template = await this.emailTemplatesService.findByKey('user-invite');

    // Renderizar template com variáveis
    const variables = {
      ...userData,
      loginUrl: frontendUrl,
    };
    const htmlContent = await this.emailTemplatesService.renderTemplate('user-invite', variables);

    // Renderizar subject com variáveis
    const subject = this.replaceVariables(template.subject, variables);

    const { data, error } = await this.resend.emails.send({
      from: this.emailFrom,
      to: [to],
      subject,
      html: htmlContent,
      replyTo: this.emailReplyTo,
      headers: {
        'Content-Language': 'pt-BR',
        'X-Language': 'pt-BR',
      },
    });

    if (error) {
      this.logger.error(`Erro ao enviar email de convite: ${error.message}`, error);
      await this.logEmailSent({
        templateKey: 'user-invite',
        recipientEmail: to,
        recipientName: userData.name,
        subject,
        tenantId,
        status: EmailStatus.FAILED,
        errorMessage: error.message,
      });
      return false;
    }

    // Registrar sucesso no log
    await this.logEmailSent({
      templateKey: 'user-invite',
      recipientEmail: to,
      recipientName: userData.name,
      subject,
      tenantId,
      status: EmailStatus.SENT,
      externalId: data?.id,
    });

    return true;
  } catch (error) {
    this.logger.error(`Erro ao enviar email de convite: ${error.message}`);
    return false;
  }
}
```

**Conteúdo do Email (Template `user-invite`):**
- **Subject**: "Bem-vindo(a) ao {tenantName} - Rafa ILPI"
- **Variáveis**:
  - `{{name}}`: Nome do usuário
  - `{{email}}`: Email do usuário
  - `{{temporaryPassword}}`: Senha temporária
  - `{{tenantName}}`: Nome da ILPI
  - `{{loginUrl}}`: URL do frontend (ex: https://app.rafalabs.com.br)

---

## 🔄 PASSO 8: Atualização de Perfil Adicional (Frontend)

**Linha 165-184: Segunda Requisição (Dados Opcionais)**

```typescript
// 2. Atualizar perfil com dados adicionais (se houver)
// CPF, phone, department e positionCode já foram criados na transação atômica do backend
if (
  formData.registrationType ||
  formData.registrationNumber ||
  formData.birthDate ||
  formData.isTechnicalManager ||
  formData.isNursingCoordinator
) {
  const additionalProfileData = {
    registrationType: formData.registrationType || undefined,
    registrationNumber: formData.registrationNumber?.trim() || undefined,
    registrationState: formData.registrationState?.trim() || undefined,
    birthDate: formData.birthDate?.trim() || undefined,
    isTechnicalManager: formData.isTechnicalManager,
    isNursingCoordinator: formData.isNursingCoordinator,
  }

  await updateUserProfile(newUser.id, additionalProfileData)
}
```

**Por que duas requisições?**
1. **Primeira** (`addUserToTenant`): Dados essenciais (User + UserProfile básico) → Transação atômica
2. **Segunda** (`updateUserProfile`): Dados opcionais (registro profissional, flags especiais) → Pode falhar sem quebrar a criação

---

## 🔄 Ciclo de Vida Completo (Timeline)

```
T=0s    | Admin clica em "Criar Usuário"
T=0.1s  | Frontend valida campos obrigatórios (nome, email, CPF)
T=0.2s  | Frontend verifica limite do plano (>= 80% → warning dialog)
T=0.5s  | Admin confirma criação
T=0.6s  | POST /tenants/:tenantId/users → Request Interceptor adiciona JWT
T=0.8s  | Backend: JwtAuthGuard valida JWT → TenantContext.initialize()
T=0.9s  | Backend: RolesGuard verifica role=ADMIN
T=1.0s  | Backend: class-validator valida AddUserToTenantDto (CPF, email, etc.)
T=1.1s  | TenantsService.addUser() → Busca tenant no public schema
T=1.2s  | getTenantClient(schemaName) → Obtém PrismaClient do tenant
T=1.3s  | Verifica se currentUser é ADMIN (query no tenant schema)
T=1.4s  | Conta usuários ativos (verificação de limite do plano)
T=1.5s  | Verifica se email já existe (query no tenant schema)
T=1.6s  | Gera senha temporária: Temp + randomBytes(4) + !
T=1.7s  | Hash da senha com bcrypt (10 rounds)
T=2.0s  | INÍCIO TRANSAÇÃO ATÔMICA
T=2.1s  |   → User.create() no tenant schema
T=2.2s  |   → UserProfile.create() no tenant schema (CPF sincronizado)
T=2.3s  | COMMIT TRANSAÇÃO (sucesso)
T=2.4s  | EmailService.sendUserInvite() → Busca template 'user-invite'
T=2.5s  | EmailTemplatesService.renderTemplate() → Substitui variáveis
T=2.6s  | Resend API envia email (assíncrono, não bloqueia)
T=2.7s  | EmailLog criado no public schema (status: SENT)
T=2.8s  | Backend retorna { user: {...}, temporaryPassword?: ... }
T=2.9s  | Response Interceptor passa (201 Created)
T=3.0s  | Frontend: newUser.id disponível
T=3.1s  | Se houver dados adicionais → PATCH /user-profiles/:userId
T=3.2s  | UserProfilesService.update() → Atualiza registro profissional
T=3.3s  | Backend retorna perfil atualizado
T=3.4s  | toast.success('Usuário criado com sucesso!')
T=3.5s  | navigate('/dashboard/usuarios')
T=3.6s  | Lista de usuários atualizada 🎉
```

---

## 🔐 Validações em Múltiplas Camadas

### 1. **Frontend (UserCreatePage.tsx)**
- ✅ CPF válido (algoritmo de validação)
- ✅ Email formato válido
- ✅ Nome mínimo 3 caracteres
- ✅ Senha temporária mínimo 8 caracteres (se fornecida)

### 2. **Backend - DTO (AddUserToTenantDto)**
- ✅ `@IsCPF()` - Validador customizado de CPF
- ✅ `@IsEmail()` - Email válido
- ✅ `@MinLength(3)` - Nome mínimo 3 caracteres
- ✅ `@IsEnum(UserRole)` - Role válida
- ✅ `@Matches()` - Senha complexa (maiúscula, minúscula, número, especial)

### 3. **Backend - Service (TenantsService.addUser)**
- ✅ Tenant existe?
- ✅ Usuário atual é ADMIN?
- ✅ Limite de usuários do plano não excedido?
- ✅ Email único no tenant?

### 4. **Backend - Database (Prisma + PostgreSQL)**
- ✅ Unique constraint: `users.email` (por schema)
- ✅ Unique constraint: `user_profiles.userId` (por schema)
- ✅ Foreign key: `user_profiles.userId → users.id`
- ✅ Check constraint: `users.role IN ('ADMIN', 'MANAGER', 'USER', 'VIEWER')`

---

## 🔒 Sincronização User ↔ UserProfile

### Problema: CPF Duplicado em Duas Tabelas

**Por que duplicar CPF?**
1. **users.cpf**: Usado para autenticação, login alternativo (CPF + senha)
2. **user_profiles.cpf**: Usado para relatórios, documentos, audit trail

### Solução: Sincronização em Transação Atômica

```typescript
// Na CRIAÇÃO (TenantsService.addUser)
await tenantClient.$transaction(async (tx) => {
  const user = await tx.user.create({
    data: {
      cpf: addUserDto.cpf, // ✅ CPF no User
      // ...
    },
  });

  await tx.userProfile.create({
    data: {
      userId: user.id,
      cpf: addUserDto.cpf, // ✅ CPF no UserProfile (MESMO VALOR)
      // ...
    },
  });
});
```

```typescript
// Na ATUALIZAÇÃO (UserProfilesService.update)
await this.tenantContext.client.$transaction(async (tx) => {
  // Sincronizar CPF com User se fornecido
  if (updateUserProfileDto.cpf !== undefined) {
    await tx.user.update({
      where: { id: userId },
      data: { cpf: updateUserProfileDto.cpf }, // ✅ Atualiza User
    });
  }

  // Atualizar o perfil
  return await tx.userProfile.update({
    where: { id: profile.id },
    data: {
      cpf: updateUserProfileDto.cpf, // ✅ Atualiza UserProfile
      // ...
    },
  });
});
```

---

## 📊 Dados Persistidos no Banco

### Schema: `tenant_{slug}_{hash}` (Exemplo: `tenant_ilpi_exemplo_abc123`)

**Tabela: `users`**
```sql
INSERT INTO "tenant_ilpi_exemplo_abc123".users (
  id,
  tenantId,
  name,
  cpf,
  email,
  password,
  role,
  isActive,
  passwordResetRequired,
  createdAt,
  updatedAt
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'cd5d2ab5-c403-47e7-bed8-31c3cc05043b',
  'Maria Santos',
  '12345678900',
  'maria@email.com',
  '$2b$10$XYZ...', -- bcrypt hash
  'USER',
  true,
  true, -- ✅ Forçar troca de senha no primeiro login
  '2026-01-23 10:30:00',
  '2026-01-23 10:30:00'
);
```

**Tabela: `user_profiles`**
```sql
INSERT INTO "tenant_ilpi_exemplo_abc123".user_profiles (
  id,
  userId,
  tenantId,
  cpf,
  phone,
  department,
  positionCode,
  createdBy,
  createdAt,
  updatedAt
) VALUES (
  '660e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440000', -- FK para users.id
  'cd5d2ab5-c403-47e7-bed8-31c3cc05043b',
  '12345678900', -- ✅ CPF sincronizado
  '(11) 98765-4321',
  'Enfermagem',
  'NURSE',
  '3022fa56-c891-4d27-8302-e38161ce6b55', -- ADMIN que criou
  '2026-01-23 10:30:00',
  '2026-01-23 10:30:00'
);
```

### Schema: `public` (Shared Tables)

**Tabela: `email_logs`**
```sql
INSERT INTO public.email_logs (
  id,
  tenantId,
  templateKey,
  recipientEmail,
  recipientName,
  subject,
  status,
  externalId,
  createdAt
) VALUES (
  '770e8400-e29b-41d4-a716-446655440002',
  'cd5d2ab5-c403-47e7-bed8-31c3cc05043b',
  'user-invite',
  'maria@email.com',
  'Maria Santos',
  'Bem-vindo(a) ao ILPI Exemplo - Rafa ILPI',
  'SENT',
  're_XYZ123...', -- ID do Resend
  '2026-01-23 10:30:05'
);
```

---

## 🐛 Troubleshooting

### Problema 1: "Limite de usuários atingido"

**Causa:** Plano BASIC (máx 5 usuários) já tem 5 usuários ativos

**Solução:**
1. Verificar contagem atual: `SELECT COUNT(*) FROM tenant_xxx.users WHERE isActive = true`
2. Desativar usuários inativos: Soft delete via interface
3. Fazer upgrade do plano: BASIC → PROFISSIONAL

```sql
-- Verificar limite do plano
SELECT p.name, p.maxUsers, s.status
FROM public.subscriptions s
JOIN public.plans p ON s.planId = p.id
WHERE s.tenantId = 'cd5d2ab5-c403-47e7-bed8-31c3cc05043b'
  AND s.status IN ('ACTIVE', 'TRIAL')
ORDER BY s.createdAt DESC
LIMIT 1;
```

### Problema 2: "Email já cadastrado"

**Causa:** Email duplicado no mesmo tenant

**Solução:**
1. Verificar se existe: `SELECT * FROM tenant_xxx.users WHERE email = 'maria@email.com' AND deletedAt IS NULL`
2. Se soft deleted, restaurar: `UPDATE tenant_xxx.users SET deletedAt = NULL, isActive = true WHERE id = '...'`
3. Se ativo, usar email diferente ou editar usuário existente

### Problema 3: Email não enviado (sem erro)

**Causa:** `RESEND_API_KEY` não configurada

**Solução:**
1. Verificar `.env`: `RESEND_API_KEY=re_xxx...`
2. Verificar logs: `Email de convite enviado com sucesso` ou `Tentativa de envio de email sem API Key`
3. Se prod, verificar Resend Dashboard: https://resend.com/emails

```bash
# Verificar logs de email
docker logs rafa-ilpi-backend | grep "email de convite"
```

### Problema 4: Transação falhou (rollback)

**Causa:** User criado mas UserProfile falhou (violação de FK, constraint, etc.)

**Solução:**
1. Verificar logs: `Erro ao criar usuário` + stack trace
2. Verificar se user órfão foi criado: `SELECT * FROM tenant_xxx.users WHERE email = '...'`
3. Rollback automático garante consistência (nenhum registro persistido)

---

## 📚 Referências

- **Arquitetura Multi-Tenant**: [../architecture/multi-tenancy.md](../architecture/multi-tenancy.md)
- **Fluxo de Login**: [LOGIN_TO_DASHBOARD.md](LOGIN_TO_DASHBOARD.md)
- **Email Templates**: [../modules/email-templates.md](../modules/email-templates.md)
- **Validação de CPF**: `apps/backend/src/common/validators/cpf.validator.ts`
- **Prisma Transactions**: https://www.prisma.io/docs/concepts/components/prisma-client/transactions

---

**Última atualização:** 2026-01-23
**Próxima revisão:** Após implementação de bulk user import (CSV)
