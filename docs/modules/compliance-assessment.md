# Módulo: Autodiagnóstico RDC 502/2021

## Visão Geral

O módulo de **Autodiagnóstico RDC 502/2021** permite que instituições de longa permanência para idosos (ILPIs) realizem avaliações periódicas de conformidade regulatória baseadas no Roteiro Objetivo de Inspeção da ANVISA.

**Características principais:**
- ✅ 37 indicadores regulatórios da RDC 502/2021
- ✅ Sistema de pontuação 0-5 pontos por questão
- ✅ Classificação automática: Regular, Parcial ou Irregular
- ✅ Identificação de não conformidades críticas
- ✅ Auto-save com debounce (500ms)
- ✅ Histórico de avaliações com comparação temporal
- ✅ Exportação de relatórios em PDF
- ✅ Multi-tenancy com isolamento de dados

---

## Arquitetura

### Database Schema

**Schema Público (`public`)** - Questões regulatórias (compartilhadas):
```prisma
model ComplianceQuestionVersion {
  id              String   @id @default(uuid())
  regulationName  String   // "RDC 502/2021"
  versionNumber   Int
  effectiveDate   DateTime
  expiresAt       DateTime? // null = versão atual
  description     String?
  questions       ComplianceQuestion[]
}

model ComplianceQuestion {
  id               String  @id @default(uuid())
  versionId        String
  questionNumber   Int     // 1-37
  questionText     String
  criticalityLevel String  // "C" (crítica) ou "NC" (não crítica)
  legalReference   String
  category         String? // Ex: "Documentação e Regularização"
  responseOptions  Json    // Array de {points, text}
}
```

**Schema Tenant (`tenant_*`)** - Dados isolados por ILPI:
```prisma
model ComplianceAssessment {
  id                    String   @id @default(uuid())
  tenantId              String
  versionId             String
  assessmentDate        DateTime
  performedBy           String?
  status                String   // DRAFT, COMPLETED, ARCHIVED
  totalQuestions        Int
  questionsAnswered     Int
  questionsNA           Int
  applicableQuestions   Int
  totalPointsObtained   Float
  totalPointsPossible   Float
  compliancePercentage  Float
  complianceLevel       String   // REGULAR, PARCIAL, IRREGULAR
  criticalNonCompliant  Json?    // Array de não conformidades críticas
  notes                 String?
  responses             ComplianceAssessmentResponse[]
}

model ComplianceAssessmentResponse {
  id                    String  @id @default(uuid())
  assessmentId          String
  questionId            String
  questionNumber        Int
  selectedPoints        Int?
  selectedText          String?
  isNotApplicable       Boolean
  questionTextSnapshot  String  // Snapshot para auditoria
  criticalityLevel      String
  legalReference        String?
  observations          String?
}
```

**Justificativa de Separação:**
- Questões são regulatórias (públicas e imutáveis)
- Respostas contêm dados sensíveis do tenant (isolamento obrigatório)

---

## Backend API

### Endpoints

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/compliance-assessments/questions` | Buscar questões da versão atual | `VIEW_COMPLIANCE_DASHBOARD` |
| POST | `/compliance-assessments` | Criar novo autodiagnóstico | `MANAGE_COMPLIANCE_ASSESSMENT` |
| GET | `/compliance-assessments` | Listar autodiagnósticos (paginado) | `VIEW_COMPLIANCE_DASHBOARD` |
| GET | `/compliance-assessments/:id` | Buscar autodiagnóstico específico | `VIEW_COMPLIANCE_DASHBOARD` |
| POST | `/compliance-assessments/:id/responses` | Salvar resposta (auto-save) | `MANAGE_COMPLIANCE_ASSESSMENT` |
| POST | `/compliance-assessments/:id/complete` | Finalizar e calcular pontuação | `MANAGE_COMPLIANCE_ASSESSMENT` |
| GET | `/compliance-assessments/:id/report` | Gerar relatório detalhado (JSON) | `VIEW_COMPLIANCE_DASHBOARD` |
| GET | `/compliance-assessments/:id/pdf` | Exportar PDF | `VIEW_COMPLIANCE_DASHBOARD` |

### Algoritmo de Pontuação

Baseado no **Roteiro Objetivo de Inspeção ILPI da ANVISA** (Doc 11.1, Versão 1.2):

```typescript
// 1. Filtrar questões aplicáveis
const applicableQuestions = totalQuestions - questionsNA

