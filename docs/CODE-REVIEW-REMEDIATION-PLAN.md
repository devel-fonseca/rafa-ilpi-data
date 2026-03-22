# Plano de Execução do Code Review

## Status

Concluído em 2026-03-22.

Fechamento:
- ondas 1 a 5 executadas até o fim
- plano complementar de performance do frontend também concluído
- riscos principais do code review original foram tratados sem deixar frentes abertas dentro deste plano

Principais resultados:
- `refreshToken` fora do `localStorage` e fluxo de refresh em cookie `httpOnly`
- frontend com build tipado e smoke tests automatizados
- hardening HTTP e health/readiness alinhados com dependências críticas
- gargalos evidentes de query em infraestrutura e mensagens removidos
- artefatos legados/debug limpos do repositório
- bundle do frontend com chunking revisado e orçamento integrado ao build

## Objetivo
Transformar os findings do code review em uma sequência de entregas pequenas, rastreáveis e seguras para produção.

## Princípios
- Um PR por problema coerente.
- Começar por risco alto com baixo custo de implementação.
- Separar mudanças de infraestrutura/release de mudanças comportamentais.
- Exigir validação objetiva por PR.
- Evitar misturar segurança, performance e UX no mesmo diff quando isso dificultar rollback.

## Ordem de Ataque
1. Fechar exposição e hardening barato no backend.
2. Reforçar a esteira de build/test do frontend.
3. Atacar a dívida estrutural de autenticação.
4. Corrigir gargalos de eficiência com impacto em custo.
5. Limpar resíduos de código morto, debug e bundle.

## Onda 1: Segurança de Baixo Risco

### PR 1
**Título:** `fix(security): restrict tenant schema health endpoint`

**Escopo**
- Tornar `/api/health/tenant-schemas` protegido para `SUPERADMIN` ou removê-lo da superfície pública.
- Revisar o payload para não expor nomes de schema desnecessariamente.

**Arquivos prováveis**
- `apps/backend/src/health/health.controller.ts`
- `apps/backend/src/health/tenant-schemas.health.ts`

**Critério de aceite**
- `/api/health` continua público.
- `/api/health/tenant-schemas` deixa de expor inventário interno para usuários anônimos.
- Smoke test de health continua verde.

### PR 2
**Título:** `feat(security): enable baseline http hardening`

**Escopo**
- Ativar `helmet`.
- Ativar `compression`.
- Configurar `@nestjs/throttler` para rotas públicas e de autenticação.
- Revisar exclusões necessárias para `health`, `docs` e WebSocket.

**Arquivos prováveis**
- `apps/backend/src/main.ts`
- `apps/backend/src/app.module.ts`
- módulos/guards relacionados a throttling

**Critério de aceite**
- App sobe em dev e produção.
- Swagger continua acessível conforme a política definida.
- Auth e upload continuam funcionando.
- Não surgem regressões de CORS/WebSocket.

### PR 3
**Título:** `refactor(logging): remove runtime debug noise from production flows`

**Escopo**
- Remover `console.log`/`console.error` de fluxos críticos do frontend.
- Manter logs só via flag de dev ou utilitário central.
- Priorizar auth, profile, beds, clinical notes.

**Arquivos prováveis**
- `apps/frontend/src/stores/auth.store.ts`
- `apps/frontend/src/components/auth/ProtectedRoute.tsx`
- `apps/frontend/src/pages/profile/MyProfile.tsx`
- `apps/frontend/src/components/beds/BedsMapVisualization.tsx`
- `apps/frontend/src/components/clinical-notes/ClinicalNotesForm.tsx`

**Critério de aceite**
- Fluxos continuam funcionando.
- Console do browser fica limpo em uso normal.
- Não há perda de telemetria relevante no backend.

## Onda 2: Segurança de Release e Teste Automatizado

### PR 4
**Título:** `build(frontend): enforce typecheck in release path`

**Escopo**
- Fazer o caminho principal de build usar `tsc && vite build`.
- Remover a permissão explícita de “desabilitar temporariamente” o type checking.
- Limpar erros TypeScript que estiverem bloqueando o build.

**Arquivos prováveis**
- `apps/frontend/package.json`
- `apps/frontend/vite.config.ts`
- arquivos do módulo de prescrições que ainda bloquearem o `tsc`

**Critério de aceite**
- `npm run build` do frontend passa com type checking real.
- A imagem Docker do frontend continua buildando.

### PR 5
**Título:** `test(frontend): add smoke coverage for critical user journeys`

**Escopo**
- Introduzir suíte mínima de teste automatizado para frontend.
- Preferência: Playwright para smoke e regressão visual/funcional.
- Cobrir pelo menos:
  - login/logout
  - renovação de sessão
  - fluxo de leitos
  - perfil do usuário

**Arquivos prováveis**
- configuração de Playwright ou Vitest
- specs de smoke em `apps/frontend`

**Critério de aceite**
- Existe comando padronizado de teste frontend.
- Pelo menos 4 fluxos críticos têm cobertura automática.
- O pipeline consegue falhar em regressão real do frontend.

