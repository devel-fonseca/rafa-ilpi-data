# Correção de Erro HTTP 500 - Endpoint /api/floors

**Data:** 2025-11-20
**Responsável:** Dr. E. (Emanuel)
**Projeto:** RAFA ILPI Data - Correção de erro em endpoint de andares

---

## Problema Identificado

### Sintoma
- Requisição GET para `http://localhost:3000/api/floors` retorna HTTP 500 Internal Server Error
- Seed executado com sucesso (1 prédio, 2 andares, 9 quartos, 23 leitos)
- Módulos registrados corretamente no AppModule

### Causa Raiz
**FloorsController usa AuditInterceptor, mas não possui o decorador @AuditEntity**

**Análise:**
1. ✅ FloorsModule está registrado no AppModule
2. ✅ PrismaModule está disponível globalmente
3. ✅ FloorsService tem injeção de PrismaService correta
4. ❌ **FloorsController usa @UseInterceptors(AuditInterceptor)** (linha 20)
5. ❌ **FloorsController NÃO possui decorador @AuditEntity('Floor')**
6. ❌ AuditInterceptor espera metadados de `auditEntity` (linha 33-35 do audit.interceptor.ts)
7. ❌ Quando `auditEntity` é undefined, pode causar erro ao tentar registrar no audit log

**Código problemático em `/apps/backend/src/floors/floors.controller.ts`:**
```typescript
@Controller('floors')
@UseInterceptors(AuditInterceptor)  // ❌ Usa interceptor
export class FloorsController {
  // ❌ Falta @AuditEntity('Floor')
```

**Comparação com outros controllers:**
- BuildingsController, RoomsController e BedsController provavelmente têm o mesmo problema
- ResidentsController e TenantsController devem ter implementação correta

---

## Plano de Correção

### Tarefa 1: Adicionar @AuditEntity no FloorsController
- [ ] Importar `AuditEntity` de `../audit/audit.decorator`
- [ ] Adicionar decorador `@AuditEntity('Floor')` no controller
- [ ] Verificar que o decorador está ANTES de `@UseInterceptors`

### Tarefa 2: Verificar BuildingsController
- [ ] Verificar se tem `@UseInterceptors(AuditInterceptor)`
- [ ] Verificar se tem `@AuditEntity('Building')`
- [ ] Adicionar se necessário

### Tarefa 3: Verificar RoomsController
- [ ] Verificar se tem `@UseInterceptors(AuditInterceptor)`
- [ ] Verificar se tem `@AuditEntity('Room')`
- [ ] Adicionar se necessário

### Tarefa 4: Verificar BedsController
- [ ] Verificar se tem `@UseInterceptors(AuditInterceptor)`
- [ ] Verificar se tem `@AuditEntity('Bed')`
- [ ] Adicionar se necessário

### Tarefa 5: Testar endpoint corrigido
- [ ] Reiniciar servidor backend
- [ ] Fazer GET para `/api/floors`
- [ ] Verificar resposta HTTP 200
- [ ] Verificar estrutura JSON retornada

### Tarefa 6: Commit das correções
- [ ] Adicionar arquivos modificados
- [ ] Criar commit descritivo
- [ ] Verificar git status

---

## Arquivos que Precisam Ser Corrigidos

1. `/apps/backend/src/floors/floors.controller.ts`
2. `/apps/backend/src/buildings/buildings.controller.ts` (verificar)
3. `/apps/backend/src/rooms/rooms.controller.ts` (verificar)
4. `/apps/backend/src/beds/beds.controller.ts` (verificar)

---

## Código de Correção

### FloorsController - Adicionar estas linhas:

```typescript
import { AuditEntity } from '../audit/audit.decorator'  // ← ADICIONAR IMPORT

@Controller('floors')
@AuditEntity('Floor')  // ← ADICIONAR DECORADOR
@UseInterceptors(AuditInterceptor)
export class FloorsController {
  // ... resto do código
}
```

### Padrão para os outros controllers:

```typescript
import { AuditEntity } from '../audit/audit.decorator'

@Controller('buildings')
@AuditEntity('Building')
@UseInterceptors(AuditInterceptor)
export class BuildingsController { ... }

@Controller('rooms')
@AuditEntity('Room')
@UseInterceptors(AuditInterceptor)
export class RoomsController { ... }

@Controller('beds')
@AuditEntity('Bed')
@UseInterceptors(AuditInterceptor)
export class BedsController { ... }
```

---

## Próximos Passos Após Correção

1. Testar endpoint GET `/api/floors`
2. Testar endpoint GET `/api/buildings`
3. Testar endpoint GET `/api/rooms`
4. Testar endpoint GET `/api/beds`
5. Testar página de mapa de quartos no frontend
6. Verificar logs de auditoria no banco de dados

---

## Causa Raiz Identificada (Update)

**O problema NÃO é apenas o @AuditEntity. É a falta de GUARDS!**

Comparação:
- **ResidentsController** (FUNCIONA): Tem `@UseGuards(JwtAuthGuard, RolesGuard)` na classe
- **FloorsController** (ERRO 500): NÃO tem guards na classe

Quando não há guards, `request.user` é `undefined`. Quando o AuditInterceptor tenta acessar `user.tenant` (linha 44 do audit.interceptor.ts), gera erro HTTP 500.

## Plano Corrigido

### Tarefa 1: Adicionar Guards ao FloorsController ✅
- [ ] Adicionar import de JwtAuthGuard e RolesGuard
- [ ] Adicionar `@UseGuards(JwtAuthGuard, RolesGuard)` na classe

### Tarefa 2: Adicionar Guards ao BuildingsController
- [ ] Adicionar imports
- [ ] Adicionar `@UseGuards(JwtAuthGuard, RolesGuard)`

### Tarefa 3: Adicionar Guards ao RoomsController
- [ ] Adicionar imports
- [ ] Adicionar `@UseGuards(JwtAuthGuard, RolesGuard)`

### Tarefa 4: Adicionar Guards ao BedsController
- [ ] Adicionar imports
- [ ] Adicionar `@UseGuards(JwtAuthGuard, RolesGuard)`

### Tarefa 5: Testar endpoints
- [ ] GET `/api/buildings` → 200
- [ ] GET `/api/floors` → 200
- [ ] GET `/api/rooms` → 200
- [ ] GET `/api/beds` → 200

### Tarefa 6: Commit das correções
- [ ] Commit com mensagem descritiva

## Status
- ⏳ **EM PROGRESSO** - Implementando a solução corrigida
