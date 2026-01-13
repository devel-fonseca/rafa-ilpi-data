# Módulo: Residentes

**Status:** ✅ Implementado
**Versão:** 1.2.0
**Última atualização:** 12/01/2026

> **📝 Atualização 1.2.0 (12/01/2026):**
>
> **Campos de Email e Procedência Simplificada:**
>
> - Adicionado campo `email` (String?, opcional) para contato do residente
> - Adicionado campo `legalGuardianEmail` (String?, opcional) para contato do responsável legal
> - **BREAKING CHANGE:** Substituídos 8 campos de endereço de procedência por campo único `origin` (String?, texto livre)
>   - Removidos: `originCep`, `originState`, `originCity`, `originStreet`, `originNumber`, `originComplement`, `originDistrict`, `originPhone`
>   - Adicionado: `origin` - campo livre para registrar origem (ex: "Vindo da Clínica X", "Diretamente da residência")
> - Migration aplicada: `20260112234101_add_resident_emails_and_origin_field`
>
> **Validação de Idade RDC 502/2021:**
>
> - Implementada validação de idade mínima (60 anos) conforme RDC 502/2021 Art. 2º
> - Frontend: Feedback visual em tempo real com cálculo de idade (✓ Idade: 81 anos)
> - Backend: Custom validator `@IsMinimumAge()` no DTO
> - Validação em 3 camadas: UX (frontend), Zod (client-side), class-validator (server-side)
>
> **📝 Atualização 1.1.1 (12/01/2026):**
>
> - Corrigido tipo de campos de data no schema (`@db.Date` em vez de `@db.Timestamptz(3)`)
> - Adicionados endpoints de histórico e transferência de leito na tabela de API
> - Corrigida contagem de campos do responsável legal (12 campos)
> - Atualizada lista de campos criptografados (apenas CPF, CNS e legalGuardianCpf)
> - Adicionadas respostas detalhadas dos novos endpoints

## Visão Geral

Sistema completo de cadastro e gestão de residentes com prontuário médico integrado. Gerencia dados pessoais, familiares, saúde, acomodação e documentação, servindo como núcleo central do sistema ILPI.

## Funcionalidades Principais

- ✅ **Cadastro completo**: 70+ campos organizados em 4 abas
- ✅ **Upload de foto**: 3 tamanhos (original, medium, small) via MinIO/S3
- ✅ **Prontuário médico**: 8 abas integradas com outros módulos
- ✅ **Gestão de documentos**: Modal independente para upload (sem histórico desnecessário)
- ✅ **Gestão de acomodação**: Sincronização automática com leitos
- ✅ **Contatos de emergência**: Array dinâmico de contatos
- ✅ **Responsável legal**: Dados completos com endereço
- ✅ **Convênios**: Múltiplos planos de saúde com upload de carteirinha
- ✅ **Pertences**: Lista customizável de pertences pessoais
- ✅ **Validação de CPF**: Único por tenant
- ✅ **Limite por plano**: Valida maxResidents do tenant
- ✅ **Soft delete**: Exclusão lógica para compliance
- ✅ **Versionamento**: Sistema completo de histórico (ResidentHistory)
- ✅ **Criptografia LGPD**: Campos sensíveis (CPF, RG, CNS) criptografados
- ✅ **Auditoria completa**: Log de todas as operações
- ✅ **Estatísticas**: Dashboard com métricas agregadas

## Arquitetura

### Backend
- **Module:** [apps/backend/src/residents/residents.module.ts](../../apps/backend/src/residents/residents.module.ts)
- **Controller:** [apps/backend/src/residents/residents.controller.ts](../../apps/backend/src/residents/residents.controller.ts)
- **Service:** [apps/backend/src/residents/residents.service.ts](../../apps/backend/src/residents/residents.service.ts)
- **DTOs:** [apps/backend/src/residents/dto/](../../apps/backend/src/residents/dto/)
- **Schema:** [apps/backend/prisma/schema.prisma](../../apps/backend/prisma/schema.prisma) (linhas 588-711)
- **Migration inicial:** `20251115034813_init`
- **Migration foto:** `20251115122048_add_foto_url_to_resident`

