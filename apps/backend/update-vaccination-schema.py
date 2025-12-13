#!/usr/bin/env python3
"""
Script para atualizar schema.prisma com Vaccination Versioning
Padrão: Medication Versioning
"""

import re

schema_file = 'prisma/schema.prisma'

# Ler o arquivo
with open(schema_file, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Atualizar modelo Vaccination - adicionar campos de versionamento
vaccination_old = r'''  // Auditoria
  userId    String    @db.Uuid // ID do usuário que registrou
  createdAt DateTime  @default\(now\(\)\) @db.Timestamptz\(3\)
  updatedAt DateTime  @updatedAt @db.Timestamptz\(3\)
  deletedAt DateTime\? @db.Timestamptz\(3\) // Soft delete

  // Relações
  tenant   Tenant   @relation\(fields: \[tenantId\], references: \[id\], onDelete: Cascade\)
  resident Resident @relation\(fields: \[residentId\], references: \[id\], onDelete: Cascade\)
  user     User     @relation\(fields: \[userId\], references: \[id\], onDelete: Restrict\)

  // Índices para performance
  @@index\(\[tenantId, residentId\]\)
  @@index\(\[residentId, date\(sort: Desc\)\]\)
  @@index\(\[tenantId, date\(sort: Desc\)\]\)
  @@index\(\[deletedAt\]\)
  @@map\("vaccinations"\)
\}'''

vaccination_new = '''  // Auditoria e Versionamento
  versionNumber Int       @default(1) // Número da versão atual (incrementado a cada UPDATE)
  userId        String    @db.Uuid // ID do usuário que criou (registrou)
  createdBy     String    @db.Uuid // ID do usuário que criou o registro
  updatedBy     String?   @db.Uuid // ID do último usuário que alterou
  createdAt     DateTime  @default(now()) @db.Timestamptz(3)
  updatedAt     DateTime  @updatedAt @db.Timestamptz(3)
  deletedAt     DateTime? @db.Timestamptz(3) // Soft delete

  // Relações
  tenant          Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  resident        Resident            @relation(fields: [residentId], references: [id], onDelete: Cascade)
  user            User                @relation(fields: [userId], references: [id], onDelete: Restrict)
  createdByUser   User                @relation("VaccinationCreatedBy", fields: [createdBy], references: [id], onDelete: Restrict)
  updatedByUser   User?               @relation("VaccinationUpdatedBy", fields: [updatedBy], references: [id], onDelete: SetNull)
  history         VaccinationHistory[] // Histórico de versões

  // Índices para performance
  @@index([tenantId, residentId])
  @@index([residentId, date(sort: Desc)])
  @@index([tenantId, date(sort: Desc)])
  @@index([deletedAt])
  @@index([createdBy])
  @@index([updatedBy])
  @@map("vaccinations")
}'''

content = re.sub(vaccination_old, vaccination_new, content, flags=re.MULTILINE | re.DOTALL)

# 2. Adicionar modelo VaccinationHistory após Vaccination
vaccination_history_model = '''
// ──────────────────────────────────────────────────────────────────────────────
//  HISTÓRICO DE VACINAÇÕES (VERSIONAMENTO)
// ──────────────────────────────────────────────────────────────────────────────
model VaccinationHistory {
  id            String     @id @default(uuid()) @db.Uuid
  tenantId      String     @db.Uuid
  vaccinationId String     @db.Uuid
  versionNumber Int // Número da versão (1, 2, 3, ...)
  changeType    ChangeType // CREATE | UPDATE | DELETE
  changeReason  String     @db.Text // Motivo obrigatório da alteração

  // Snapshots dos dados (JSON)
  previousData Json? // Estado anterior (null em CREATE)
  newData      Json // Estado atual após a alteração

  // Campos alterados (array de strings)
  changedFields String[] @default([]) // Ex: ["vaccine", "dose", "batch"]

  // Auditoria detalhada
  changedAt     DateTime @db.Timestamptz(3) // Timestamp da alteração
  changedBy     String   @db.Uuid // ID do usuário que fez a alteração
  changedByName String? // Nome do usuário (desnormalizado para performance)
  ipAddress     String? // IP de onde veio a requisição
  userAgent     String? // Browser/device usado

  // Metadados adicionais (JSON flexível)
  metadata Json? @db.JsonB // Dados extras: sessionId, requestId, etc.

  // Relações
  tenant      Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  vaccination Vaccination @relation(fields: [vaccinationId], references: [id], onDelete: Cascade)
  user        User        @relation("VaccinationHistoryUser", fields: [changedBy], references: [id])

  // Índices para performance
  @@index([tenantId, vaccinationId, versionNumber(sort: Desc)]) // Buscar histórico de uma vacinação
  @@index([tenantId, changedAt(sort: Desc)]) // Buscar alterações recentes do tenant
  @@index([changedBy]) // Buscar alterações por usuário
  @@index([changeType]) // Filtrar por tipo de alteração
  @@map("vaccination_history")
}

'''

# Inserir após o modelo Vaccination
content = re.sub(
    r'(@@map\("vaccinations"\)\n\})\n\n(// ───.*?EVOLUÇÕES CLÍNICAS)',
    r'\1\n' + vaccination_history_model + r'\2',
    content,
    flags=re.MULTILINE | re.DOTALL
)

# 3. Adicionar relação VaccinationHistory no Tenant
tenant_relation = '''  popAttachments            PopAttachment[]
  popHistory                PopHistory[]
  vaccinationHistory        VaccinationHistory[]'''

content = re.sub(
    r'  popAttachments            PopAttachment\[\]\n  popHistory                PopHistory\[\]',
    tenant_relation,
    content
)

# Salvar arquivo atualizado
with open(schema_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Schema atualizado com sucesso!")
print("   - Modelo Vaccination: campos de versionamento adicionados")
print("   - Modelo VaccinationHistory: criado")
print("   - Relações User: já configuradas")
print("   - Relação Tenant: adicionada")
