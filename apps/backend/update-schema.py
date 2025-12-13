#!/usr/bin/env python3
"""
Script para adicionar versionamento aos modelos Allergy e Condition no Prisma schema.
Segue exatamente o padrão usado em Medication.
"""

import re

schema_file = "prisma/schema.prisma"

with open(schema_file, 'r', encoding='utf-8') as f:
    content = f.read()

# ====================  ALLERGY CHANGES ====================

# 1. Atualizar modelo Allergy
allergy_old = '''// ──────────────────────────────────────────────────────────────────────────────
//  ALERGIAS
// ──────────────────────────────────────────────────────────────────────────────
model Allergy {
  id         String @id @default(uuid()) @db.Uuid
  tenantId   String @db.Uuid
  residentId String @db.Uuid

  // Dados da alergia
  substance String // Medicamento, alimento, látex, etc.
  reaction  String?          @db.Text // Descrição da reação
  severity  AllergySeverity?

  // Observações
  notes String? @db.Text

  // Auditoria
  recordedBy String    @db.Uuid
  createdAt  DateTime  @default(now()) @db.Timestamptz(3)
  updatedAt  DateTime  @updatedAt @db.Timestamptz(3)
  deletedAt  DateTime? @db.Timestamptz(3)

  // Relações
  tenant   Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  resident Resident @relation(fields: [residentId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [recordedBy], references: [id], onDelete: Restrict)

  // Índices
  @@index([tenantId, residentId])
  @@index([residentId])
  @@index([substance])
  @@index([deletedAt])
  @@map("allergies")
}'''

allergy_new = '''// ──────────────────────────────────────────────────────────────────────────────
//  ALERGIAS
// ──────────────────────────────────────────────────────────────────────────────
model Allergy {
  id         String @id @default(uuid()) @db.Uuid
  tenantId   String @db.Uuid
  residentId String @db.Uuid

  // Dados da alergia
  substance String // Medicamento, alimento, látex, etc.
  reaction  String?          @db.Text // Descrição da reação
  severity  AllergySeverity?

  // Observações
  notes String? @db.Text

  // Auditoria e Versionamento
  versionNumber Int       @default(1) // Número da versão atual (incrementado a cada UPDATE)
  recordedBy    String    @db.Uuid
  updatedBy     String?   @db.Uuid // ID do último usuário que alterou
  createdAt     DateTime  @default(now()) @db.Timestamptz(3)
  updatedAt     DateTime  @updatedAt @db.Timestamptz(3)
  deletedAt     DateTime? @db.Timestamptz(3)

  // Relações
  tenant   Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  resident Resident         @relation(fields: [residentId], references: [id], onDelete: Cascade)
  recorder User             @relation("AllergyRecorder", fields: [recordedBy], references: [id], onDelete: Restrict)
  updater  User?            @relation("AllergyUpdater", fields: [updatedBy], references: [id], onDelete: SetNull)
  history  AllergyHistory[] // Histórico de versões

  // Índices
  @@index([tenantId, residentId])
  @@index([residentId])
  @@index([substance])
  @@index([deletedAt])
  @@index([recordedBy])
  @@index([updatedBy])
  @@map("allergies")
}

// ──────────────────────────────────────────────────────────────────────────────
//  HISTÓRICO DE ALERGIAS (VERSIONAMENTO)
// ──────────────────────────────────────────────────────────────────────────────
model AllergyHistory {
  id            String     @id @default(uuid()) @db.Uuid
  tenantId      String     @db.Uuid
  allergyId     String     @db.Uuid
  versionNumber Int // Número da versão (1, 2, 3, ...)
  changeType    ChangeType // CREATE | UPDATE | DELETE
  changeReason  String     @db.Text // Motivo obrigatório da alteração

  // Snapshots dos dados (JSON)
  previousData Json? // Estado anterior (null em CREATE)
  newData      Json // Estado atual após a alteração

  // Campos alterados (array de strings)
  changedFields String[] @default([]) // Ex: ["substance", "severity", "notes"]

  // Auditoria detalhada
  changedAt     DateTime @db.Timestamptz(3) // Timestamp da alteração
  changedBy     String   @db.Uuid // ID do usuário que fez a alteração
  changedByName String? // Nome do usuário (desnormalizado para performance)
  ipAddress     String? // IP de onde veio a requisição
  userAgent     String? // Browser/device usado

  // Metadados adicionais (JSON flexível)
  metadata Json? @db.JsonB // Dados extras: sessionId, requestId, etc.

  // Relações
  tenant  Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  allergy Allergy @relation(fields: [allergyId], references: [id], onDelete: Cascade)
  user    User    @relation("AllergyHistoryUser", fields: [changedBy], references: [id])

  // Índices para performance
  @@index([tenantId, allergyId, versionNumber(sort: Desc)]) // Buscar histórico de uma alergia
  @@index([tenantId, changedAt(sort: Desc)]) // Buscar alterações recentes do tenant
  @@index([changedBy]) // Buscar alterações por usuário
  @@index([changeType]) // Filtrar por tipo de alteração
  @@map("allergy_history")
}'''

