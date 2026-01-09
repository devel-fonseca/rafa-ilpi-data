# Especificação de Testes E2E - Dashboard RDC 502/2021

## Objetivo
Validar o funcionamento completo do Dashboard de Conformidade RDC 502/2021, incluindo visualização de indicadores, navegação temporal, drill-down de casos e exportação de relatórios.

---

## Pré-requisitos

### Dados de Teste
- Tenant ativo com usuário autenticado
- Pelo menos 3 residentes ativos no sistema
- Registros de intercorrências dos últimos 3 meses
- Indicadores RDC calculados para o mês corrente
- Pelo menos 1 Evento Sentinela registrado (opcional para testes completos)

### Permissões Necessárias
- `VIEW_REPORTS` - Visualizar relatórios
- `MANAGE_SETTINGS` - Recalcular indicadores (opcional)

---

## Casos de Teste

### TC-01: Acesso ao Dashboard
**Descrição:** Verificar se o usuário consegue acessar o dashboard RDC

**Passos:**
1. Fazer login no sistema
2. Navegar para o menu lateral
3. Clicar em "Conformidade RDC"

**Resultado Esperado:**
- Dashboard carrega sem erros
- Título "Conformidade RDC 502/2021" é exibido
- Subtítulo com base legal aparece
- Mês atual é selecionado por padrão
- 6 cards de indicadores são exibidos
- Gráfico de tendência é exibido
- Card informativo legal é exibido

**Critérios de Sucesso:**
- Status HTTP 200 na requisição `/daily-records/indicadores-rdc`
- Status HTTP 200 na requisição `/daily-records/indicadores-rdc/historico`
- Sem erros no console
- Loading states visíveis durante carregamento

---

### TC-02: Visualização de Indicadores
**Descrição:** Validar a exibição correta dos 6 indicadores obrigatórios

**Passos:**
1. Acessar dashboard RDC
2. Aguardar carregamento completo

**Resultado Esperado:**
Para cada um dos 6 indicadores:
- Nome do indicador exibido corretamente:
  - Taxa de Mortalidade
  - Diarreia Aguda
  - Escabiose
  - Desidratação
  - Úlcera de Decúbito
  - Desnutrição
- Taxa percentual exibida (formato: X.XX%)
- Numerador e denominador exibidos (ex: "3 casos / 45 residentes")
- Cor do card baseada na taxa:
  - Verde: 0%
  - Amarelo: < 5%
  - Laranja: 5-10%
  - Vermelho: > 10%

**Critérios de Sucesso:**
- Todos os 6 cards renderizados
- Valores numéricos corretos (validar com banco de dados)
- Cores aplicadas corretamente

---

### TC-03: Comparação com Mês Anterior
**Descrição:** Verificar exibição da tendência vs mês anterior

**Pré-condição:** Deve haver dados para o mês anterior

**Passos:**
1. Acessar dashboard RDC
2. Verificar indicador de tendência em cada card

**Resultado Esperado:**
- Se taxa aumentou: seta ↑ vermelha + porcentagem
- Se taxa diminuiu: seta ↓ verde + porcentagem
- Se taxa manteve: linha horizontal cinza
- Tooltip "vs mês ant." exibido

**Critérios de Sucesso:**
- Cálculo de variação percentual correto
- Ícone e cor apropriados para cada caso

---

### TC-04: Navegação entre Meses
**Descrição:** Testar navegação temporal (mês/ano)

**Passos:**
1. Acessar dashboard RDC (mês atual selecionado)
2. Clicar no botão "◀" (mês anterior)
3. Verificar atualização dos dados
4. Clicar no botão "▶" (próximo mês)
5. Tentar clicar em "▶" quando estiver no mês atual

**Resultado Esperado:**
- Ao clicar em "◀":
  - Mês/ano atualizado no display
  - Indicadores recarregados
  - Requisição API com novos parâmetros
- Ao clicar em "▶":
  - Retorna ao mês seguinte
  - Botão desabilitado quando no mês atual
- Display de mês formatado em português (ex: "janeiro de 2024")

**Critérios de Sucesso:**
- Transição de ano funciona (dez → jan)
- Loading state durante mudança de mês
- Não é possível avançar além do mês atual

---

### TC-05: Gráfico de Tendência
**Descrição:** Validar visualização do gráfico histórico

**Passos:**
1. Acessar dashboard RDC
2. Rolar até a seção "Tendência - Últimos 12 Meses"
3. Interagir com o gráfico (hover)

**Resultado Esperado:**
- 6 linhas coloridas (uma por indicador)
- Eixo X com meses formatados (ex: "jan/24")
- Eixo Y com label "Taxa (%)"
- Legenda com nomes completos dos indicadores
- Tooltip ao passar mouse:
  - Mês/ano
  - Valores de todos os 6 indicadores
- Responsivo (ajusta ao tamanho da tela)

**Critérios de Sucesso:**
- Dados históricos dos últimos 12 meses
- Cores consistentes com os cards
- Tooltip funcional
- Gráfico renderiza sem erros

---

