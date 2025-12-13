# Módulo: Vacinação

**Status:** ✅ Implementado
**Versão:** 1.0.0
**Última atualização:** 11/12/2025

## Visão Geral

Sistema completo de registro e controle de vacinação dos residentes, com suporte a upload de comprovantes (PDF), cálculo automático de próximas doses, alertas de vacinas pendentes e conformidade com RDC 502/2021 ANVISA.

## Funcionalidades Principais

- ✅ **Registro completo**: 11 campos obrigatórios por RDC 502/2021
- ✅ **Upload de comprovante**: PDF com armazenamento MinIO/S3
- ✅ **Cálculo de próximas doses**: Automático com base em intervalos
- ✅ **Alertas de pendências**: Notificações para vacinas atrasadas
- ✅ **Histórico completo**: Todas as doses de um residente
- ✅ **Filtros avançados**: Por vacina, período, status
- ✅ **Integração com prontuário**: Tab específica no ResidentMedicalRecord
- ✅ **Transações atômicas**: Upload + Criação em transação única

## Arquitetura

### Backend
- **Controller:** [apps/backend/src/vaccinations/vaccinations.controller.ts](../../apps/backend/src/vaccinations/vaccinations.controller.ts)
- **Service:** [apps/backend/src/vaccinations/vaccinations.service.ts](../../apps/backend/src/vaccinations/vaccinations.service.ts)
- **Module:** [apps/backend/src/vaccinations/vaccinations.module.ts](../../apps/backend/src/vaccinations/vaccinations.module.ts)
- **DTOs:** [apps/backend/src/vaccinations/dto/](../../apps/backend/src/vaccinations/dto/)
- **Schema:** [apps/backend/prisma/schema.prisma](../../apps/backend/prisma/schema.prisma)

### Frontend
- **Página principal:** [apps/frontend/src/pages/vaccinations/VaccinationsPage.tsx](../../apps/frontend/src/pages/vaccinations/VaccinationsPage.tsx)
- **Formulário:** [apps/frontend/src/pages/vaccinations/VaccinationForm.tsx](../../apps/frontend/src/pages/vaccinations/VaccinationForm.tsx)
- **API:** [apps/frontend/src/api/vaccinations.api.ts](../../apps/frontend/src/api/vaccinations.api.ts)

## Modelos de Dados

### Vaccination (Vacinação)

```prisma
model Vaccination {
  id         String   @id @default(uuid()) @db.Uuid
  tenantId   String   @db.Uuid
  residentId String   @db.Uuid
  userId     String   @db.Uuid

  // Dados da Vacina (RDC 502/2021)
  vaccineName      String // Nome da vacina
  manufacturer     String // Fabricante
  batchNumber      String // Lote
  expirationDate   DateTime @db.Timestamptz(3)
  administeredDate DateTime @db.Timestamptz(3)

  // Dados de Aplicação
  doseNumber    Int     // 1ª, 2ª, 3ª dose, etc.
  totalDoses    Int?    // Total previsto (ex: 3 doses)
  site          String  // Local de aplicação (braço direito, coxa, etc.)
  route         String  // Via de administração (IM, SC, VO, etc.)

  // Dados do Aplicador
  appliedBy         String // Nome do profissional
  appliedByRegistry String // COREN, CRM, etc.

  // Próxima Dose
  nextDoseDate DateTime? @db.Timestamptz(3)
  nextDoseNotes String?  @db.Text

  // Comprovante
  certificateUrl String?

  // Observações
  notes String? @db.Text

  // Reações Adversas
  hasAdverseReaction Boolean @default(false)
  adverseReactionDetails String? @db.Text

  // Auditoria
  createdAt DateTime  @default(now()) @db.Timestamptz(3)
  updatedAt DateTime  @updatedAt @db.Timestamptz(3)
  deletedAt DateTime? @db.Timestamptz(3)

  // Relações
  tenant   Tenant   @relation(fields: [tenantId], references: [id])
  resident Resident @relation(fields: [residentId], references: [id])
  user     User     @relation(fields: [userId], references: [id])

  @@index([tenantId])
  @@index([residentId])
  @@index([administeredDate])
  @@map("vaccinations")
}
```

## Endpoints da API

### CRUD Básico

| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| POST | `/api/vaccinations` | CREATE_VACCINATIONS | Criar vacinação |
| GET | `/api/vaccinations` | - | Listar com filtros |
| GET | `/api/vaccinations/:id` | - | Buscar por ID |
| PATCH | `/api/vaccinations/:id` | Roles: admin/user | Atualizar |
| DELETE | `/api/vaccinations/:id` | Roles: admin | Soft delete |

### Endpoints Especializados

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/vaccinations/resident/:residentId` | Histórico de um residente |
| GET | `/api/vaccinations/resident/:residentId/vaccine/:vaccineName` | Doses de uma vacina específica |
| GET | `/api/vaccinations/pending` | Vacinas com próxima dose vencida |
| GET | `/api/vaccinations/upcoming?days=30` | Próximas doses nos próximos X dias |

### Upload de Comprovante

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/vaccinations/upload-certificate` | Upload do PDF do comprovante |

**Transação atômica:**
1. Upload do PDF para MinIO/S3
2. Criação do registro de vacinação com `certificateUrl`
3. Se upload falhar, registro não é criado
4. Se criação falhar, arquivo é removido do storage

## Regras de Negócio

### Campos Obrigatórios (RDC 502/2021 Art. 33)

**Conforme RDC 502/2021 ANVISA, Art. 33, Parágrafo Único:**

Obrigatório registrar:
- ✅ Nome da vacina (`vaccineName`)
- ✅ Fabricante (`manufacturer`)
- ✅ Lote (`batchNumber`)
- ✅ Validade (`expirationDate`)
- ✅ Data de aplicação (`administeredDate`)
- ✅ Número da dose (`doseNumber`)
- ✅ Local de aplicação (`site`)
- ✅ Via de administração (`route`)
- ✅ Nome do aplicador (`appliedBy`)
- ✅ Registro profissional (`appliedByRegistry`)
- ✅ Comprovante anexado (`certificateUrl`)

### Validações

**Data de Validade:**
- ✅ Não pode ser anterior à data de aplicação
- ✅ Alerta se vacina vencida for aplicada (bloqueio opcional)

**Número da Dose:**
- ✅ Deve ser >= 1
- ✅ Se `totalDoses` informado, `doseNumber` <= `totalDoses`

**Comprovante:**
- ✅ Upload obrigatório (PDF)
- ✅ Tamanho máximo: 5 MB
- ✅ Formato aceito: application/pdf

**Próxima Dose:**
- ✅ Calculada automaticamente com base em esquema vacinal
- ✅ Se última dose (`doseNumber` === `totalDoses`), próxima dose = null
- ✅ Alertas 30 dias antes da próxima dose

### Cálculo de Próximas Doses

**Esquemas vacinais padrão:**

| Vacina | Intervalo | Total de Doses |
|--------|-----------|----------------|
| COVID-19 | 2ª dose: 28 dias / Reforço: 4-6 meses | 3+ |
| Influenza (Gripe) | Anual | 1/ano |
| Pneumocócica 13 | Dose única | 1 |
| Pneumocócica 23 | Reforço: 5 anos | 2 |
| Hepatite B | 2ª dose: 1 mês / 3ª dose: 6 meses | 3 |
| Tétano/Difteria (dT) | Reforço: 10 anos | 1 + reforços |
| Febre Amarela | Dose única (ou reforço se indicado) | 1 |

**Cálculo automático:**
- ✅ Baseado em tabela de esquemas vacinais
- ✅ Campo `nextDoseDate` preenchido automaticamente
- ✅ Se não houver esquema padrão, usuário pode informar manualmente

### Alertas de Pendências

**Notificações automáticas criadas quando:**
- ✅ Próxima dose vencida (data já passou)
- ✅ Próxima dose em 30 dias
- ✅ Vacina obrigatória não aplicada

**Tipo de notificação:** `VACCINATION_DUE`
**Severidade:** `WARNING`

## Frontend - Componentes

### VaccinationsPage (Página Principal)

**Seções:**
- **Filtros:** Residente, vacina, período, status (todas/pendentes/completas)
- **Cards de resumo:** Total de vacinas, pendentes, próximas 30 dias
- **Tabela de histórico:** Todas as vacinações com paginação
- **Botão "Nova Vacinação":** Abre modal de formulário

### VaccinationForm (Formulário)

**Campos:**