// 2. Calcular pontuação possível
const totalPointsPossible = applicableQuestions * 3

// 3. Somar pontuação obtida (0-5 por questão)
const totalPointsObtained = sum(responses.selectedPoints)

// 4. Calcular percentual
const compliancePercentage = (totalPointsObtained / totalPointsPossible) * 100

// 5. Classificar
if (compliancePercentage >= 75) {
  complianceLevel = "REGULAR"
} else if (compliancePercentage >= 50) {
  complianceLevel = "PARCIAL"
} else {
  complianceLevel = "IRREGULAR"
}

// 6. Identificar não conformidades críticas
criticalNonCompliant = responses.filter(r =>
  r.criticalityLevel === "C" && r.selectedPoints < 3
)
```

**Observação importante:** Conforme ANVISA, a pontuação possível é baseada em **3 pontos** por questão (não 5), representando conformidade mínima aceitável.

---

## Frontend

### Estrutura de Arquivos

```
apps/frontend/src/
├── pages/compliance-assessments/
│   ├── AssessmentListPage.tsx       # Lista de autodiagnósticos
│   ├── AssessmentFormPage.tsx       # Formulário de preenchimento
│   └── AssessmentResultPage.tsx     # Dashboard de resultados
├── components/compliance-assessments/
│   ├── QuestionCard.tsx             # Card de questão individual
│   ├── AssessmentProgressBar.tsx    # Barra de progresso
│   ├── ResultsDashboard.tsx         # Dashboard de métricas
│   └── CriticalIssuesList.tsx       # Lista de não conformidades críticas
├── hooks/
│   └── useComplianceAssessments.ts  # React Query hooks
└── api/
    └── compliance-assessments.api.ts # API client
```

### Rotas

```typescript
/dashboard/conformidade/autodiagnostico
├── /                    # Lista de autodiagnósticos
├── /:id                 # Formulário de preenchimento
└── /:id/result          # Resultados
```

### Features Principais

#### 1. Auto-Save
- Debounce de 500ms após cada alteração
- Salva automaticamente: pontuação, texto selecionado, observações, flag N/A
- Feedback visual (ícone verde "Resposta salva automaticamente")

#### 2. Navegação Inteligente
- Ao retomar rascunho, navega automaticamente para primeira questão não respondida
- Botão "Concluir" na última questão chama mesma função de finalizar
- Scroll suave ao trocar de questão

#### 3. Validações
- Impede finalizar se há questões não respondidas
- Toast com número de questões faltando
- Alerta visual em questões críticas com pontuação < 3

#### 4. Dashboard de Resultados
- **Visão Geral:** Métricas gerais e gráficos
- **Não Conformidades Críticas:** Lista detalhada com alertas
- **Detalhes por Questão:** Todas as 37 questões com respostas

---

## Permissões

### Grupos com Acesso

| Perfil | Permissão | Descrição |
|--------|-----------|-----------|
| **ADMINISTRATOR** | `MANAGE_COMPLIANCE_ASSESSMENT` | Criar, editar, finalizar autodiagnósticos |
| **RESPONSIBLE_TECHNICIAN** | `MANAGE_COMPLIANCE_ASSESSMENT` | Criar, editar, finalizar autodiagnósticos |
| **MANAGER** | `VIEW_COMPLIANCE_DASHBOARD` | Apenas visualizar relatórios (somente leitura) |

### Feature Flag

**Feature:** `autodiagnostico_rdc`

**Planos com acesso:**
- ❌ **Essencial:** Bloqueado
- ✅ **Profissional:** Disponível
- ✅ **Premium:** Disponível

---

## Auditoria

Todas as ações críticas são auditadas:

| Ação | Entity | Event |
|------|--------|-------|
| Criar autodiagnóstico | `COMPLIANCE_ASSESSMENT` | `CREATE` |
| Salvar resposta | `COMPLIANCE_ASSESSMENT` | `UPDATE` |
| Finalizar autodiagnóstico | `COMPLIANCE_ASSESSMENT` | `UPDATE` |
| Exportar PDF | `COMPLIANCE_ASSESSMENT` | `READ` |

---

## Versionamento de Questões

O sistema suporta versionamento da RDC para futuras atualizações:

```typescript
// Versão atual (sempre usada ao criar novo assessment)
version = ComplianceQuestionVersion.findOne({ expiresAt: null })