### Frontend
- **Listagem:** [apps/frontend/src/pages/residents/ResidentsList.tsx](../../apps/frontend/src/pages/residents/ResidentsList.tsx)
- **Formulário:** [apps/frontend/src/pages/residents/ResidentForm.tsx](../../apps/frontend/src/pages/residents/ResidentForm.tsx)
- **Prontuário:** [apps/frontend/src/pages/residents/ResidentMedicalRecord.tsx](../../apps/frontend/src/pages/residents/ResidentMedicalRecord.tsx)
- **Visualização:** [apps/frontend/src/pages/residents/ResidentView.tsx](../../apps/frontend/src/pages/residents/ResidentView.tsx)
- **Impressão:** [apps/frontend/src/pages/residents/ResidentPrintView.tsx](../../apps/frontend/src/pages/residents/ResidentPrintView.tsx)
- **API:** [apps/frontend/src/api/residents.api.ts](../../apps/frontend/src/api/residents.api.ts)
- **Componentes:** [apps/frontend/src/components/residents/](../../apps/frontend/src/components/residents/)
  - `ResidentDocumentsModal.tsx` - Modal de gestão de documentos
  - `ResidentHistoryDrawer.tsx` - Drawer de histórico de alterações
  - `ResidentDocuments.tsx` - Componente de upload de documentos

## Modelo de Dados

### Resident

```prisma
model Resident {
  id       String @id @default(uuid()) @db.Uuid
  tenantId String @db.Uuid

  // Status
  status String @default("Ativo") // Ativo | Inativo | Falecido

  // 1. Dados Pessoais (18 campos)
  fullName    String                // Nome completo *
  socialName  String?               // Nome social
  cpf         String                // CPF *
  rg          String?               // RG
  rgIssuer    String?               // Órgão expedidor
  education   String?               // Escolaridade
  profession  String?               // Profissão
  cns         String?               // Cartão Nacional de Saúde
  gender      Gender                // MASCULINO | FEMININO | OUTRO | NAO_INFORMADO *
  civilStatus CivilStatus?          // SOLTEIRO | CASADO | DIVORCIADO | VIUVO | UNIAO_ESTAVEL
  religion    String?               // Religião
  birthDate   DateTime @db.Date     // Data de nascimento *
  nationality String @default("Brasileira")
  birthCity   String?               // Naturalidade
  birthState  String?               // UF de nascimento
  motherName  String?               // Nome da mãe
  fatherName  String?               // Nome do pai
  fotoUrl     String?               // URL da foto no MinIO

  // 2. Endereços (16 campos x 2)
  // Endereço Atual
  currentCep        String?
  currentState      String?
  currentCity       String?
  currentStreet     String?
  currentNumber     String?
  currentComplement String?
  currentDistrict   String?
  currentPhone      String?

  // Endereço de Procedência
  originCep        String?
  originState      String?
  originCity       String?
  originStreet     String?
  originNumber     String?
  originComplement String?
  originDistrict   String?
  originPhone      String?

  // 3. Contatos de Emergência (JSON Array)
  emergencyContacts Json @default("[]")
  // Estrutura: [{ "name": "...", "phone": "...", "relationship": "..." }]

  // 4. Responsável Legal (12 campos)
  legalGuardianName       String?
  legalGuardianCpf        String?
  legalGuardianRg         String?
  legalGuardianPhone      String?
  legalGuardianType       String? // curador | procurador | responsável convencional
  legalGuardianCep        String?
  legalGuardianState      String?
  legalGuardianCity       String?
  legalGuardianStreet     String?
  legalGuardianNumber     String?
  legalGuardianComplement String?
  legalGuardianDistrict   String?

  // 5. Admissão (6 campos)
  admissionDate       DateTime  @db.Date // Data de admissão *
  admissionType       String?   // Voluntária | Involuntária | Judicial
  admissionReason     String?   // Motivo da admissão
  admissionConditions String?   // Condições na admissão
  dischargeDate       DateTime? @db.Date // Data de desligamento
  dischargeReason     String?   // Motivo do desligamento

  // 6. Saúde - Dados Estáveis (6 campos)
  bloodType              BloodType @default(NAO_INFORMADO)
  height                 Decimal?  @db.Decimal(5, 2) // Altura em metros
  weight                 Decimal?  @db.Decimal(5, 1) // Peso em kg
  dependencyLevel        String?   // Grau I | Grau II | Grau III
  mobilityAid            Boolean?  // Necessita auxílio para mobilidade
  medicationsOnAdmission String?   // Medicamentos na admissão

  // 7. Convênios / Planos de Saúde (JSON Array)
  healthPlans Json @default("[]")
  // Estrutura: [{ "name": "...", "cardNumber": "...", "cardUrl": "..." }]

  // 8. Pertences (JSON Array)
  belongings Json @default("[]")
  // Estrutura: ["Óculos", "Aparelho auditivo", "Relógio", ...]

  // 9. Acomodação
  roomId String? @db.Uuid
  bedId  String? @unique @db.Uuid

  // Auditoria
  createdAt DateTime  @default(now()) @db.Timestamptz(3)
  updatedAt DateTime  @updatedAt @db.Timestamptz(3)
  deletedAt DateTime? @db.Timestamptz(3)

  // Relações (14+ módulos integrados)
  tenant                    Tenant                     @relation(fields: [tenantId], references: [id])
  bed                       Bed?                       @relation(fields: [bedId], references: [id])
  dailyRecords              DailyRecord[]
  prescriptions             Prescription[]
  medicationAdministrations MedicationAdministration[]
  sosAdministrations        SOSAdministration[]
  vaccinations              Vaccination[]
  vitalSigns                VitalSign[]
  clinicalNotes             ClinicalNote[]
  clinicalNoteHistory       ClinicalNoteHistory[]
  residentDocuments         ResidentDocument[]
  clinicalProfile           ClinicalProfile?
  allergies                 Allergy[]
  conditions                Condition[]
  dietaryRestrictions       DietaryRestriction[]
  clinicalNoteDocuments     ClinicalNoteDocument[]

  // Índices
  @@unique([tenantId, cpf])
  @@index([tenantId, status])
  @@index([tenantId, admissionDate(sort: Desc)])
  @@index([deletedAt])
  @@map("residents")
}
```

