# TODO - Tarefas Ativas

**Última atualização:** 14/12/2025

> **Nota:** Este arquivo contém APENAS tarefas ativas e pendentes.
> Histórico completo de implementações está em [CHANGELOG.md](CHANGELOG.md).
> Backup do TODO antigo disponível em `todo.OLD.md`.

---

## 🔄 Em Andamento

_(Nenhuma tarefa em andamento no momento)_

---

## 📋 Pendentes

### 🔐 Versionamento e Auditoria Completa

**Plano Detalhado:** [docs/AUDIT-VERSIONING-IMPLEMENTATION-PLAN.md](docs/AUDIT-VERSIONING-IMPLEMENTATION-PLAN.md)

**Status Geral: 13/13 módulos BACKEND (100%) ✅** | **Testes E2E: 391/391 (100%) ✅** 🎉

**PRIORIDADE 1 - Conformidade Legal (RDC 502/2021):**

- [x] **Resident + ResidentHistory** ✅ Backend completo | Testes 100% OK | Frontend completo
- [x] **Prescription + PrescriptionHistory** ✅ Backend completo | Testes 100% OK | Frontend completo
- [x] **Medication + MedicationHistory** ✅ Backend completo | Testes 100% OK | Frontend parcial
- [x] **SOSMedication + SOSMedicationHistory** ✅ Backend completo | Testes 100% OK | Frontend pendente
- [x] **Vaccination + VaccinationHistory** ✅ Backend completo | Testes 100% OK | Frontend pendente
- [x] **User + UserHistory** ✅ Backend completo | Testes 100% OK | Frontend pendente

**PRIORIDADE 2 - Segurança Clínica:**

- [x] **Allergy + AllergyHistory** ✅ Backend completo | Testes 100% OK | Frontend pendente
- [x] **Condition + ConditionHistory** ✅ Backend completo | Testes 100% OK | Frontend pendente
- [x] **ClinicalProfile + ClinicalProfileHistory** ✅ Backend completo | Testes 100% OK | Frontend pendente
- [x] **DietaryRestriction + DietaryRestrictionHistory** ✅ Backend completo | Testes 100% OK | Frontend pendente

**PRIORIDADE 3 - Médio:**

- [x] **VitalSign + VitalSignHistory** ✅ Backend completo | Testes 100% OK | Frontend pendente

**Módulos Legados (já implementados):**

- [x] **DailyRecord + DailyRecordHistory** ✅ 25/25 testes E2E | Frontend completo
- [x] **ClinicalNote + ClinicalNoteHistory** ✅ Backend + Frontend completo
- [x] **Pop + PopHistory** ✅ Backend + Frontend completo

**Observações:**

- 🎊 **MARCO HISTÓRICO:** Total testes E2E versionamento: **391/391 (100%)** - TODOS PASSANDO!
- Backend: **13/13 módulos COMPLETOS (100%)** 🎉
- Testes E2E: **12/12 suites COMPLETAS (100%)** 🎉
- Frontend: **5/13 módulos com integração completa (38%)** - 🔄 Sprint 8 em progresso
  - ✅ User + UserHistory (API + Hook + Drawer)
  - ✅ Vaccination + VaccinationHistory (API + Hook)
  - ✅ GenericHistoryDrawer (componente reutilizável)
- **Relatório detalhado:** [docs/VERSIONING-IMPLEMENTATION-STATUS.md](docs/VERSIONING-IMPLEMENTATION-STATUS.md)
- **Guia de implementação:** [FRONTEND_VERSIONING_IMPLEMENTATION.md](FRONTEND_VERSIONING_IMPLEMENTATION.md)

**Correções Aplicadas (13/12/2025):**

- ✅ Prescription-versioning: Corrigido tenant slug duplicado + cleanup FK
- ✅ User-versioning: Corrigido JWT strategy (findFirst + campo sub)
- ✅ Todas as 391 testes E2E agora passam sem erros

---

### 🔐 Implementação LGPD - Segurança de Dados

**Plano Detalhado:** [docs/LGPD-DATA-SECURITY-IMPLEMENTATION.md](docs/LGPD-DATA-SECURITY-IMPLEMENTATION.md)

**Status Geral:** ✅ TODAS AS 3 CAMADAS IMPLEMENTADAS (100%)