// Assessments antigos mantêm referência à versão usada na época
assessment.versionId = "uuid-da-versao-1.0"
```

**Benefício:** Quando a ANVISA atualizar a RDC, podemos criar nova versão sem afetar assessments históricos.

---

## Casos de Uso

### 1. Criar Novo Autodiagnóstico

**Ator:** Administrador ou Responsável Técnico

**Fluxo:**
1. Acessa Hub de Conformidade
2. Clica em "Novo Autodiagnóstico"
3. Sistema cria assessment em status `DRAFT`
4. Navega para formulário com questão 1

### 2. Preencher Questões

**Ator:** Administrador ou Responsável Técnico

**Fluxo:**
1. Para cada questão:
   - Lê o indicador e referência legal
   - Seleciona pontuação (0-5) ou marca como N/A
   - Opcionalmente adiciona observações
   - Sistema salva automaticamente após 500ms
2. Usa botões "Anterior"/"Próxima" para navegar
3. Pode sair a qualquer momento (rascunho salvo)

### 3. Continuar Rascunho

**Ator:** Administrador ou Responsável Técnico

**Fluxo:**
1. Acessa lista de autodiagnósticos
2. Clica em "Continuar" em rascunho existente
3. Sistema navega para primeira questão não respondida
4. Continua preenchimento

### 4. Finalizar e Visualizar Resultados

**Ator:** Administrador ou Responsável Técnico

**Fluxo:**
1. Após responder todas as 37 questões:
   - Clica em "Finalizar Autodiagnóstico" (topo) OU
   - Clica em "Concluir" (última questão)
2. Sistema valida completude
3. Calcula pontuação e classifica
4. Identifica não conformidades críticas
5. Navega para dashboard de resultados

### 5. Exportar PDF

**Ator:** Administrador, RT ou Gerente

**Fluxo:**
1. Acessa resultados de autodiagnóstico finalizado
2. Clica em "Exportar PDF"
3. Sistema gera PDF com layout oficial
4. Download automático do arquivo

---

## Extensibilidade Futura

### Roadmap de Melhorias

1. **Notificações Automáticas**
   - Lembrete de avaliação periódica (a cada 6 meses)
   - Alerta de não conformidades críticas detectadas

2. **Dashboard Executivo**
   - Visão agregada de múltiplas ILPIs (para gestores de rede)
   - Benchmarking com médias do setor

3. **Integração com Planos de Ação**
   - Vincular não conformidades críticas a tarefas corretivas
   - Acompanhamento de prazo e status

4. **IA/ML**
   - Sugestões de melhoria baseadas em histórico
   - Predição de riscos de não conformidade

---

## Troubleshooting

### Problema: Permissão negada ao acessar

**Causa:** Usuário não tem permissão `MANAGE_COMPLIANCE_ASSESSMENT`

**Solução:**
1. Verificar perfil do usuário (deve ser ADMINISTRATOR ou RESPONSIBLE_TECHNICIAN)
2. Verificar se permissão está no `position-profiles.config.ts`
3. Re-login após mudança de permissões

### Problema: Feature bloqueada

**Causa:** Plano do tenant é Essencial

**Solução:**
1. Verificar plano em Settings > Assinatura
2. Fazer upgrade para Profissional ou Premium

### Problema: Erro ao finalizar

**Causa:** Questões não respondidas

**Solução:**
1. Verificar toast com número de questões faltando
2. Usar barra de progresso para identificar lacunas
3. Preencher todas antes de finalizar

---

## Referências

- **ANVISA - RDC 502/2021:** Dispõe sobre o funcionamento de ILPI
- **Roteiro de Inspeção ILPI:** Doc 11.1, Versão 1.2 (05/12/2022)
- **Fonte das 37 questões:** `/docs/ideias/roteiro_inspecao_ilpi_anvisa.md`

---

## Contatos

**Desenvolvimento:**
- Módulo implementado em: Janeiro/2026
- Desenvolvedor: Claude Code + Dr. E. (Emanuel)
- Status: ✅ Produção

**Suporte:**
- Para dúvidas técnicas: Documentação interna
- Para questões regulatórias: Responsável Técnico da ILPI