### Enums

```prisma
enum Gender {
  MASCULINO
  FEMININO
  OUTRO
  NAO_INFORMADO
}

enum CivilStatus {
  SOLTEIRO
  CASADO
  DIVORCIADO
  VIUVO
  UNIAO_ESTAVEL
}

enum BloodType {
  A_POSITIVO
  A_NEGATIVO
  B_POSITIVO
  B_NEGATIVO
  AB_POSITIVO
  AB_NEGATIVO
  O_POSITIVO
  O_NEGATIVO
  NAO_INFORMADO
}
```

## Endpoints da API

| Método | Endpoint | Permissão | Descrição |
|--------|----------|-----------|-----------|
| POST | `/api/residents` | `CREATE_RESIDENTS` | Criar novo residente |
| GET | `/api/residents` | `VIEW_RESIDENTS` | Listar com filtros e paginação |
| GET | `/api/residents/:id` | `VIEW_RESIDENTS` | Buscar por ID com URLs assinadas |
| PATCH | `/api/residents/:id` | `UPDATE_RESIDENTS` | Atualizar residente |
| DELETE | `/api/residents/:id` | `DELETE_RESIDENTS` | Soft delete |
| GET | `/api/residents/:id/history` | `VIEW_RESIDENTS` | Buscar histórico completo de alterações |
| GET | `/api/residents/:id/history/:versionNumber` | `VIEW_RESIDENTS` | Buscar versão específica do histórico |
| GET | `/api/residents/stats/overview` | `VIEW_REPORTS` | Estatísticas gerais |
| POST | `/api/residents/:id/transfer-bed` | `UPDATE_RESIDENTS` | Transferir residente para outro leito |

### Query Parameters (GET /residents)

- `search` (string): Busca por nome completo ou CPF
- `status` (string): Filtrar por status (Ativo, Inativo, Falecido)
- `gender` (enum): Filtrar por gênero
- `page` (number): Número da página (padrão: 1)
- `limit` (number): Itens por página (padrão: 10, máx: 100)
- `sortBy` (string): Campo para ordenação (padrão: fullName)
- `sortOrder` (asc|desc): Direção da ordenação (padrão: asc)

