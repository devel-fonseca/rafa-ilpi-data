# Plano de Implementação: Versionamento e Auditoria Completa

**Status:** 🚧 Em Andamento (53% Completo)
**Data de Criação:** 11/12/2025
**Última Atualização:** 13/12/2025
**Responsável:** Emanuel (Dr. E.) + Claude Sonnet 4.5

---

## 📊 Status Atual

### ✅ Módulos COM Versionamento Completo (8/15 = 53%)

| Módulo | Tabela Principal | Tabela History | Testes E2E | Status |
|--------|-----------------|----------------|------------|--------|
| Registros Diários | `DailyRecord` | `DailyRecordHistory` | 25/25 | ✓ COMPLETO (Sprint 3) |
| Evoluções Clínicas | `ClinicalNote` | `ClinicalNoteHistory` | - | ✓ COMPLETO |
| POPs | `Pop` | `PopHistory` | - | ✓ COMPLETO |
| Documentos | `TenantDocument` | `DocumentHistory` | - | ✓ COMPLETO |
| **Prescription** | `Prescription` | `PrescriptionHistory` | **46/46** | ✓ **COMPLETO (Sprint 3)** |
| **Resident** | `Resident` | `ResidentHistory` | **27/27** | ✓ **COMPLETO (Sprint 3)** |
| **Medication** | `Medication` | `MedicationHistory` | **32/32** | ✓ **COMPLETO (Sprint 5)** |
| **MedicationAdministration** | `MedicationAdministration` | `MedicationAdministrationHistory` | - | ✓ COMPLETO |

### ❌ Módulos SEM Versionamento (7/15 = 47%)

#### Prioridade 1 - Crítico (Conformidade Legal)

| Módulo | Auditoria Atual | Status | RDC 502/2021 |
|--------|----------------|--------|--------------|
| ~~**Resident**~~ | ~~Básica~~ | ✅ **COMPLETO (Sprint 3)** | ✓ Art. 33 |
| ~~**Prescription**~~ | ~~Parcial~~ | ✅ **COMPLETO (Sprint 3)** | ✓ Portaria SVS/MS 344/1998 |
| ~~**Medication**~~ | ~~Básica~~ | ✅ **COMPLETO (Sprint 5)** | ✓ |
| **Vaccination** | Parcial (userId) | ⏳ PENDENTE | ✓ Art. 33 |
| **SOSMedication** | Básica | ⏳ PENDENTE | ✓ |
| **User** | Básica | ⏳ PENDENTE | - |

#### Prioridade 2 - Alto (Segurança Clínica)

| Módulo | Auditoria Atual | Status | Impacto |
|--------|----------------|--------|---------|
| **Allergy** | Parcial (recordedBy) | ⏳ PENDENTE | ALTO |
| **Condition** | Parcial (recordedBy) | ⏳ PENDENTE | ALTO |
| **DietaryRestriction** | Parcial (recordedBy) | ⏳ PENDENTE | ALTO |
| **ClinicalProfile** | Parcial (updatedBy) | ⏳ PENDENTE | MÉDIO |
| ~~**MedicationAdministration**~~ | ~~Básica~~ | ✅ **COMPLETO** | MÉDIO |
| **SOSAdministration** | Básica | ⏳ PENDENTE | MÉDIO |

#### Prioridade 3 - Médio

| Módulo | Auditoria Atual | Falta | Impacto |
|--------|----------------|-------|---------|
| **VitalSign** | Parcial (userId) | History, updatedBy, changeReason | BAIXO |

---

## 🎯 Padrão Unificado de Versionamento

### 1. Campos de Auditoria Básica (OBRIGATÓRIOS)

Todos os modelos principais DEVEM ter:

```prisma
model <Entity> {
  // ... campos de negócio ...

  // AUDITORIA BÁSICA
  createdAt DateTime  @default(now()) @db.Timestamptz(3)
  updatedAt DateTime  @updatedAt @db.Timestamptz(3)
  deletedAt DateTime? @db.Timestamptz(3)  // Soft delete

  // RASTREAMENTO DE USUÁRIO
  createdBy String  @db.Uuid
  updatedBy String? @db.Uuid

  // RELAÇÕES
  createdByUser User  @relation("<Entity>CreatedBy", fields: [createdBy], references: [id])
  updatedByUser User? @relation("<Entity>UpdatedBy", fields: [updatedBy], references: [id])
  history       <Entity>History[]

  @@index([tenantId, deletedAt])
}
```

### 2. Tabela de Histórico (RECOMENDADO para módulos críticos)

```prisma
model <Entity>History {
  id            String   @id @default(uuid()) @db.Uuid
  <entity>Id    String   @db.Uuid
  tenantId      String   @db.Uuid
  versionNumber Int

  // SNAPSHOTS JSON
  previousData  Json?                   // Estado anterior completo
  newData       Json?                   // Novo estado completo
  changedFields String[] @default([])   // ["field1", "field2.nested"]

  // AUDITORIA DA ALTERAÇÃO
  changeType    ChangeType              // CREATE, UPDATE, DELETE
  changeReason  String  @db.Text        // OBRIGATÓRIO (min 10 chars)

  // USUÁRIO QUE FEZ A ALTERAÇÃO
  changedBy     String  @db.Uuid
  changedByName String  @db.VarChar(255)
  changedAt     DateTime @default(now()) @db.Timestamptz(3)

  // METADADOS TÉCNICOS (OPCIONAL)
  ipAddress     String? @db.VarChar(45)
  userAgent     String? @db.Text

  // RELAÇÕES
  <entity>      <Entity> @relation(fields: [<entity>Id], references: [id], onDelete: Cascade)
  tenant        Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  changedByUser User     @relation(fields: [changedBy], references: [id])

  @@index([<entity>Id, versionNumber])
  @@index([tenantId, changedAt(sort: Desc)])
  @@index([changedBy])
  @@map("<entity>_history")
}

enum ChangeType {
  CREATE
  UPDATE
  DELETE
}
```

### 3. Lógica de Service (Transação Atômica)

```typescript
async update(
  id: string,
  dto: UpdateDto,
  userId: string,
  changeReason: string, // OBRIGATÓRIO
): Promise<Entity> {
  // 1. Buscar estado atual
  const current = await this.prisma.entity.findUniqueOrThrow({ where: { id } });

  // 2. Validar changeReason
  if (!changeReason || changeReason.length < 10) {
    throw new BadRequestException('changeReason deve ter no mínimo 10 caracteres');
  }

  // 3. Calcular campos alterados
  const changedFields = this.calculateChangedFields(current, dto);

  if (changedFields.length === 0) {
    throw new BadRequestException('Nenhuma alteração detectada');
  }

  // 4. Executar em transação
  return await this.prisma.$transaction(async (tx) => {
    // 4.1 Incrementar versionNumber
    const nextVersion = current.versionNumber + 1;

    // 4.2 Atualizar entidade principal
    const updated = await tx.entity.update({
      where: { id },
      data: {
        ...dto,
        versionNumber: nextVersion,
        updatedBy: userId,
        updatedAt: new Date(),
      },
    });

    // 4.3 Criar registro de histórico
    await tx.entityHistory.create({
      data: {
        entityId: id,
        tenantId: current.tenantId,
        versionNumber: nextVersion,
        previousData: current as any, // Snapshot completo
        newData: updated as any,      // Snapshot completo
        changedFields,
        changeType: 'UPDATE',
        changeReason,
        changedBy: userId,
        changedByName: user.fullName,
        changedAt: new Date(),
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      },
    });

    return updated;
  });
}
```

### 4. DTO com changeReason (Frontend → Backend)

```typescript
// Backend DTO
export class UpdateEntityDto {
  // ... campos de negócio ...

  @IsString()
  @MinLength(10, { message: 'Motivo da alteração deve ter no mínimo 10 caracteres' })
  @MaxLength(500)
  changeReason: string; // OBRIGATÓRIO
}

// Frontend - Formulário com campo obrigatório
interface UpdateFormData {
  // ... campos de negócio ...
  changeReason: string; // Campo obrigatório no form
}
```