1. **Residente:** Seleção com busca
2. **Dados da Vacina:**
   - Nome da vacina (input com sugestões)
   - Fabricante
   - Lote
   - Validade
   - Data de aplicação
3. **Dados de Aplicação:**
   - Número da dose (1ª, 2ª, 3ª...)
   - Total de doses previstas
   - Local de aplicação (dropdown: braço D/E, coxa D/E, glúteo, etc.)
   - Via de administração (dropdown: IM, SC, VO, ID, etc.)
4. **Profissional:**
   - Nome do aplicador
   - Registro (COREN, CRM, etc.)
5. **Próxima Dose:**
   - Data (calculada automaticamente ou manual)
   - Observações
6. **Comprovante:**
   - Upload de PDF (obrigatório)
   - Preview/download se já enviado
7. **Reações Adversas:**
   - Checkbox "Houve reação adversa?"
   - Campo de texto para detalhes (condicional)
8. **Observações:** Campo livre

**Validações:**
- ✅ Todos os campos obrigatórios por RDC 502/2021
- ✅ Upload de PDF obrigatório
- ✅ Validação de formato de data
- ✅ Validação de valores numéricos

### Tab no Prontuário

**ResidentMedicalRecord - Tab "Vacinação":**
- ✅ Cartão de vacinas (últimas 5)
- ✅ Histórico completo em tabela
- ✅ Indicador de doses (ex: "2/3 doses")
- ✅ Alerta de vacinas pendentes
- ✅ Botão para nova vacinação
- ✅ Link para download de comprovante

## Integração com MinIO/S3

**Upload de Comprovante:**

1. **Frontend:** Envia arquivo PDF via FormData
2. **Backend:** Valida e faz upload para MinIO/S3
3. **Path no bucket:** `{tenantId}/vaccinations/{residentId}/{filename}`
4. **URL retornada:** URL presigned com validade de 7 dias

**Geração de URL presigned:**
```typescript
const presignedUrl = await minioClient.presignedGetObject(
  bucketName,
  objectPath,
  7 * 24 * 60 * 60 // 7 dias
);
```

**Fluxo de transação:**
```typescript
try {
  // 1. Upload do arquivo
  const fileUrl = await uploadToMinIO(file);

  // 2. Criação do registro
  const vaccination = await prisma.vaccination.create({
    data: { ...dto, certificateUrl: fileUrl }
  });

  return vaccination;
} catch (error) {
  // Rollback: remover arquivo se criação falhar
  await deleteFromMinIO(fileUrl);
  throw error;
}
```

## Integrações

### Com Módulo de Residentes
- ✅ Relação `Resident.vaccinations` (1:N)
- ✅ Tab "Vacinação" no prontuário
- ✅ Seleção de residente no formulário

### Com Módulo de Notificações
- ✅ Alertas para vacinas pendentes
- ✅ Tipo `VACCINATION_DUE`
- ✅ Severidade `WARNING`

### Com Módulo de Usuários
- ✅ Auditoria: `userId` de quem registrou
- ✅ Relação `User.vaccinations` para histórico

### Com MinIO/S3 (File Storage)
- ✅ Upload de comprovantes PDF
- ✅ URLs presigned para download
- ✅ Organização por tenant/residente

## Tratamento de Timezone

Uso de `date-fns` para manipulação segura de datas:

**Backend:**
```typescript
parseISO()        // Conversão de ISO string
startOfDay()      // Início do dia
addDays()         // Adição de dias para próximas doses
isBefore()        // Comparação de datas
```

**Frontend:**
```typescript
format(date, 'dd/MM/yyyy')  // Formatação BR
getCurrentDate()             // Data atual local
```

## Referências

- [CHANGELOG - 2025-11-05](../../CHANGELOG.md#2025-11-05---módulo-de-vacinação)
- [Módulo de Residentes](residents.md) - Integração com prontuário
- [Módulo de Notificações](notifications.md) - Alertas de pendências
- [File Storage](../architecture/file-storage.md) - Upload de comprovantes
- RDC 502/2021 ANVISA - Art. 33 (Registro de Vacinação)
- Calendário Nacional de Vacinação do Idoso (Ministério da Saúde)

---

**Desenvolvedor:** Emanuel (Dr. E.) + Claude Sonnet 4.5