**Filtros implementados no DTO mas não usados no frontend:**
- `dataAdmissaoInicio`, `dataAdmissaoFim` (ISO 8601): Range de datas de admissão
- `idadeMinima`, `idadeMaxima` (number): Range de idade

### Resposta de Listagem

```typescript
{
  data: Resident[],
  meta: {
    total: number,
    page: number,
    limit: number,
    totalPages: number
  }
}
```

### Resposta de Estatísticas

```typescript
{
  total: number,
  active: number,
  inactive: number,
  byDependencyLevel: {
    grauI: number,
    grauII: number,
    grauIII: number
  },
  byGender: {
    masculino: number,
    feminino: number
  }
}
```

### Resposta de Histórico (GET /residents/:id/history)

```typescript
{
  resident: {
    id: string,
    fullName: string,
    cpf: string,
    versionNumber: number,
    status: string,
    deletedAt: string | null
  },
  history: [
    {
      id: string,
      versionNumber: number,
      changeType: 'CREATE' | 'UPDATE' | 'DELETE',
      changeReason: string,
      changedFields: string[],
      changedAt: string,
      changedBy: {
        id: string,
        name: string,
        email: string
      }
    }
  ],
  totalVersions: number
}
```

**Nota:** Os snapshots `previousData` e `newData` não são retornados por padrão para evitar payload muito grande. Use o endpoint de versão específica para obter snapshots completos.

### Resposta de Versão Específica (GET /residents/:id/history/:versionNumber)

```typescript
{
  id: string,
  versionNumber: number,
  changeType: 'CREATE' | 'UPDATE' | 'DELETE',
  changeReason: string,
  changedFields: string[],
  previousData: object | null,  // Snapshot completo ANTES (null em CREATE)
  newData: object,              // Snapshot completo DEPOIS
  changedAt: string,
  changedBy: {
    id: string,
    name: string,
    email: string
  }
}
```

### Resposta de Transferência de Leito (POST /residents/:id/transfer-bed)

**Request Body:**

```typescript
{
  toBedId: string,           // UUID do leito destino
  reason: string,            // Motivo da transferência (min 10 chars)
  transferredAt?: string     // ISO 8601, opcional (default: now)
}
```

**Response:**

```typescript
{
  resident: {
    id: string,
    fullName: string,
    bedId: string,
    bed: {
      id: string,
      code: string,
      status: string,
      room: { /* hierarquia completa */ }
    }
  },
  transferHistory: {
    id: string,
    residentId: string,
    fromBedId: string,
    toBedId: string,
    reason: string,
    transferredAt: string,
    transferredBy: string,
    fromBed: { /* dados completos */ },
    toBed: { /* dados completos */ },
    user: { id, name, email }
  },
  message: string  // "Residente transferido de X para Y com sucesso"
}
```

## Regras de Negócio

### Validações na Criação

1. **Limite de Residentes**
   - Valida `maxResidents` do plano ativo do tenant
   - Bloqueia criação se limite atingido
   - Mensagem: "Limite de residentes atingido para o plano atual"

2. **CPF Único**
   - Constraint: `@@unique([tenantId, cpf])`
   - Valida na criação e atualização
   - Permite null (residentes sem CPF)

3. **Validação de CPF**
   - Algoritmo de validação de dígitos verificadores
   - Implementado no DTO: `validarCPF()` custom decorator

4. **Acomodação**
   - Valida existência de quarto/leito
   - Previne dupla ocupação de leitos
   - Sincroniza status do leito (Disponível → Ocupado)
   - Ao mudar de leito: libera leito antigo (Ocupado → Disponível)

5. **Campos Obrigatórios**
   - `fullName` (min 3 caracteres)
   - `cpf` (com validação)
   - `gender` (enum)
   - `birthDate` (ISO 8601)
   - `admissionDate` (ISO 8601)
   - `tenantId` (UUID)

### Validações na Atualização

1. **CPF Único (exceto próprio)**
   - Permite manter o próprio CPF
   - Valida duplicata contra outros residentes

2. **Mudança de Acomodação**
   - Libera leito antigo automaticamente
   - Atualiza status dos leitos envolvidos
   - Log detalhado das mudanças

3. **Atualização Parcial**
   - Apenas campos enviados são atualizados
   - Campos omitidos permanecem inalterados

### Upload de Foto