---

## 📋 Implementação por Prioridade

### PRIORIDADE 1 - Módulos Críticos (Conformidade Legal)

#### 1.1 Resident + ResidentHistory

**Justificativa:** Dados do residente são o núcleo do sistema. Alterações de CPF, nome, datas, responsável legal devem ser rastreadas para conformidade RDC 502/2021 Art. 33.

**Campos Críticos a Versionar:**
- `fullName`, `cpf`, `birthDate`
- `legalGuardian`, `legalGuardianContact`
- `admissionDate`, `dischargeDate`
- `status` (Ativo/Inativo/Falecido)
- `emergencyContacts` (JSON)
- `healthPlans` (JSON)

**Impacto:**
- ✅ Rastreamento completo de alterações cadastrais
- ✅ Auditoria de mudanças de responsável legal
- ✅ Histórico de status do residente
- ✅ Conformidade com LGPD e RDC 502/2021

**Estimativa:** 8-10 horas
- Migration Prisma: 2h
- Service (update/delete com history): 3h
- DTOs com changeReason: 1h
- Testes unitários: 2h
- Documentação: 1h

---

#### 1.2 Prescription + PrescriptionHistory

**Justificativa:** Prescrições médicas são documentos legais (Portaria SVS/MS 344/1998). Alterações devem ser rastreadas para auditoria de controlados, antibióticos e medicamentos de alto risco.

**Campos Críticos a Versionar:**
- `doctorName`, `doctorCrm`, `doctorCrmState`
- `prescriptionDate`, `validUntil`, `reviewDate`
- `prescriptionType`
- `controlledClass`, `notificationNumber` (para CONTROLADO)
- `prescriptionImageUrl`

**Impacto:**
- ✅ Auditoria de alterações em prescrições de controlados
- ✅ Rastreamento de mudanças de validade
- ✅ Histórico de revisões médicas
- ✅ Conformidade com Portaria SVS/MS 344/1998

**Estimativa:** 8-10 horas
- Migration Prisma: 2h
- Service (update/delete com history): 3h
- DTOs com changeReason: 1h
- Testes unitários: 2h
- Documentação: 1h

---

#### 1.3 Medication + MedicationHistory

**Justificativa:** Medicamentos contínuos são parte da prescrição. Alterações de dose, frequência, horários devem ser rastreadas.

**Campos Críticos a Versionar:**
- `name`, `presentation`, `concentration`, `dose`
- `route`, `frequency`, `scheduledTimes`
- `startDate`, `endDate`
- `isControlled`, `isHighRisk`, `requiresDoubleCheck`

**Impacto:**
- ✅ Auditoria de mudanças de dose
- ✅ Rastreamento de alterações de horários
- ✅ Histórico de suspensões/reativações
- ✅ Conformidade com boas práticas farmacêuticas

**Estimativa:** 6-8 horas
- Migration Prisma: 2h
- Service (update/delete com history): 2h
- DTOs com changeReason: 1h
- Testes unitários: 2h
- Documentação: 1h

---

#### 1.4 SOSMedication + SOSMedicationHistory

**Justificativa:** Medicações SOS têm limites diários e intervalos mínimos. Alterações devem ser rastreadas.

**Campos Críticos a Versionar:**
- `name`, `presentation`, `concentration`, `dose`
- `indication`, `indicationDetails`
- `minInterval`, `maxDailyDoses`
- `startDate`, `endDate`

**Impacto:**
- ✅ Auditoria de mudanças de limite diário
- ✅ Rastreamento de alterações de intervalo mínimo
- ✅ Histórico de indicações

**Estimativa:** 6-8 horas
- Migration Prisma: 2h
- Service (update/delete com history): 2h
- DTOs com changeReason: 1h
- Testes unitários: 2h
- Documentação: 1h

---

