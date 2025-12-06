# 🕐 PLANO DE MIGRAÇÃO - DATE → TIMESTAMPTZ

**Data:** 06/12/2025 (Sábado)
**Objetivo:** Migrar todas as 20 colunas `@db.Date` para `@db.Timestamptz(3)`
**Motivação:** Eliminar bugs recorrentes de conversão de timezone e simplificar código

---

## 📊 INVENTÁRIO DE COLUNAS

### 🔴 Colunas para Migrar (20 total):

| Tabela | Coluna | Tipo Atual | Tipo Novo | Crítico |
|--------|--------|------------|-----------|---------|
| **residents** | birthDate | DATE | TIMESTAMPTZ(3) | ✅ |
| **residents** | admissionDate | DATE | TIMESTAMPTZ(3) | ✅ |
| **residents** | dischargeDate | DATE | TIMESTAMPTZ(3) | ✅ |
| **prescriptions** | prescriptionDate | DATE | TIMESTAMPTZ(3) | ✅ |
| **prescriptions** | validUntil | DATE | TIMESTAMPTZ(3) | ✅ |
| **prescriptions** | reviewDate | DATE | TIMESTAMPTZ(3) | ⚠️ |
| **medications** | startDate | DATE | TIMESTAMPTZ(3) | ✅ |
| **medications** | endDate | DATE | TIMESTAMPTZ(3) | ✅ |
| **sos_medications** | startDate | DATE | TIMESTAMPTZ(3) | ✅ |
| **sos_medications** | endDate | DATE | TIMESTAMPTZ(3) | ✅ |
| **medication_administrations** | date | DATE | TIMESTAMPTZ(3) | ✅ |
| **sos_administrations** | date | DATE | TIMESTAMPTZ(3) | ✅ |
| **daily_records** | date | DATE | TIMESTAMPTZ(3) | ✅ |
| **vaccinations** | date | DATE | TIMESTAMPTZ(3) | ⚠️ |
| **tenant_profiles** | foundedAt | DATE | TIMESTAMPTZ(3) | ⚠️ |
| **tenant_documents** | issuedAt | DATE | TIMESTAMPTZ(3) | ⚠️ |
| **tenant_documents** | expiresAt | DATE | TIMESTAMPTZ(3) | ⚠️ |
| **user_profiles** | birthDate | DATE | TIMESTAMPTZ(3) | ⚠️ |

---

## 🎯 FASES DE EXECUÇÃO

### **FASE 1: Migration SQL - Adicionar Colunas `_tz`**
✅ Criar migration Prisma que adiciona 20 colunas temporárias
✅ Executar migration no banco de desenvolvimento
✅ Validar que colunas foram criadas corretamente

### **FASE 2: Migração de Dados**
✅ Popular colunas `_tz` com dados convertidos (meio-dia para evitar DST)
✅ Validar que 100% dos dados foram migrados
✅ Comparar contagem de registros (old vs new)

### **FASE 3: Atualizar Schema Prisma**
✅ Renomear colunas antigas para `_old` no schema
✅ Renomear colunas `_tz` para nome original
✅ Trocar decorator `@db.Date` → `@db.Timestamptz(3)`
✅ Executar `npx prisma generate`

### **FASE 4: Atualizar Backend**
✅ Remover helpers de conversão:
  - `convertToISODate` (formMappers.ts)
  - `convertISOToDisplayDate` (formMappers.ts)
  - `getCurrentDateLocal` (timezone.ts)
✅ Atualizar todos os services que usam datas
✅ Remover conversões manuais em DTOs
✅ Validar tipagem TypeScript

### **FASE 5: Atualizar Frontend**
✅ Substituir helpers por `date-fns` direto
✅ Atualizar todos os formulários (ResidentForm, PrescriptionForm, etc)
✅ Atualizar componentes de exibição (calendários, listas, cards)
✅ Testar inputs `type="date"` em modo criação e edição

### **FASE 6: Testes Completos**
✅ Cadastro de residente (birthDate, admissionDate)
✅ Prescrições (prescriptionDate, validUntil, startDate, endDate)
✅ Administrações de medicamentos (date)
✅ Registros diários (date)
✅ Vacinações (date)
✅ Documentos (issuedAt, expiresAt)
✅ Perfil institucional (foundedAt)
✅ Perfil de usuário (birthDate)

### **FASE 7: Cleanup - Remover Colunas Antigas**
⚠️ **APENAS após validar TUDO em produção por 24-48h**
✅ Criar migration de remoção das colunas `_old`
✅ Executar em staging
✅ Validar aplicação continua funcionando
✅ Executar em produção
✅ Commit final + documentação

---

## ⏱️ CRONOGRAMA

**Início:** 06/12/2025 - Sábado
**Tempo Total Estimado:** 6-8 horas

| Fase | Tempo Estimado | Status |
|------|----------------|--------|
| Fase 1 | 1h | ⏳ Pendente |
| Fase 2 | 30min | ⏳ Pendente |
| Fase 3 | 30min | ⏳ Pendente |
| Fase 4 | 2h | ⏳ Pendente |
| Fase 5 | 2-3h | ⏳ Pendente |
| Fase 6 | 1h | ⏳ Pendente |
| Fase 7 | 30min | ⏳ Pendente (fazer depois) |

---

## 🚨 RISCOS E MITIGAÇÕES

**Risco:** Dados migrados incorretamente (timezone offset errado)
**Mitigação:** Usar `+ INTERVAL '12 hours'` para evitar mudança de dia

**Risco:** Quebrar queries existentes que esperam DATE
**Mitigação:** PostgreSQL converte TIMESTAMPTZ → DATE automaticamente em comparações

**Risco:** Frontend quebrar por formato diferente
**Mitigação:** `date-fns` funciona com Date objects independente da source

**Risco:** Perda de dados em produção
**Mitigação:** Fase de coexistência (manter colunas antigas até validar tudo)

---

## 📝 CHECKLIST DE VALIDAÇÃO

### Backend:
- [ ] Todos os services compilam sem erros TypeScript
- [ ] Todas as queries retornam dados corretos
- [ ] Não há mais imports de `convertToISODate` ou `convertISOToDisplayDate`
- [ ] Logs não mostram erros de timezone

### Frontend:
- [ ] Todos os formulários de criação funcionam
- [ ] Todos os formulários de edição carregam datas corretamente
- [ ] Inputs `type="date"` exibem valor correto
- [ ] Listas e tabelas exibem datas formatadas
- [ ] Calendários funcionam normalmente

### Dados:
- [ ] Nenhum registro com data nula inesperada
- [ ] Nenhuma data deslocada ±1 dia
- [ ] Contagem de registros idêntica antes/depois
- [ ] Queries de range de datas funcionam

---

## 🎯 SUCESSO ESPERADO

Ao final da migração:
1. ✅ Zero helpers de conversão de data
2. ✅ Código mais simples e confiável
3. ✅ PostgreSQL gerencia timezone automaticamente
4. ✅ Bugs de "data anterior" eliminados
5. ✅ Conformidade com boas práticas (TIMESTAMPTZ > DATE)
6. ✅ Código pronto para internacionalização futura

---

**Autor:** Dr. Emanuel (CEO Rafa Labs)
**Executor:** Claude Sonnet 4.5 (Autonomous Mode)
**Aprovação:** Dr. E. - 06/12/2025