1. **Processamento**
   - Upload para MinIO bucket `photos`
   - 3 versões geradas: original, medium (300x300), small (100x100)
   - Formatos: JPEG, PNG, WebP
   - Tamanho máximo: 5MB

2. **Segurança**
   - URLs assinadas com expiração temporária (3600s)
   - Geradas on-the-fly no método `findOne()`
   - Separação por tenant no bucket

3. **Armazenamento**
   - Campo `fotoUrl`: Caminho base no MinIO
   - Estrutura: `photos/{tenantId}/{residentId}/original.jpg`

### Soft Delete

- Campo `deletedAt` marca exclusão lógica
- Dados mantidos para auditoria e compliance
- Queries filtram automaticamente `deletedAt IS NULL`
- CPF liberado para reutilização (unique ignora deletados)

### Multi-Tenancy

- Todos os dados isolados por `tenantId`
- Validação automática em todas as queries
- Índices otimizados com `tenantId` como prefixo

## Integrações com Outros Módulos

### Módulos Relacionados (14+)

1. **Daily Records** (Registros Diários)
   - Relação: `1:n`
   - Tipos: Higiene, Alimentação, Hidratação, Monitoramento, etc.
   - Exibição: Tab 2 do prontuário

2. **Prescriptions** (Prescrições Médicas)
   - Relação: `1:n`
   - Medicamentos contínuos e SOS
   - Exibição: Tab 3 do prontuário

3. **Vital Signs** (Sinais Vitais)
   - Relação: `1:n`
   - PA, FC, Temperatura, SpO2, Glicemia
   - Exibição: Tab 4 do prontuário + último monitoramento na tab 2

4. **Vaccinations** (Vacinações)
   - Relação: `1:n`
   - Histórico de vacinas com comprovantes
   - Exibição: Tab 5 do prontuário

5. **Clinical Notes** (Evoluções Clínicas)
   - Relação: `1:n`
   - Método SOAP por profissão
   - Exibição: Tab 6 do prontuário

6. **Clinical Profile** (Perfil Clínico)
   - Relação: `1:1` (opcional)
   - Dados clínicos evolutivos
   - Exibição: Tab 7 do prontuário

7. **Allergies** (Alergias)
   - Relação: `1:n`
   - Tabela dedicada
   - Exibição: Tab 7 do prontuário + indicadores na tab 1

8. **Conditions** (Condições Crônicas)
   - Relação: `1:n`
   - Diagnósticos ativos
   - Exibição: Tab 7 do prontuário + indicadores na tab 1

9. **Dietary Restrictions** (Restrições Alimentares)
   - Relação: `1:n`
   - Dietas especiais
   - Exibição: Tab 7 do prontuário + indicadores na tab 1

10. **Resident Documents** (Documentos)
    - Relação: `1:n`
    - Upload de documentos do residente
    - Exibição: Tab 8 do prontuário + modal independente (`ResidentDocumentsModal`)

11. **Bed** (Leito)
    - Relação: `1:1` (opcional)
    - Sincronização automática de status
    - Exibição: Aba 4 do formulário + cabeçalho do prontuário

12. **Medication Administrations** (Administrações)
    - Relação: `1:n`
    - Horários de medicação aplicados
    - Exibição: Integrado às prescrições

13. **SOS Administrations** (Medicações SOS)
    - Relação: `1:n`
    - Administrações pontuais
    - Exibição: Integrado às prescrições

14. **Clinical Note Documents** (Documentos Tiptap)
    - Relação: `1:n`
    - Documentos de evolução clínica
    - Exibição: Tab 6 do prontuário

### Hierarquia de Acomodação

Retornada automaticamente em `findOne()` e `findAll()`:

```typescript
{
  bed: {
    id: "...",
    number: "01",
    status: "Ocupado",
    room: {
      id: "...",
      number: "101",
      floor: {
        id: "...",
        number: 1,
        name: "Térreo",
        building: {
          id: "...",
          name: "Edifício Principal"
        }
      }
    }
  }
}
```

## Frontend - Estrutura de Páginas

### ResidentsList (Listagem)