#### 1.5 Vaccination + VaccinationHistory

**Justificativa:** Vacinação é registro obrigatório RDC 502/2021 Art. 33. Alterações devem ser auditadas.

**Campos Críticos a Versionar:**
- `vaccineName`, `manufacturer`, `batchNumber`
- `expirationDate`, `administeredDate`
- `doseNumber`, `site`, `route`
- `appliedBy`, `appliedByRegistry`
- `nextDoseDate`

**Impacto:**
- ✅ Auditoria de correções de lote/validade
- ✅ Rastreamento de mudanças de próxima dose
- ✅ Conformidade com RDC 502/2021

**Estimativa:** 6-8 horas
- Migration Prisma: 2h
- Service (update/delete com history): 2h
- DTOs com changeReason: 1h
- Testes unitários: 2h
- Documentação: 1h

---

#### 1.6 User + UserHistory

**Justificativa:** Alterações de usuários (roles, permissões, status) devem ser rastreadas para segurança.

**Campos Críticos a Versionar:**
- `fullName`, `email`
- `role`, `positionCode`, `permissions`
- `isActive`
- `password` (registrar apenas que houve mudança, não o hash)

**Impacto:**
- ✅ Auditoria de mudanças de permissões
- ✅ Rastreamento de ativação/desativação
- ✅ Histórico de alterações de cargo

**Estimativa:** 6-8 horas
- Migration Prisma: 2h
- Service (update/delete com history): 2h
- DTOs com changeReason: 1h
- Testes unitários: 2h
- Documentação: 1h

---

### PRIORIDADE 2 - Módulos de Segurança Clínica

#### 2.1 Allergy + AllergyHistory

**Justificativa:** Alergias são informações críticas de segurança. Alterações devem ser rastreadas.

**Estimativa:** 4-6 horas

#### 2.2 Condition + ConditionHistory

**Justificativa:** Condições crônicas são base do perfil clínico. Alterações devem ser auditadas.

**Estimativa:** 4-6 horas

#### 2.3 DietaryRestriction + DietaryRestrictionHistory

**Justificativa:** Restrições alimentares são críticas para segurança. Alterações devem ser rastreadas.

**Estimativa:** 4-6 horas

#### 2.4 ClinicalProfile + ClinicalProfileHistory

**Justificativa:** Perfil clínico contém informações importantes. Alterações devem ser auditadas.

**Estimativa:** 4-6 horas

#### 2.5 MedicationAdministration + SOSAdministration

**Justificativa:** Adicionar `updatedBy` e `changeReason` para casos de correção de administração.

**Estimativa:** 3-4 horas (apenas adicionar campos, sem History)

---

### PRIORIDADE 3 - Opcional

#### 3.1 VitalSign + VitalSignHistory

**Justificativa:** Sinais vitais geralmente não são editados após criação, mas pode ser útil para correções.

**Estimativa:** 4-6 horas

---

## 📊 Estimativa Total

### Prioridade 1 (Crítico)
- Resident: 8-10h
- Prescription: 8-10h
- Medication: 6-8h
- SOSMedication: 6-8h
- Vaccination: 6-8h
- User: 6-8h

**Total P1:** 40-52 horas (1-1,3 semanas)

### Prioridade 2 (Alto)
- Allergy: 4-6h
- Condition: 4-6h
- DietaryRestriction: 4-6h
- ClinicalProfile: 4-6h
- MedicationAdministration/SOS: 3-4h

**Total P2:** 19-28 horas (0,5-0,7 semanas)

### Prioridade 3 (Médio)
- VitalSign: 4-6h

**Total P3:** 4-6 horas (0,1-0,15 semanas)

**TOTAL GERAL:** 63-86 horas (1,6-2,2 semanas de trabalho dedicado)

---

## 🔧 Checklist de Implementação

Para cada módulo, seguir este checklist:

### Backend