content = content.replace(allergy_old, allergy_new)

# 2. Atualizar modelo Condition
condition_old = '''// ──────────────────────────────────────────────────────────────────────────────
//  CONDIÇÕES CRÔNICAS / DIAGNÓSTICOS
// ──────────────────────────────────────────────────────────────────────────────
model Condition {
  id         String @id @default(uuid()) @db.Uuid
  tenantId   String @db.Uuid
  residentId String @db.Uuid

  // Dados do diagnóstico
  condition String // Nome da condição
  icdCode   String? @db.VarChar(10) // CID-10 (opcional)
  notes     String? @db.Text // Observações clínicas

  // Auditoria
  recordedBy String    @db.Uuid
  createdAt  DateTime  @default(now()) @db.Timestamptz(3)
  updatedAt  DateTime  @updatedAt @db.Timestamptz(3)
  deletedAt  DateTime? @db.Timestamptz(3)

  // Relações
  tenant   Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  resident Resident @relation(fields: [residentId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [recordedBy], references: [id], onDelete: Restrict)

  // Índices
  @@index([tenantId, residentId])
  @@index([residentId])
  @@index([condition])
  @@index([deletedAt])
  @@map("conditions")
}'''

condition_new = '''// ──────────────────────────────────────────────────────────────────────────────
//  CONDIÇÕES CRÔNICAS / DIAGNÓSTICOS
// ──────────────────────────────────────────────────────────────────────────────
model Condition {
  id         String @id @default(uuid()) @db.Uuid
  tenantId   String @db.Uuid
  residentId String @db.Uuid

  // Dados do diagnóstico
  condition String // Nome da condição
  icdCode   String? @db.VarChar(10) // CID-10 (opcional)
  notes     String? @db.Text // Observações clínicas

  // Auditoria e Versionamento
  versionNumber Int       @default(1) // Número da versão atual (incrementado a cada UPDATE)
  recordedBy    String    @db.Uuid
  updatedBy     String?   @db.Uuid // ID do último usuário que alterou
  createdAt     DateTime  @default(now()) @db.Timestamptz(3)
  updatedAt     DateTime  @updatedAt @db.Timestamptz(3)
  deletedAt     DateTime? @db.Timestamptz(3)

  // Relações
  tenant   Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  resident Resident          @relation(fields: [residentId], references: [id], onDelete: Cascade)
  recorder User              @relation("ConditionRecorder", fields: [recordedBy], references: [id], onDelete: Restrict)
  updater  User?             @relation("ConditionUpdater", fields: [updatedBy], references: [id], onDelete: SetNull)
  history  ConditionHistory[] // Histórico de versões

  // Índices
  @@index([tenantId, residentId])
  @@index([residentId])
  @@index([condition])
  @@index([deletedAt])
  @@index([recordedBy])
  @@index([updatedBy])
  @@map("conditions")
}

// ──────────────────────────────────────────────────────────────────────────────
//  HISTÓRICO DE CONDIÇÕES (VERSIONAMENTO)
// ──────────────────────────────────────────────────────────────────────────────
model ConditionHistory {
  id            String     @id @default(uuid()) @db.Uuid
  tenantId      String     @db.Uuid
  conditionId   String     @db.Uuid
  versionNumber Int // Número da versão (1, 2, 3, ...)
  changeType    ChangeType // CREATE | UPDATE | DELETE
  changeReason  String     @db.Text // Motivo obrigatório da alteração

  // Snapshots dos dados (JSON)
  previousData Json? // Estado anterior (null em CREATE)
  newData      Json // Estado atual após a alteração

  // Campos alterados (array de strings)
  changedFields String[] @default([]) // Ex: ["condition", "icdCode", "notes"]

  // Auditoria detalhada
  changedAt     DateTime @db.Timestamptz(3) // Timestamp da alteração
  changedBy     String   @db.Uuid // ID do usuário que fez a alteração
  changedByName String? // Nome do usuário (desnormalizado para performance)
  ipAddress     String? // IP de onde veio a requisição
  userAgent     String? // Browser/device usado

  // Metadados adicionais (JSON flexível)
  metadata Json? @db.JsonB // Dados extras: sessionId, requestId, etc.

  // Relações
  tenant    Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  condition Condition @relation(fields: [conditionId], references: [id], onDelete: Cascade)
  user      User      @relation("ConditionHistoryUser", fields: [changedBy], references: [id])

  // Índices para performance
  @@index([tenantId, conditionId, versionNumber(sort: Desc)]) // Buscar histórico de uma condição
  @@index([tenantId, changedAt(sort: Desc)]) // Buscar alterações recentes do tenant
  @@index([changedBy]) // Buscar alterações por usuário
  @@index([changeType]) // Filtrar por tipo de alteração
  @@map("condition_history")
}'''