**Funcionalidades:**
- Cards de estatísticas (Total, Ativos, Inativos, Grau de Dependência)
- Filtros: busca por nome/CPF, status
- Tabela com: Foto, Nome, CPF, Idade, Acomodação, Data de Admissão, Status
- Menu de ações: Visualizar, Prontuário, Editar, Documentos, Imprimir, Remover
- Paginação com navegação
- Botão "Novo Residente" (verifica permissão)
- **Detecção automática de navegação:** Abre modal de documentos automaticamente após criação

**Componentes:**
- `ResidentsList.tsx` (página principal)
- `ResidentDocumentsModal` (modal de gestão de documentos)
- `PhotoViewer` (avatar do residente)
- `ConfirmDialog` (confirmação de exclusão)

### ResidentForm (Formulário)

**4 Abas:**

1. **Dados & Contatos**
   - Upload de foto (PhotoUploadNew)
   - Dados pessoais (19 campos)
   - Contatos de emergência (array dinâmico)

2. **Endereços & Responsável**
   - Endereço atual (8 campos + busca ViaCEP)
   - Endereço de procedência (condicional)
   - Dados do responsável legal (13 campos)

3. **Saúde & Convênios**
   - Dados antropométricos (tipo sanguíneo, altura, peso)
   - Grau de dependência
   - Checkbox de auxílio à mobilidade
   - Medicamentos na admissão (badges)
   - Convênios (array dinâmico com upload de carteirinha)

4. **Admissão & Acomodação**
   - Data de admissão, tipo, motivo, condições
   - Data de desligamento, motivo
   - Pertences (badges)
   - Seletor de leito (BedSearchCombobox)

**Gestão de Documentos:**
- Removida da aba 5 do formulário
- Agora via modal independente (`ResidentDocumentsModal`)
- Acessível via:
  - Modal automático após criação do residente
  - Botão "Documentos" na lista de residentes (menu dropdown)
  - Tab "Documentos" no prontuário médico
- **Vantagem:** Upload de documentos NÃO cria histórico (ResidentHistory)

**Validações:**
- CPF: Validação de dígitos verificadores
- CNS: Validação de formato
- Campos obrigatórios marcados com *
- Validação em tempo real com feedback visual

**Funcionalidades Especiais:**
- Busca de CEP automática (ViaCEP API)
- Conversão de dados (português → inglês para backend)
- Mensagens de progresso de upload
- Modo leitura (readOnly) para visualização

### ResidentMedicalRecord (Prontuário)

**8 Tabs Integradas:**

1. **Dados Cadastrais**
   - Foto, nome, idade, tempo de instituição
   - Acomodação (prédio → andar → quarto → leito)
   - CPF, RG, gênero, estado civil, religião
   - Contatos de emergência (carrossel)
   - Responsável legal
   - Dados de saúde (tipo sanguíneo, altura, peso)

2. **Registros Diários**
   - Navegação entre datas (anterior/próximo/hoje)
   - Timeline visual com cards coloridos
   - 10 tipos de registros
   - Último monitoramento vital destacado

3. **Prescrições**
   - Lista de prescrições ativas
   - Dados do prescritor (médico, CRM)
   - Medicamentos contínuos e SOS

4. **Sinais Vitais**
   - Histórico de medições
   - Gráficos de evolução (se implementado)
   - Alertas de valores anormais

5. **Vacinações**
   - Component: `VaccinationList`
   - Histórico de vacinas aplicadas

6. **Evoluções Clínicas**
   - Component: `ClinicalNotesList`
   - Método SOAP por profissão

7. **Perfil Clínico**
   - Component: `ClinicalProfileTab`
   - Alergias (badges)
   - Condições crônicas (badges)
   - Restrições alimentares (badges)
   - Estado de saúde, necessidades especiais

8. **Documentos**
   - Component: `HealthDocumentsTab`
   - Upload e visualização de documentos

**Navegação:**
- Breadcrumb: Residentes → Nome do Residente
- Tabs fixas na lateral esquerda
- Botões de ação: Editar, Imprimir, Fechar

## Componentes Reutilizáveis

**Localização:** [apps/frontend/src/components/residents/](../../apps/frontend/src/components/residents/)

1. **ResidentDocumentsModal.tsx** ⭐ NOVO
   - Modal independente para gestão de documentos
   - Abre automaticamente após criação de residente
   - Acessível via botão "Documentos" na lista
   - **Props:** `isOpen`, `onClose`, `residentId`, `residentName`
   - **Vantagem:** Upload NÃO cria histórico (ResidentHistory)

