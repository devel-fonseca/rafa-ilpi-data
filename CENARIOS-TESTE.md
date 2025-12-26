# 📋 Cenários de Teste - Sistema de Inadimplência

## 🎯 Objetivo

Este documento descreve todos os cenários de teste criados no banco de dados para validar o **Sistema de Gestão de Inadimplência** do Rafa ILPI.

---

## 🗂️ Tenants e Cenários

### 🛡️ **Casa de Repouso São Rafael** (PROTEGIDO)
- **Email**: contato@casasaorafael.com.br
- **Senha**: Senha@123
- **Status**: ACTIVE
- **Cenário**: Cliente modelo - sempre em dia
- **Faturas**:
  - ✅ 12 faturas pagas (histórico de 12 meses)
  - ✅ 0 faturas vencidas
  - 💰 Total pago: **R$ 7.198,80**
- **Uso**: Não alterar - tenant de produção protegido

---

### ✅ **YIELD INFORMATICA LTDA** (Inadimplência LEVE)
- **Email**: yield@yield.com.br
- **Senha**: Senha@123
- **Status**: TRIAL
- **Cenário**: Inadimplência leve - atraso recente de 10 dias
- **Faturas**:
  - ✅ 8 pagas (R$ 1.199,20)
  - ⚠️ 1 vencida há **10 dias** (R$ 149,90)
  - **Taxa de inadimplência**: ~11%
- **Ações de teste**:
  - ✉️ Enviar lembrete de pagamento (email azul - INFO)
  - 💰 Renegociar com desconto de 5-10%
  - 📊 Verificar badge azul no dashboard

---

### ⚠️ **ANDREA NAZARE BARROS** (Inadimplência MODERADA)
- **Email**: contato@barrosnazare.com.br
- **Senha**: Senha@123
- **Status**: TRIAL
- **Cenário**: Inadimplência moderada - múltiplas faturas vencidas
- **Faturas**:
  - ✅ 6 pagas (R$ 1.799,40)
  - ⚠️ 2 vencidas:
    - Fatura 1: **50 dias** de atraso (R$ 299,90)
    - Fatura 2: **20 dias** de atraso (R$ 299,90)
  - **Total vencido**: R$ 599,80
  - **Taxa de inadimplência**: ~25%
- **Ações de teste**:
  - ✉️ Enviar lembrete (email laranja - WARNING)
  - 💰 Renegociar múltiplas faturas
  - 🔍 Validar agrupamento de faturas por tenant
  - 📊 Verificar badge laranja

---

### 🚨 **DAVID WILLIAN FERLA** (Inadimplência CRÍTICA)
- **Email**: contato@dwferla.com.br
- **Senha**: Senha@123
- **Status**: TRIAL
- **Cenário**: Inadimplência crítica - 35 dias de atraso
- **Faturas**:
  - ✅ 4 pagas (R$ 2.399,60)
  - 🚨 1 vencida há **35 dias** (R$ 599,90)
  - **Taxa de inadimplência**: ~20%
- **Ações de teste**:
  - ✉️ Enviar lembrete (email vermelho - CRITICAL com alerta urgente)
  - 💰 Renegociar com desconto maior (15-20%)
  - 🚫 Testar suspensão de tenant
  - 📊 Verificar badge vermelho + alerta crítico

---

### 🔥 **JOSE FRANCISCO FUKUMURA** (Inadimplência CRÍTICA GRAVE)
- **Email**: contato@jffukumura.com.br
- **Senha**: Senha@123
- **Status**: TRIAL
- **Cenário**: Pior caso - múltiplas faturas com atrasos graves
- **Faturas**:
  - ✅ 3 pagas (R$ 2.699,70)
  - 🔥 3 vencidas:
    - Fatura 1: **75 dias** de atraso (R$ 899,90)
    - Fatura 2: **45 dias** de atraso (R$ 899,90)
    - Fatura 3: **15 dias** de atraso (R$ 899,90)
  - **Total vencido**: R$ 2.699,70
  - **Taxa de inadimplência**: ~50%
- **Ações de teste**:
  - ✉️ Enviar lembrete com urgência máxima
  - 💰 Renegociar pacote completo de faturas
  - 🚫 **TESTAR SUSPENSÃO** (caso prioritário)
  - 📊 Validar ordenação (deve aparecer no topo da lista)
  - 🔔 Criar alerta de tenant de alto risco