content = content.replace(condition_old, condition_new)

# 3. Adicionar relações no Tenant
tenant_relations_old = '''  clinicalProfiles          ClinicalProfile[]
  allergies                 Allergy[]
  conditions                Condition[]
  dietaryRestrictions       DietaryRestriction[]'''

tenant_relations_new = '''  clinicalProfiles          ClinicalProfile[]
  allergies                 Allergy[]
  allergyHistory            AllergyHistory[]
  conditions                Condition[]
  conditionHistory          ConditionHistory[]
  dietaryRestrictions       DietaryRestriction[]'''

content = content.replace(tenant_relations_old, tenant_relations_new)

# 4. Atualizar relações no User
user_relations_old = '''  allergiesRecorded            Allergy[]
  conditionsRecorded           Condition[]'''

user_relations_new = '''  allergiesRecorded            Allergy[]                  @relation("AllergyRecorder")
  conditionsRecorded           Condition[]                @relation("ConditionRecorder")'''

content = content.replace(user_relations_old, user_relations_new)

# 5. Adicionar novas relações de versionamento no User (após Vaccination)
user_versioning_old = '''  // Relações de versionamento (Vaccination)
  vaccinationsCreated Vaccination[]        @relation("VaccinationCreatedBy")
  vaccinationsUpdated Vaccination[]        @relation("VaccinationUpdatedBy")
  vaccinationHistory  VaccinationHistory[] @relation("VaccinationHistoryUser")

  // Relações de versionamento (User) - Self-referencing'''

user_versioning_new = '''  // Relações de versionamento (Vaccination)
  vaccinationsCreated Vaccination[]        @relation("VaccinationCreatedBy")
  vaccinationsUpdated Vaccination[]        @relation("VaccinationUpdatedBy")
  vaccinationHistory  VaccinationHistory[] @relation("VaccinationHistoryUser")

  // Relações de versionamento (Allergy)
  allergiesUpdated Allergy[]        @relation("AllergyUpdater")
  allergyHistory   AllergyHistory[] @relation("AllergyHistoryUser")

  // Relações de versionamento (Condition)
  conditionsUpdated Condition[]        @relation("ConditionUpdater")
  conditionHistory  ConditionHistory[] @relation("ConditionHistoryUser")

  // Relações de versionamento (User) - Self-referencing'''

content = content.replace(user_versioning_old, user_versioning_new)

# Salvar arquivo
with open(schema_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Schema atualizado com sucesso!")
print("✅ Allergy: versionamento adicionado")
print("✅ AllergyHistory: modelo criado")
print("✅ Condition: versionamento adicionado")
print("✅ ConditionHistory: modelo criado")
print("✅ Tenant: relações adicionadas")
print("✅ User: relações atualizadas")