## Onda 3: Autenticação e Sessão

### PR 6
**Título:** `feat(auth): introduce cookie-based refresh token flow`

**Escopo**
- Backend passa a emitir `refreshToken` em cookie `httpOnly`.
- Frontend deixa de depender do `refreshToken` persistido em Zustand.
- Garantir compatibilidade de CORS/credentials.

**Arquivos prováveis**
- `apps/backend/src/auth/**`
- `apps/backend/src/main.ts`
- `apps/frontend/src/stores/auth.store.ts`
- `apps/frontend/src/services/api.ts`

**Critério de aceite**
- Login, refresh e logout continuam funcionando.
- `refreshToken` não fica mais exposto ao JavaScript da aplicação.

### PR 7
**Título:** `refactor(auth): reduce token persistence on the client`

**Escopo**
- Remover `refreshToken` do `persist`.
- Avaliar manter `accessToken` só em memória ou minimizar persistência.
- Revisar bootstrap de sessão no carregamento da aplicação.

**Critério de aceite**
- O store deixa de persistir segredos desnecessários.
- Recarregamento da página continua com sessão válida via refresh cookie.

## Onda 4: Eficiência e Redução de Custos

### PR 8
**Título:** `perf(buildings): remove N+1 from infrastructure listing`

**Escopo**
- Reescrever `BuildingsService.findAll()` para agregar contagens sem 3 queries por prédio.
- Prioridade: reduzir round-trips ao banco.

**Arquivos prováveis**
- `apps/backend/src/buildings/buildings.service.ts`

**Critério de aceite**
- Mesmo contrato de API.
- Menos queries para a listagem de prédios.
- Nenhuma regressão em testes da infraestrutura.

### PR 9
**Título:** `perf(messages): batch recipient validation`

**Escopo**
- Substituir loop sequencial de validação por consulta única/batched.
- Garantir que broadcast e envio multi-destinatário não escalem linearmente em round-trips.

**Arquivos prováveis**
- `apps/backend/src/messages/messages.service.ts`

**Critério de aceite**
- Mesmo comportamento funcional.
- Validação em lote com redução clara de queries.

### PR 10
**Título:** `ops(health): align health checks with real dependencies`

**Escopo**
- Fazer o health refletir Redis e dependências críticas, ou separar readiness/liveness corretamente.
- Ajustar `docker-compose.production.yml` para usar a rota certa.

**Arquivos prováveis**
- `apps/backend/src/health/health.controller.ts`
- `apps/backend/src/health/**`
- `docker-compose.production.yml`

**Critério de aceite**
- Backend não fica “healthy” quando dependências críticas estiverem indisponíveis.
- Sem falsos negativos em produção normal.

## Onda 5: Código Morto, Bundle e Higiene do Repositório

### PR 11
**Título:** `chore(frontend): remove legacy and backup artifacts`

**Escopo**
- Remover arquivos mortos/legados:
  - `apps/frontend/src/pages/users/UsersListOld.tsx`
  - `apps/frontend/src/pages/users/UsersList.tsx.backup`
  - `DEBUG_SCRIPT.js`
  - `DEBUG_TABS.js`
- Revisar outros artefatos de debug/backup versionados.

**Critério de aceite**
- Nenhuma referência quebrada.
- Árvore do repositório mais limpa.

### PR 12
**Título:** `chore(frontend): prune stale bundling config and devtools`

**Escopo**
- Remover chunk rules obsoletas de `recharts`/`xlsx`.
- Não renderizar `ReactQueryDevtools` em produção.
- Reavaliar se `@tanstack/react-query-devtools` deve ficar em `dependencies`.

**Arquivos prováveis**
- `apps/frontend/vite.config.ts`
- `apps/frontend/src/providers/QueryProvider.tsx`
- `apps/frontend/package.json`

**Critério de aceite**
- Build continua verde.
- Bundle não carrega tooling de debug em produção.

### PR 13
**Título:** `chore(workspace): slim root dependencies`

**Escopo**
- Remover dependências runtime do `package.json` raiz se não forem necessárias.
- Manter o root apenas como orquestrador.

**Arquivos prováveis**
- `package.json`
- `package-lock.json`

**Critério de aceite**
- `npm install` na raiz continua funcionando.
- Sem impacto em builds do backend/frontend.

## Sequência Recomendada
1. PR 1
2. PR 2
3. PR 3
4. PR 4
5. PR 5
6. PR 6
7. PR 7
8. PR 8
9. PR 9
10. PR 10
11. PR 11
12. PR 12
13. PR 13

## O que eu não misturaria
- Cookie/httpOnly de auth com refactor de build/test.
- Hardening HTTP com otimização de queries.
- Limpeza de código morto com mudança de comportamento de sessão.

## Métrica de Sucesso
- `refreshToken` fora do `localStorage`.
- Frontend com build tipado e smoke automatizado.
- Health e observabilidade mais confiáveis.
- Menos queries por listagem de infraestrutura e envio de mensagens.
- Repositório sem artefatos legados e bundle mais enxuto.

## Encerramento

Todas as métricas acima foram atendidas no estado atual da `main`.