- [ ] **1. Migration Prisma**
  - [ ] Adicionar campos `createdBy`, `updatedBy` ao modelo principal
  - [ ] Adicionar campo `versionNumber` ao modelo principal
  - [ ] Criar modelo `<Entity>History` completo
  - [ ] Criar enum `ChangeType` (se não existir)
  - [ ] Adicionar relações (User, History)
  - [ ] Adicionar indexes otimizados
  - [ ] Rodar `npx prisma migrate dev --name add-<entity>-versioning`

- [ ] **2. DTOs**
  - [ ] Adicionar `changeReason` em `Update<Entity>Dto`
  - [ ] Adicionar validações (`@IsString()`, `@MinLength(10)`)
  - [ ] Adicionar `changeReason` em `Delete<Entity>Dto` (se soft delete)

- [ ] **3. Service**
  - [ ] Modificar `create()` para incluir `createdBy`
  - [ ] Modificar `update()` para usar transação com history
    - [ ] Buscar estado atual
    - [ ] Validar `changeReason`
    - [ ] Calcular `changedFields`
    - [ ] Atualizar entidade + criar history (transação atômica)
  - [ ] Modificar `remove()` para usar transação com history (soft delete)
  - [ ] Criar método `getHistory(id: string)` para consultar histórico
  - [ ] Criar método `calculateChangedFields(current, updated)` privado

- [ ] **4. Controller**
  - [ ] Adicionar `@CurrentUser()` decorator nos endpoints
  - [ ] Passar `userId` para service
  - [ ] Adicionar endpoint `GET /<entity>/:id/history`
  - [ ] Adicionar endpoint `GET /<entity>/:id/version/:versionNumber` (opcional)

- [ ] **5. Testes**
  - [ ] Teste de criação com `createdBy`
  - [ ] Teste de atualização com history
  - [ ] Teste de validação de `changeReason` (mínimo 10 chars)
  - [ ] Teste de transação (rollback se history falhar)
  - [ ] Teste de soft delete com history
  - [ ] Teste de consulta de histórico

### Frontend

- [ ] **6. Formulários**
  - [ ] Adicionar campo `changeReason` (textarea obrigatório)
  - [ ] Validação: mínimo 10 caracteres
  - [ ] Placeholder: "Descreva o motivo desta alteração..."
  - [ ] Helper text: "Obrigatório para auditoria"

- [ ] **7. API**
  - [ ] Atualizar `update<Entity>()` para enviar `changeReason`
  - [ ] Atualizar `delete<Entity>()` para enviar `changeReason`
  - [ ] Criar `get<Entity>History(id: string)` para consultar histórico

- [ ] **8. UI de Histórico**
  - [ ] Criar componente `<EntityHistory>` (timeline de alterações)
  - [ ] Mostrar: versionNumber, changedByName, changedAt, changeReason
  - [ ] Mostrar diff de campos alterados (previousData vs newData)
  - [ ] Adicionar tab "Histórico" nos detalhes da entidade

### Documentação

- [ ] **9. Documentação**
  - [ ] Atualizar `docs/modules/<module>.md` com seção "Versionamento"
  - [ ] Documentar campos de auditoria
  - [ ] Documentar modelo History
  - [ ] Adicionar exemplos de uso
  - [ ] Atualizar CHANGELOG.md

---

## 📚 Exemplos de Código

### Exemplo 1: Migration Prisma