---

### ✅ **J A FIGUEIREDO & ENNE LTDA** (Inadimplência LEVE)
- **Email**: contato@jafenne.com.br
- **Senha**: Senha@123
- **Status**: TRIAL
- **Cenário**: Bom pagador com atraso recente
- **Faturas**:
  - ✅ 9 pagas (R$ 3.599,10)
  - ⚠️ 1 vencida há **8 dias** (R$ 399,90)
  - **Taxa de inadimplência**: ~10%
- **Ações de teste**:
  - ✉️ Enviar lembrete amigável
  - 📊 Validar que tem bom histórico de pagamentos
  - 💰 Testar extensão de prazo sem desconto

---

### ⚠️ **RODRIGO DE OLIVEIRA SILVA** (Inadimplência MODERADA)
- **Email**: contato@roolsil.com.br
- **Senha**: Senha@123
- **Status**: TRIAL
- **Cenário**: Pagador irregular com histórico de atrasos
- **Faturas**:
  - ✅ 5 pagas (R$ 2.249,50) - todas com atrasos de 10 dias
  - ⚠️ 2 vencidas:
    - Fatura 1: **55 dias** de atraso (R$ 449,90)
    - Fatura 2: **25 dias** de atraso (R$ 449,90)
  - **Total vencido**: R$ 899,80
  - **Taxa de inadimplência**: ~29%
- **Ações de teste**:
  - 📊 Analisar padrão de pagamento (sempre paga com atraso)
  - ✉️ Enviar lembrete reforçado
  - 💰 Renegociar com condições mais rígidas
  - 🔔 Criar alerta de monitoramento

---

### ✅ **ELIZEU RODRIGUES DO PRADO** (Em Dia)
- **Email**: contato@erprado.com.br
- **Senha**: Senha@123
- **Status**: TRIAL
- **Cenário**: Cliente exemplar - sempre paga em dia
- **Faturas**:
  - ✅ 11 pagas (R$ 3.848,90)
  - ✅ 0 vencidas
  - **Taxa de inadimplência**: 0%
- **Ações de teste**:
  - 📊 Validar que NÃO aparece na lista de inadimplentes
  - 🎯 Usar como baseline para comparação
  - 📈 Validar que contribui positivamente para MRR/ARR

---

### 📊 **Tenants sem Histórico** (Novos/Inativos)
Os seguintes tenants não possuem faturas criadas (apenas subscriptions ativas):

- **ROSANGELA DE FREITAS** (contato@rosanfrei.com.br)
- **MARCILIO LOURENCO DA SILVA** (contato@dasilvamarlou.com.br)
- **JOSE AUGUSTO PEREIRA DE ARAUJO** (contato@japaraujo.com.br)

**Uso**: Simular novos clientes ou testar criação de primeira fatura.

---

## 📊 Resumo Geral dos Dados

### Estatísticas Globais

| Métrica | Valor |
|---------|-------|
| **Total de faturas** | 68 |
| **Faturas pagas** | 57 (83,8%) |
| **Faturas vencidas** | 10 (14,7%) |
| **Fatura paga recente** | 1 (1,5%) |
| **Valor total pago** | R$ 24.994,20 |
| **Valor total vencido** | R$ 5.099,20 |
| **Tenants inadimplentes** | 6 de 11 (54,5%) |

### Distribuição por Severidade

| Severidade | Tenants | Faturas | Valor Total |
|------------|---------|---------|-------------|
| 🔥 **CRÍTICA GRAVE** (75+ dias) | 1 | 3 | R$ 2.699,70 |
| 🚨 **CRÍTICA** (30-74 dias) | 2 | 3 | R$ 1.499,70 |
| ⚠️ **MODERADA** (15-29 dias) | 2 | 4 | R$ 1.499,60 |
| ✅ **LEVE** (7-14 dias) | 2 | 2 | R$ 549,80 |

---

## 🧪 Casos de Teste Recomendados