**Camada 1 - Transport Layer (HTTPS/TLS):**
- [x] ✅ Certificado SSL configurado (Cloudflare/Let's Encrypt)
- [x] ✅ HTTPS obrigatório em produção

**Camada 2 - Storage Layer (MinIO SSE):**
- [x] ✅ Master Key AES-256 gerada (base64, 32 bytes)
- [x] ✅ Docker Compose MinIO atualizado com `MINIO_KMS_SECRET_KEY`
- [x] ✅ Criptografia automática habilitada (AES-256-GCM)
- [x] ✅ Testes validados (arquivos criptografados no disco, download funcionando)
- [x] ✅ Guia de configuração criado: [docs/MINIO-SSE-SETUP-GUIDE.md](docs/MINIO-SSE-SETUP-GUIDE.md)
- [x] ✅ Master Key backupeada em password manager

**Camada 3 - Database Layer (Prisma Middleware):**
- [x] ✅ Implementar Prisma Middleware de criptografia (AES-256-GCM + Scrypt KDF)
- [x] ✅ **FASE 1:** Resident (cpf, rg, cns, legalGuardianCpf, legalGuardianRg)
- [x] ✅ **FASE 2:** Condition (name, icd10Code, notes) + Allergy (allergen, reaction, notes) + ClinicalNote (subjective, objective, assessment, plan)
- [x] ✅ **FASE 3:** Prescription (notes) + Medication (instructions, notes) + DailyRecord (notes)
- [x] ✅ Testes validados (5/5 testes passando - criptografia, descriptografia, isolamento por tenant)
- [x] ✅ Documentação completa em [docs/LGPD-DATA-SECURITY-IMPLEMENTATION.md](docs/LGPD-DATA-SECURITY-IMPLEMENTATION.md)

**Conformidade Regulatória:**
- [x] ✅ LGPD Art. 46 - Criptografia em repouso (MinIO SSE-C)
- [x] ✅ LGPD Art. 46 - Criptografia em banco (Prisma Middleware - 7 modelos)
- [x] ✅ Isolamento criptográfico multi-tenant
- [x] ✅ Política de Privacidade atualizada ([docs/POLITICA-DE-PRIVACIDADE.md](docs/POLITICA-DE-PRIVACIDADE.md))
- [x] ✅ RIPD (Relatório de Impacto) documentado ([docs/RIPD-RELATORIO-DE-IMPACTO.md](docs/RIPD-RELATORIO-DE-IMPACTO.md))
- [x] ✅ Guia de Direitos do Titular ([docs/GUIA-DE-DIREITOS-DO-TITULAR.md](docs/GUIA-DE-DIREITOS-DO-TITULAR.md))

**Campos Criptografados (Total: 19 campos em 7 modelos):**
- Resident: 5 campos
- Condition: 3 campos
- Allergy: 3 campos
- ClinicalNote: 4 campos
- Prescription: 1 campo
- Medication: 2 campos
- DailyRecord: 1 campo

---

### Melhorias Prioritárias

**Módulo: Registros Diários**

- [ ] Implementar busca textual avançada em observações
- [ ] Criar templates de observações predefinidas
- [ ] Adicionar notificações push de ausência de registros críticos
- [ ] Implementar assinatura digital (CFM 1.821/2007)

**Módulo: Documentos Institucionais**

- [ ] Adicionar endpoint GET `/institutional-profile/documents/:id/history` para consultar histórico de versões

**Módulo: Evoluções Clínicas (Tiptap)**

- [ ] Adicionar numeração de páginas nos PDFs
- [ ] Implementar cabeçalho repetido em todas as páginas
- [ ] Adicionar suporte a imagens no editor Tiptap

**Módulo: POPs**

- [ ] Adicionar assinatura digital nos POPs (baixa prioridade)

---

## 🎯 Backlog (Futuro)

### Novas Funcionalidades

**Analytics e Relatórios**

- [ ] Dashboard analytics com métricas da ILPI
- [ ] Relatórios automatizados mensais (PDF)
- [ ] Gráficos de evolução de saúde dos residentes
- [ ] Exportação de dados em Excel/CSV

**Integrações**
- [ ] Integração com eSUS/PEC (Prontuário Eletrônico do Cidadão)
- [ ] API pública para integrações externas
- [ ] Webhook de eventos importantes

**Mobile e Offline**
- [ ] App mobile (React Native)
- [ ] Modo offline com sincronização (PWA)
- [ ] Notificações push mobile

**Novos Módulos**
- [ ] Sistema de agendamento de consultas
- [ ] Controle de estoque de medicamentos
- [ ] Sistema de folha de ponto digital
- [ ] Gestão financeira (mensalidades, inadimplência)
- [ ] Portal do familiar (acesso restrito)

---

## 🔧 Refatorações e Melhorias Técnicas

**Performance**
- [ ] Implementar virtual scrolling em listas longas (>500 items)
- [ ] Otimizar queries N+1 identificadas
- [ ] Adicionar indices faltantes no banco
- [ ] Implementar cache Redis para queries pesadas

**Testes**
- [ ] Aumentar cobertura de testes backend (meta: 80%)
- [ ] Implementar testes E2E com Playwright
- [ ] Adicionar testes de carga/performance

**DevOps**
- [ ] Configurar CI/CD completo (GitHub Actions)
- [ ] Implementar deploy automático em staging
- [ ] Configurar monitoring (Sentry, DataDog)
- [ ] Adicionar backup automatizado do banco

---

## 📝 Documentação

- [ ] Expandir stubs em `docs/modules/` (6 módulos pendentes)
- [ ] Criar guia de desenvolvimento (`docs/guides/development.md`)
- [ ] Criar guia de deploy (`docs/guides/deployment.md`)
- [ ] Documentar variáveis de ambiente completas

---

## 📌 Notas Importantes

### Regras de Uso

1. **Mantenha este arquivo ENXUTO** - Máximo 50-60 linhas de tarefas ativas
2. **Ao completar tarefa** - Remova daqui e adicione ao CHANGELOG.md
3. **Novas tarefas** - Adicione em ordem de prioridade
4. **Grandes features** - Crie issue no GitHub com detalhamento

### Referências

- **Histórico completo:** [CHANGELOG.md](CHANGELOG.md)
- **Documentação técnica:** [docs/](docs/)
- **Backup do TODO antigo:** `todo.OLD.md` (3.048 linhas)

---

**Última revisão:** 14/12/2025 por Claude Sonnet 4.5