```prisma
// 1. Adicionar campos de auditoria ao modelo principal
model Resident {
  id       String @id @default(uuid()) @db.Uuid
  tenantId String @db.Uuid

  // ... campos de negócio ...

  versionNumber Int      @default(1)

  createdAt DateTime  @default(now()) @db.Timestamptz(3)
  updatedAt DateTime  @updatedAt @db.Timestamptz(3)
  deletedAt DateTime? @db.Timestamptz(3)

  createdBy String  @db.Uuid
  updatedBy String? @db.Uuid

  // Relações
  tenant        Tenant            @relation(fields: [tenantId], references: [id])
  createdByUser User              @relation("ResidentCreatedBy", fields: [createdBy], references: [id])
  updatedByUser User?             @relation("ResidentUpdatedBy", fields: [updatedBy], references: [id])
  history       ResidentHistory[]

  @@index([tenantId, deletedAt])
  @@map("residents")
}

// 2. Criar modelo de histórico
model ResidentHistory {
  id            String   @id @default(uuid()) @db.Uuid
  residentId    String   @db.Uuid
  tenantId      String   @db.Uuid
  versionNumber Int

  previousData  Json?
  newData       Json?
  changedFields String[] @default([])

  changeType    ChangeType
  changeReason  String  @db.Text

  changedBy     String  @db.Uuid
  changedByName String  @db.VarChar(255)
  changedAt     DateTime @default(now()) @db.Timestamptz(3)

  ipAddress     String? @db.VarChar(45)
  userAgent     String? @db.Text

  resident      Resident @relation(fields: [residentId], references: [id], onDelete: Cascade)
  tenant        Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  changedByUser User     @relation(fields: [changedBy], references: [id])

  @@index([residentId, versionNumber])
  @@index([tenantId, changedAt(sort: Desc)])
  @@index([changedBy])
  @@map("resident_history")
}

enum ChangeType {
  CREATE
  UPDATE
  DELETE
}
```

### Exemplo 2: DTO com changeReason

```typescript
// update-resident.dto.ts
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateResidentDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  // ... outros campos ...

  @IsString()
  @MinLength(10, { message: 'Motivo da alteração deve ter no mínimo 10 caracteres' })
  @MaxLength(500, { message: 'Motivo da alteração deve ter no máximo 500 caracteres' })
  changeReason: string; // OBRIGATÓRIO
}
```

### Exemplo 3: Service com Transação

```typescript
// residents.service.ts
async update(
  id: string,
  dto: UpdateResidentDto,
  userId: string,
  request?: Request,
): Promise<Resident> {
  // 1. Buscar estado atual
  const current = await this.prisma.resident.findUniqueOrThrow({
    where: { id },
    include: { tenant: true },
  });

  // 2. Validar changeReason
  if (!dto.changeReason || dto.changeReason.trim().length < 10) {
    throw new BadRequestException(
      'changeReason é obrigatório e deve ter no mínimo 10 caracteres'
    );
  }

  // 3. Calcular campos alterados
  const changedFields = this.calculateChangedFields(current, dto);

  if (changedFields.length === 0) {
    throw new BadRequestException('Nenhuma alteração detectada');
  }

  // 4. Obter informações do usuário
  const user = await this.prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { fullName: true },
  });

  // 5. Executar em transação atômica
  return await this.prisma.$transaction(async (tx) => {
    const nextVersion = current.versionNumber + 1;

    // 5.1 Atualizar entidade principal
    const updated = await tx.resident.update({
      where: { id },
      data: {
        ...dto,
        versionNumber: nextVersion,
        updatedBy: userId,
        updatedAt: new Date(),
      },
    });

    // 5.2 Criar registro de histórico
    await tx.residentHistory.create({
      data: {
        residentId: id,
        tenantId: current.tenantId,
        versionNumber: nextVersion,
        previousData: current as any,
        newData: updated as any,
        changedFields,
        changeType: 'UPDATE',
        changeReason: dto.changeReason,
        changedBy: userId,
        changedByName: user.fullName,
        changedAt: new Date(),
        ipAddress: request?.ip,
        userAgent: request?.headers['user-agent'],
      },
    });

    return updated;
  });
}

private calculateChangedFields(current: any, dto: any): string[] {
  const changed: string[] = [];

  for (const key of Object.keys(dto)) {
    if (key === 'changeReason') continue; // Ignorar changeReason

    // Comparação profunda para objetos/arrays
    if (JSON.stringify(current[key]) !== JSON.stringify(dto[key])) {
      changed.push(key);
    }
  }

  return changed;
}
```

### Exemplo 4: Frontend - Formulário com changeReason