### TC-06: Drill-Down de Casos
**Descrição:** Testar visualização detalhada de casos

**Pré-condição:** Pelo menos 1 indicador com casos (numerador > 0)

**Passos:**
1. Acessar dashboard RDC
2. Identificar card com casos (botão "Ver X casos" visível)
3. Clicar no botão "Ver Detalhes"
4. Verificar modal aberto
5. Fechar modal

**Resultado Esperado:**
- Modal abre com título do indicador
- Lista de casos exibida:
  - Nome do residente (link clicável)
  - Data e hora da intercorrência
  - Badge de severidade (LEVE, MODERADA, GRAVE, CRÍTICA)
  - Descrição do caso
  - Ação tomada
- Scroll funcional para múltiplos casos
- Contador no rodapé (ex: "Total: 3 casos")
- Link para perfil do residente abre em nova aba
- Botão "Fechar" fecha o modal

**Critérios de Sucesso:**
- Modal renderiza corretamente
- Dados dos casos corretos (validar com API)
- Links funcionais
- Modal fecha ao clicar em "Fechar" ou fora dele

---

### TC-07: Recálculo Manual de Indicadores
**Descrição:** Testar funcionalidade de recalcular indicadores

**Pré-condição:** Usuário com permissão `MANAGE_SETTINGS`

**Passos:**
1. Acessar dashboard RDC
2. Clicar no botão "Recalcular"
3. Aguardar processamento

**Resultado Esperado:**
- Toast "Indicadores recalculados com sucesso!" exibido
- Dados atualizados automaticamente
- Loading state durante recálculo
- Status HTTP 200 na requisição POST `/daily-records/indicadores-rdc/calcular`

**Critérios de Sucesso:**
- Recálculo executado sem erros
- Indicadores invalidados e recarregados
- Toast de sucesso exibido

**Caso de Erro:**
- Se falhar: Toast "Erro ao recalcular indicadores" exibido

---

### TC-08: Exportação de Relatório PDF
**Descrição:** Validar geração de relatório PDF

**Passos:**
1. Acessar dashboard RDC
2. Selecionar um mês com dados
3. Clicar no botão "Exportar PDF"
4. Aguardar geração
5. Verificar arquivo baixado

**Resultado Esperado:**
- Toast "Gerando relatório PDF..." exibido
- Arquivo PDF baixado com nome formatado (ex: "RDC_502_2021_janeiro_de_2024.pdf")
- Toast "Relatório PDF gerado com sucesso!" exibido
- PDF contém:
  - Cabeçalho com título "RELATÓRIO DE CONFORMIDADE"
  - Informações da instituição (se disponível)
  - Período de referência
  - Data de geração
  - Gerado por (nome do usuário)
  - Tabela com resumo dos 6 indicadores
  - Tabela com tendência histórica (últimos 6 meses)
  - Seção de base legal e fórmulas
  - Rodapé com numeração de páginas

**Critérios de Sucesso:**
- PDF gerado sem erros
- Todas as seções presentes
- Dados corretos no PDF
- Formatação profissional

**Caso de Erro:**
- Se não houver dados: Toast "Nenhum dado disponível para exportar"
- Se falhar: Toast "Erro ao gerar relatório PDF"

---

### TC-09: Modal de Eventos Sentinela (Opcional)
**Descrição:** Validar tracking de Eventos Sentinela

**Pré-condição:** Pelo menos 1 Evento Sentinela registrado

**Passos:**
1. Acessar dashboard RDC ou página de intercorrências
2. Localizar evento sentinela
3. Abrir modal de tracking
4. Verificar informações exibidas
5. Atualizar status (PENDENTE → ENVIADO)
6. Verificar timeline atualizada

**Resultado Esperado:**
- Modal abre com título "Evento Sentinela - Tracking de Notificação"
- Status atual exibido com ícone e cor apropriados
- Informações do evento:
  - Nome do residente
  - Tipo de evento
  - Data/hora
  - Descrição
- Timeline de notificação:
  - Evento registrado (✓)
  - Email enviado ao RT (se aplicável)
  - Enviado à vigilância (se aplicável)
  - Confirmado (se aplicável)
- Checklist de obrigações legais (RDC 502/2021)
- Formulário para atualizar status (se PENDENTE ou ENVIADO)

**Ações de Atualização:**
- **Status PENDENTE:**
  - Campo "Protocolo" obrigatório
  - Campo "Observações" opcional
  - Botão "Marcar como Enviado"
- **Status ENVIADO:**
  - Campo "Observações" opcional
  - Botão "Marcar como Confirmado"
- **Status CONFIRMADO:**
  - Exibir observações finais (se houver)
  - Apenas leitura

**Critérios de Sucesso:**
- Modal renderiza corretamente
- Status atualizado via API
- Timeline reflete mudanças
- Toast de sucesso exibido
- Modal fecha após atualização

---

### TC-10: Responsividade
**Descrição:** Validar comportamento em diferentes resoluções

**Passos:**
1. Acessar dashboard RDC em desktop (> 1024px)
2. Redimensionar para tablet (768px - 1024px)
3. Redimensionar para mobile (< 768px)