2. **ResidentHistoryDrawer.tsx**
   - Drawer lateral com histórico de alterações
   - Exibe versões anteriores com diff visual
   - Mostra usuário, data e motivo de cada alteração

3. **ResidentDocuments.tsx**
   - Componente de upload de documentos (usado dentro do modal)
   - Categorias: Cartão Convênio, Comprovante de Residência, Documentos do Responsável, etc.

4. **AddressFields.tsx**
   - Campos de endereço reutilizáveis
   - Integração com ViaCEP

5. **PreRegistrationModal.tsx**
   - Modal de pré-cadastro rápido

6. **ResidentSelectionGrid.tsx**
   - Grade de seleção de residentes (usado em outros módulos)

7. **PhotoUploadNew** (genérico)
   - Upload com preview e crop
   - Redimensionamento automático

8. **BedSearchCombobox** (genérico)
   - Busca de leito com autocomplete
   - Hierarquia visual (Prédio > Andar > Quarto > Leito)

## Fluxos de Trabalho

### Fluxo de Criação de Residente com Documentos

#### Versão 1.1.0 - Otimizado para evitar histórico desnecessário

1. **Usuário preenche formulário** (4 abas)
   - Dados & Contatos
   - Endereços & Responsável
   - Saúde & Convênios
   - Admissão & Acomodação

2. **Usuário clica em "Salvar"**
   - Backend cria registro `Resident`
   - Backend cria entrada `ResidentHistory` (CREATE)
   - Frontend recebe `residentId` e `residentName`

3. **Redirecionamento inteligente**
   - Se EDIÇÃO: Volta para lista (`/dashboard/residentes`)
   - Se CRIAÇÃO: Navega com state:

     ```typescript
     navigate('/dashboard/residentes', {
       state: {
         openDocumentsModal: true,
         residentId: response.data.id,
         residentName: response.data.fullName,
       }
     })
     ```

4. **Modal de documentos abre automaticamente**
   - `ResidentsList` detecta `location.state` via `useEffect`
   - Abre `ResidentDocumentsModal`
   - Usuário pode fazer upload de documentos
   - Cada upload chama `POST /residents/:id/documents` (tabela `ResidentDocument`)
   - **NÃO dispara `PATCH /residents/:id`** → Sem histórico desnecessário

5. **Acesso posterior aos documentos**
   - Botão "Documentos" no menu dropdown da lista
   - Tab "Documentos" no prontuário médico

#### Benefícios

- ✅ Elimina histórico desnecessário na criação
- ✅ Fluxo intuitivo (criou → adicionar docs?)
- ✅ Documentos separados da edição de dados cadastrais
- ✅ Modal reutilizável em múltiplos contextos

### Criptografia de Dados Sensíveis (LGPD - Camada 3)

#### Campos Criptografados

- `cpf` (Resident)
- `cns` (Cartão Nacional de Saúde)
- `legalGuardianCpf` (Responsável legal)

**Algoritmo:** AES-256-GCM com Scrypt KDF (derivação de chave por tenant)

**Nota:** Campos RG não são criptografados devido à sua baixa sensibilidade comparada ao CPF. O RG não é chave única nacional e sua criptografia aumentaria overhead desnecessariamente.

#### Middleware de Descriptografia

- Intercepta todas as queries Prisma
- Descriptografa automaticamente **SE `tenantId` estiver presente no resultado**
- ⚠️ **CRÍTICO:** Queries com `select` explícito **DEVEM incluir `tenantId: true`**

#### Exemplo de Query Correta

```typescript
this.prisma.resident.findMany({
  select: {
    id: true,
    tenantId: true, // ← OBRIGATÓRIO para descriptografia
    fullName: true,
    cpf: true, // Será descriptografado pelo middleware
    // ...
  }
})
```

#### Auditoria de Descriptografia (Dezembro/2025)

- ✅ `findOne()` - Usa `include`, tenantId vem automaticamente
- ✅ `findMany()` - Corrigido (linha 519) para incluir `tenantId: true`
- ✅ `create()`, `update()`, `delete()` - Não afetados (retornam objeto completo)

## Logs e Auditoria