```tsx
// ResidentForm.tsx
import { useForm } from 'react-hook-form';
import { Textarea } from '@/components/ui/textarea';

interface FormData {
  fullName: string;
  // ... outros campos ...
  changeReason: string; // OBRIGATÓRIO
}

function ResidentForm({ residentId, onSuccess }) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    await api.updateResident(residentId, data);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Campos de negócio */}
      <Input {...register('fullName')} />

      {/* Campo changeReason obrigatório */}
      <div className="space-y-2">
        <Label htmlFor="changeReason">
          Motivo da Alteração *
        </Label>
        <Textarea
          id="changeReason"
          placeholder="Descreva o motivo desta alteração (mínimo 10 caracteres)..."
          {...register('changeReason', {
            required: 'Motivo da alteração é obrigatório',
            minLength: {
              value: 10,
              message: 'Mínimo de 10 caracteres',
            },
            maxLength: {
              value: 500,
              message: 'Máximo de 500 caracteres',
            },
          })}
        />
        {errors.changeReason && (
          <p className="text-sm text-red-600">{errors.changeReason.message}</p>
        )}
        <p className="text-sm text-muted-foreground">
          Este motivo será registrado no histórico para auditoria.
        </p>
      </div>

      <Button type="submit">Salvar Alterações</Button>
    </form>
  );
}
```

### Exemplo 5: Frontend - Visualização de Histórico