### 1. **Dashboard de Inadimplência**
- [ ] Verificar que os 6 tenants inadimplentes aparecem na lista
- [ ] Validar ordenação por maior atraso (JOSE FUKUMURA no topo)
- [ ] Conferir cores dos badges (azul/laranja/vermelho)
- [ ] Validar métricas totais: R$ 5.099,20 em atraso
- [ ] Verificar que ELIZEU e CASA SÃO RAFAEL não aparecem

### 2. **Gráficos de Tendência**
- [ ] Validar gráfico de evolução com dados dos últimos 12 meses
- [ ] Verificar picos de inadimplência nos meses recentes
- [ ] Comparar tendências entre tenants

### 3. **Envio de Lembretes**
- [ ] Enviar lembrete para YIELD (email azul - INFO)
- [ ] Enviar lembrete para ANDREA (email laranja - WARNING)
- [ ] Enviar lembrete para DAVID (email vermelho - CRITICAL)
- [ ] Verificar recebimento em financeiro@rafalabs.com.br

### 4. **Renegociação**
- [ ] Renegociar fatura de YIELD com desconto de 10%
- [ ] Renegociar múltiplas faturas de JOSE FUKUMURA
- [ ] Estender prazo para J A FIGUEIREDO
- [ ] Combinar desconto + extensão para RODRIGO SILVA

### 5. **Suspensão de Tenant**
- [ ] Suspender JOSE FUKUMURA (caso crítico grave)
- [ ] Validar criação de alerta
- [ ] Verificar mudança de status no tenant
- [ ] Testar que não permite suspender novamente

### 6. **Analytics e Métricas**
- [ ] Calcular MRR com base nas faturas pagas
- [ ] Validar taxa de inadimplência global (14,7%)
- [ ] Analisar churn por tenant
- [ ] Comparar LTV de clientes adimplentes vs inadimplentes

---

## 🔄 Scripts de Configuração

Dois scripts SQL foram criados:

### 1. `setup-overdue-scenarios.sql`
Cria 10 faturas vencidas com diferentes níveis de severidade.

**Executar:**
```bash
PGPASSWORD=rafa_pass_dev psql -h localhost -p 5433 -U rafa_user -d rafa_ilpi -f setup-overdue-scenarios.sql
```

### 2. `setup-analytics-data.sql`
Cria 57 faturas pagas (histórico de 12 meses) para popular gráficos e analytics.

**Executar:**
```bash
PGPASSWORD=rafa_pass_dev psql -h localhost -p 5433 -U rafa_user -d rafa_ilpi -f setup-analytics-data.sql
```

---

## 🎓 Insights para Testes

`★ Insight ─────────────────────────────────────`
**Padrões de comportamento dos tenants:**
1. **JOSE FUKUMURA**: Pagador problemático - paga com 20 dias de atraso e agora tem 3 faturas vencidas (75, 45, 15 dias)
2. **RODRIGO SILVA**: Pagador irregular - sempre paga, mas com ~10 dias de atraso
3. **ANDREA BARROS**: Estava indo bem (6 pagas), mas desapareceu (2 vencidas em 50 e 20 dias)
4. **DAVID FERLA**: Novo cliente que começou bem (4 pagas em dia), mas agora tem 1 crítica (35 dias)
5. **YIELD & J A FIGUEIREDO**: Bons pagadores com atrasos pontuais recentes
6. **ELIZEU & CASA SÃO RAFAEL**: Clientes modelo - sempre em dia
`─────────────────────────────────────────────────`

---

## ✅ Validações Críticas

Antes de considerar o sistema pronto para produção, validar:

1. ✅ Dashboard exibe 6 tenants inadimplentes
2. ✅ Valor total em atraso = R$ 5.099,20
3. ✅ Badge do menu lateral exibe "10" faturas vencidas
4. ✅ Emails são enviados com cores corretas (azul/laranja/vermelho)
5. ✅ Gráficos plotam dados históricos dos últimos 12 meses
6. ✅ Filtros de período funcionam (semana/mês/trimestre/ano)
7. ✅ Ações de cobrança invalidam cache corretamente
8. ✅ Suspensão de tenant cria alerta e atualiza status
9. ✅ Renegociação atualiza valores e prazos corretamente
10. ✅ Casa São Rafael nunca aparece em listas de inadimplência

---

**Data de criação**: 2025-12-26
**Última atualização**: 2025-12-26
**Responsável**: Dr. Emanuel (Rafa Labs)