### Eventos Auditados

- **CREATE**: Criação de residente
- **UPDATE**: Atualização de dados
- **DELETE**: Soft delete

### Informações Registradas

- Usuário que executou a ação (`userId`)
- Data/hora da operação
- Tipo de entidade (`RESIDENT`)
- ID do residente afetado
- Dados alterados (se aplicável)

### Logs Estruturados (Winston)

```typescript
this.logger.log('Residente criado com sucesso', {
  residentId: resident.id,
  tenantId,
  userId,
  cpf: resident.cpf
});
```

## Performance e Otimizações

### Índices no Banco

```prisma
@@unique([tenantId, cpf])              // Validação única
@@index([tenantId, status])            // Filtro de status
@@index([tenantId, admissionDate(sort: Desc)]) // Ordenação
@@index([deletedAt])                   // Soft delete
```

### Queries Otimizadas

1. **findAll()**: Select parcial de campos (evita carregar todos os 70+ campos)
2. **Paginação obrigatória**: Previne queries sem limite
3. **URLs assinadas on-the-fly**: Evita armazenar URLs expiradas
4. **Queries paralelas**: Stats calculados em paralelo no frontend

### Frontend

- **React Query**: Cache automático de 5 minutos
- **Lazy Loading**: Documentos carregados apenas quando tab é acessada
- **Debounce**: Busca textual com 500ms de delay
- **Imagens otimizadas**: 3 tamanhos (original, medium, small)

## Compliance e Regulamentações

### RDC 502/2021 ANVISA

**Art. 33** - Prontuário do Residente:
> A ILPI deve manter prontuário individual de cada residente, com dados pessoais, familiares, jurídicos, de saúde e sociais.

**Campos Implementados:**
- ✅ Dados pessoais completos
- ✅ Dados familiares (mãe, pai, contatos de emergência)
- ✅ Dados jurídicos (responsável legal, tipo de tutela)
- ✅ Dados de saúde (integração com módulos médicos)
- ✅ Dados sociais (estado civil, religião, profissão)

### Estatuto da Pessoa Idosa

**Art. 50, XV** - Prontuário Médico:
> É obrigatória a manutenção de prontuário individual de cada residente, com dados sobre sua identificação, saúde e evolução.

**Implementação:**
- ✅ Prontuário individualizado (ResidentMedicalRecord)
- ✅ Identificação completa (CPF, RG, CNS)
- ✅ Dados de saúde (sinais vitais, prescrições, vacinas)
- ✅ Evolução (evoluções clínicas, registros diários)

### Lei Geral de Proteção de Dados (LGPD)

- ✅ Soft delete (mantém dados para auditorias)
- ✅ Multi-tenancy (isolamento de dados)
- ✅ Controle de acesso por permissões
- ✅ Auditoria de todas as operações
- ✅ Consentimento implícito (admissão na ILPI)

## Limitações e Melhorias Futuras

### Implementado
- ✅ CRUD completo
- ✅ Upload de foto
- ✅ Prontuário integrado
- ✅ Soft delete
- ✅ Validações robustas

### Pendente (Backlog)
- [ ] Busca textual avançada (full-text search)
- [ ] Filtros avançados (idade, data de admissão)
- [ ] Exportação em PDF/Excel
- [ ] Histórico de alterações detalhado (campo a campo)
- [ ] QR Code no prontuário (acesso rápido)
- [ ] Tags/Categorias customizáveis
- [ ] Alertas de aniversários
- [ ] Integração com e-SUS/PEC

## Referências

- [CHANGELOG - 2025-11-15](../../CHANGELOG.md#2025-11-15---módulo-de-residentes)
- [Arquitetura de Multi-Tenancy](../architecture/multi-tenancy.md)
- [Arquitetura de Storage](../architecture/file-storage.md)
- [Schema do Banco](../architecture/database-schema.md)
- [Módulo de Registros Diários](daily-records.md)
- [Módulo de Prescrições](prescriptions.md)
- [Módulo de Sinais Vitais](vital-signs.md)
- [Módulo de Vacinação](vaccinations.md)
- [Módulo de Evoluções Clínicas](clinical-notes.md)

---

**Desenvolvedor:** Emanuel (Dr. E.) + Claude Sonnet 4.5