**Resultado Esperado:**
- **Desktop (> 1024px):**
  - Grid de 3 colunas para cards
  - Menu lateral visível
  - Gráfico em largura total
- **Tablet (768-1024px):**
  - Grid de 2 colunas para cards
  - Menu lateral colapsável
  - Gráfico responsivo
- **Mobile (< 768px):**
  - Grid de 1 coluna para cards
  - Menu hamburguer
  - Gráfico ajustado
  - Controles de navegação menores

**Critérios de Sucesso:**
- Layout adaptável sem quebras
- Todos os elementos acessíveis
- Sem scroll horizontal desnecessário

---

### TC-11: Estados de Loading
**Descrição:** Verificar indicadores de carregamento

**Passos:**
1. Acessar dashboard RDC com throttling de rede (Slow 3G)
2. Observar estados de loading
3. Navegar entre meses

**Resultado Esperado:**
- Cards mostram skeleton loader durante carregamento
- Gráfico exibe "Carregando gráfico..."
- Botão "Exportar PDF" desabilitado durante loading
- Botão "Recalcular" desabilitado durante loading

**Critérios de Sucesso:**
- Loading states visíveis
- UI não "pula" ao carregar dados
- Feedback visual adequado

---

### TC-12: Tratamento de Erros
**Descrição:** Validar comportamento em cenários de erro

**Cenários de Teste:**

**12.1 - Sem Dados Disponíveis**
- Selecionar mês sem dados calculados
- **Esperado:** Cards mostram "0 casos / 0 residentes" e "0.00%"

**12.2 - Erro na API**
- Simular erro 500 na API
- **Esperado:** Toast de erro exibido, dados anteriores mantidos

**12.3 - Sem Conexão**
- Desabilitar internet
- Tentar navegar entre meses
- **Esperado:** Toast "Erro ao carregar dados" ou similar

**12.4 - Timeout**
- Simular timeout na requisição
- **Esperado:** Toast de erro após timeout

**Critérios de Sucesso:**
- Erros não quebram a aplicação
- Mensagens de erro claras para o usuário
- Dados anteriores preservados quando possível

---

## Matriz de Cobertura

| ID | Caso de Teste | Prioridade | Status |
|----|---------------|------------|--------|
| TC-01 | Acesso ao Dashboard | Alta | ⏳ Pendente |
| TC-02 | Visualização de Indicadores | Alta | ⏳ Pendente |
| TC-03 | Comparação com Mês Anterior | Média | ⏳ Pendente |
| TC-04 | Navegação entre Meses | Alta | ⏳ Pendente |
| TC-05 | Gráfico de Tendência | Média | ⏳ Pendente |
| TC-06 | Drill-Down de Casos | Alta | ⏳ Pendente |
| TC-07 | Recálculo Manual | Média | ⏳ Pendente |
| TC-08 | Exportação PDF | Alta | ⏳ Pendente |
| TC-09 | Modal Eventos Sentinela | Baixa | ⏳ Pendente |
| TC-10 | Responsividade | Média | ⏳ Pendente |
| TC-11 | Estados de Loading | Baixa | ⏳ Pendente |
| TC-12 | Tratamento de Erros | Média | ⏳ Pendente |

---

## Ferramentas Sugeridas

### E2E Testing
- **Playwright** ou **Cypress** para testes automatizados
- **Jest** para testes unitários de componentes
- **React Testing Library** para testes de integração

### Validação Visual
- **Percy** ou **Chromatic** para regression visual

### Performance
- **Lighthouse** para métricas de performance
- **Web Vitals** para monitoramento

---

## Dados de Seed para Testes

Para executar os testes E2E com sucesso, é recomendado criar um seed de dados:

```sql
-- Exemplo de seed para testes
-- 3 residentes ativos
-- 10 intercorrências no mês atual (variadas por tipo)
-- 1 Evento Sentinela (QUEDA_COM_LESAO)
-- Indicadores calculados para últimos 3 meses
```

---

## Critérios de Aceitação Geral

✅ Todos os casos de teste de prioridade ALTA passam
✅ Zero erros no console do navegador
✅ Tempo de carregamento inicial < 2 segundos
✅ Todas as requisições API retornam em < 500ms
✅ Compatibilidade com Chrome, Firefox, Safari, Edge (últimas 2 versões)
✅ Acessibilidade (WCAG 2.1 AA) atendida
✅ Responsividade em dispositivos de 320px a 2560px

---

## Notas de Implementação

### Para Desenvolvedores
- Adicionar `data-testid` nos elementos principais para facilitar seleção em testes
- Mockar APIs em ambiente de teste
- Criar fixtures de dados para cada caso de teste
- Isolar testes (cada teste deve limpar seu estado)

### Para QA
- Executar testes em múltiplos navegadores
- Validar com dados reais (após seed)
- Documentar bugs encontrados com screenshots
- Reportar tempos de carregamento observados

---

**Última Atualização:** Janeiro 2026
**Autor:** Equipe de Desenvolvimento Rafa ILPI
**Revisão:** v1.0