```tsx
// ResidentHistory.tsx
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HistoryEntry {
  id: string;
  versionNumber: number;
  changedByName: string;
  changedAt: string;
  changeReason: string;
  changedFields: string[];
  previousData: any;
  newData: any;
}

function ResidentHistory({ residentId }: { residentId: string }) {
  const { data: history } = useQuery({
    queryKey: ['resident-history', residentId],
    queryFn: () => api.getResidentHistory(residentId),
  });

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Histórico de Alterações</h3>

      <div className="space-y-4">
        {history?.map((entry: HistoryEntry) => (
          <div key={entry.id} className="border rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">Versão {entry.versionNumber}</p>
                <p className="text-sm text-muted-foreground">
                  {entry.changedByName} • {format(new Date(entry.changedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Motivo:</p>
              <p className="text-sm text-muted-foreground">{entry.changeReason}</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Campos Alterados:</p>
              <div className="flex flex-wrap gap-2">
                {entry.changedFields.map((field) => (
                  <span key={field} className="text-xs px-2 py-1 bg-secondary rounded">
                    {field}
                  </span>
                ))}
              </div>
            </div>

            {/* Opcional: Mostrar diff dos valores */}
            <details className="text-sm">
              <summary className="cursor-pointer text-primary">Ver detalhes das alterações</summary>
              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                {JSON.stringify({ anterior: entry.previousData, novo: entry.newData }, null, 2)}
              </pre>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🎯 Ordem de Implementação (Atualizado)

### ✅ Sprint 3 - Fundação e Módulos Médicos (COMPLETO)

1. ~~**Resident + ResidentHistory**~~ ✅ COMPLETO (27/27 testes E2E)
2. ~~**Prescription + PrescriptionHistory**~~ ✅ COMPLETO (46/46 testes E2E)
3. ~~**DailyRecord + DailyRecordHistory**~~ ✅ COMPLETO (25/25 testes E2E)

### ✅ Sprint 5 - Medication Versioning (COMPLETO)

1. ~~**Medication + MedicationHistory**~~ ✅ COMPLETO (32/32 testes E2E)

**Total Sprint 3+5:** 130/130 testes E2E passando (100%)

---

### ⏳ Sprint 6 - Medicações SOS e Vacinação (PRÓXIMO)

1. **SOSMedication + SOSMedicationHistory** (6-8h)
   - Estimativa: 6-8 horas
   - Testes E2E: ~25-30 testes
2. **Vaccination + VaccinationHistory** (6-8h)
   - Conformidade RDC 502/2021
   - Estimativa: 6-8 horas
   - Testes E2E: ~25-30 testes

### ⏳ Sprint 7 - Segurança e Usuários (PENDENTE)

1. **User + UserHistory** (6-8h)
   - Crítico para segurança
   - Estimativa: 6-8 horas
   - Testes E2E: ~20-25 testes
2. **Allergy + AllergyHistory** (4-6h)
3. **Condition + ConditionHistory** (4-6h)

### ⏳ Sprint 8 - Complementação (PENDENTE)

1. **DietaryRestriction + DietaryRestrictionHistory** (4-6h)
2. **ClinicalProfile + ClinicalProfileHistory** (4-6h)
3. **SOSAdministration** (3-4h - apenas adicionar campos)
4. **VitalSign + VitalSignHistory** (opcional) (4-6h)

---

## ✅ Critérios de Aceitação

Para cada módulo implementado, verificar:

### Funcional
- [ ] Campo `changeReason` é obrigatório no update/delete
- [ ] Validação de mínimo 10 caracteres funciona
- [ ] Histórico é criado em transação atômica
- [ ] Snapshots JSON contêm estado completo (previousData + newData)
- [ ] `changedFields` lista corretamente os campos alterados
- [ ] Soft delete cria registro de histórico
- [ ] Endpoint `GET /:id/history` retorna histórico ordenado

### Técnico
- [ ] Migration Prisma roda sem erros
- [ ] Indexes otimizados criados
- [ ] Transações garantem atomicidade (rollback se falhar)
- [ ] Sem N+1 queries (usar `include` corretamente)
- [ ] Testes unitários cobrem cenários principais

### UI/UX
- [ ] Campo `changeReason` visível e claro no form
- [ ] Validação frontend + backend
- [ ] Histórico exibido em timeline legível
- [ ] Diff de campos alterados visível
- [ ] Loading states corretos

### Documentação
- [ ] README atualizado
- [ ] Documentação técnica em `docs/modules/<module>.md`
- [ ] CHANGELOG.md atualizado
- [ ] Exemplos de uso documentados

---

## 📊 Métricas de Sucesso

- **Cobertura:** 100% dos módulos P1 com versionamento completo
- **Auditoria:** Todas as alterações rastreadas com quem, quando, por quê
- **Conformidade:** RDC 502/2021 e Portaria SVS/MS 344/1998 atendidas
- **Performance:** Transações < 200ms (95 percentil)
- **Testes:** Cobertura > 80% nos services de versionamento
- **Documentação:** 100% dos módulos com seção "Versionamento"

---

## 🚨 Riscos e Mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Migration falhar em produção | ALTO | BAIXO | Testar migration em staging primeiro, backup antes de rodar |
| Performance degradada (histórico cresce muito) | MÉDIO | MÉDIO | Indexes otimizados, considerar particionamento/arquivamento futuro |
| Usuários não preencherem changeReason corretamente | MÉDIO | ALTO | Validação obrigatória + placeholder educativo |
| Transações causarem deadlocks | MÉDIO | BAIXO | Timeout adequado, retry logic, ordenar locks consistentemente |
| Frontend não tratar erros de validação | BAIXO | MÉDIO | Validação dupla (frontend + backend), mensagens claras |

---

## 📚 Referências

- [RDC 502/2021 ANVISA - Art. 33](https://www.in.gov.br/en/web/dou/-/resolucao-rdc-n-502-de-27-de-maio-de-2021-322764248)
- [Portaria SVS/MS nº 344/1998 - Medicamentos Controlados](https://bvsms.saude.gov.br/bvs/saudelegis/svs/1998/prt0344_12_05_1998_rep.html)
- [Lei nº 13.709/2018 - LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [Documentação Prisma - Transactions](https://www.prisma.io/docs/concepts/components/prisma-client/transactions)
- [Módulos com Versionamento já implementado](../../docs/modules/):
  - [Registros Diários](daily-records.md)
  - [Evoluções Clínicas](clinical-notes.md)
  - [POPs](pops.md)
  - [Documentos Institucionais](documents.md)

---

**Desenvolvedor:** Emanuel (Dr. E.) + Claude Sonnet 4.5
**Última atualização:** 11/12/2025
