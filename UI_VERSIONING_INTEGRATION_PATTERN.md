# 📘 Padrão de Integração UI - Sistema de Versionamento

**Data**: 13/12/2025
**Versão**: 1.0
**Status**: ✅ Validado e testado no módulo Residents

---

## 🎯 Objetivo

Este documento define o padrão completo para integrar o sistema de versionamento na camada de UI (interface do usuário) de todos os módulos do sistema Rafa ILPI.

---

## 📋 Checklist de Integração

Para cada módulo, siga este checklist:

### Lista (List View)
- [ ] ✅ Import do componente de histórico
- [ ] ✅ Import do ícone `History` do lucide-react
- [ ] ✅ Estado do drawer de histórico
- [ ] ✅ Botão "Ver Histórico" no dropdown menu
- [ ] ✅ Componente de drawer no final do JSX
- [ ] ✅ Correção do parâmetro `deleteReason` na mutation de exclusão

### Formulário de Edição (Edit Form)
- [ ] ✅ Campo `changeReason` obrigatório (mínimo 10 caracteres)
- [ ] ✅ Validação condicional no schema Zod
- [ ] ✅ Card destacado com documentação RDC 502/2021
- [ ] ✅ Inclusão do `changeReason` no payload de atualização

### Modal de Exclusão (Delete Modal)
- [ ] ✅ Campo `deleteReason` obrigatório (mínimo 10 caracteres)
- [ ] ✅ Validação de tamanho mínimo
- [ ] ✅ Card destacado com documentação RDC 502/2021
- [ ] ✅ Uso correto do parâmetro na API

---

## 🏗️ Implementação Passo a Passo

### 1. Lista (List View) - Botão "Ver Histórico"

#### 1.1. Imports Necessários

```typescript
// Componente customizado (se existir) ou GenericHistoryDrawer
import { ResidentHistoryDrawer } from '@/components/residents/ResidentHistoryDrawer'
// OU
import { GenericHistoryDrawer } from '@/components/shared/GenericHistoryDrawer'

// Ícone
import { History } from 'lucide-react'
```

#### 1.2. Estado do Drawer

```typescript
const [historyDrawer, setHistoryDrawer] = useState<{
  open: boolean
  {entity}Id: string | null
  {entity}Name?: string
}>({
  open: false,
  {entity}Id: null,
})
```

**Exemplo Real (Residents)**:
```typescript
const [historyDrawer, setHistoryDrawer] = useState<{
  open: boolean
  residentId: string | null
  residentName?: string
}>({
  open: false,
  residentId: null,
})
```

#### 1.3. Botão no Dropdown Menu

Adicione **após** o item "Prontuário" (ou similar) e **antes** de "Editar":

```tsx
<DropdownMenuItem
  onClick={() =>
    setHistoryDrawer({
      open: true,
      {entity}Id: {entity}.id,
      {entity}Name: {entity}.{nameField},
    })
  }
>
  <History className="mr-2 h-4 w-4" />
  Ver Histórico
</DropdownMenuItem>
<DropdownMenuSeparator />
```

**Exemplo Real (Residents)**:
```tsx
<DropdownMenuItem
  onClick={() =>
    setHistoryDrawer({
      open: true,
      residentId: resident.id,
      residentName: resident.fullName,
    })
  }
>
  <History className="mr-2 h-4 w-4" />
  Ver Histórico
</DropdownMenuItem>
<DropdownMenuSeparator />
```

#### 1.4. Componente Drawer no Final do JSX

**Opção A: Componente Customizado** (se já existir, como ResidentHistoryDrawer):

```tsx
{/* Drawer de Histórico */}
<{Entity}HistoryDrawer
  {entity}Id={historyDrawer.{entity}Id || undefined}
  {entity}Name={historyDrawer.{entity}Name}
  open={historyDrawer.open}
  onOpenChange={(open) =>
    setHistoryDrawer({ open, {entity}Id: null, {entity}Name: undefined })
  }
/>
```

**Opção B: GenericHistoryDrawer** (para módulos sem componente customizado):

```tsx
{/* Drawer de Histórico */}
<GenericHistoryDrawer
  open={historyDrawer.open}
  onOpenChange={(open) =>
    setHistoryDrawer({ open, {entity}Id: null })
  }
  data={history.data}
  isLoading={history.isLoading}
  error={history.error}
  title="Histórico de {Entity}"
  entityName={history.data?.{entity}?.{nameField} || ''}
/>
```

#### 1.5. Correção do Parâmetro `deleteReason`

**ATENÇÃO**: Este é um bug comum encontrado!

**❌ ERRADO**:
```typescript
await deleteMutation.mutateAsync({
  id: deleteModal.{entity}.id,
  changeReason: deleteChangeReason, // ❌ ERRADO!
})
```

**✅ CORRETO**:
```typescript
await deleteMutation.mutateAsync({
  id: deleteModal.{entity}.id,
  deleteReason: deleteChangeReason, // ✅ CORRETO!
})
```

---

### 2. Formulário de Edição - Campo `changeReason`

#### 2.1. Schema Zod - Campo Opcional

```typescript
const {entity}Schema = z.object({
  // ... outros campos

  // Motivo da alteração (obrigatório apenas no modo edição - RDC 502/2021 Art. 39)
  changeReason: z.string().optional(),
})
```

#### 2.2. Schema com Validação Condicional

```typescript
const {entity}FormSchema = (isEditMode: boolean) =>
  isEditMode
    ? {entity}Schema.extend({
        changeReason: z.string()
          .min(10, 'Motivo da alteração deve ter no mínimo 10 caracteres')
          .refine((val) => val.trim().length >= 10, {
            message: 'Motivo da alteração deve ter no mínimo 10 caracteres (sem contar espaços)'
          })
      })
    : {entity}Schema
```

#### 2.3. Card do Campo changeReason (Visível Apenas em Edição)

```tsx
{/* Campo de Motivo da Alteração - Obrigatório no modo edição (RDC 502/2021) */}
{isEditMode && !readOnly && (
  <Card className="shadow-lg mb-6 border-yellow-500/50">
    <CardContent className="p-6">
      <div className="space-y-2">
        <Label htmlFor="changeReason" className="text-base font-semibold">
          Motivo da Alteração <span className="text-danger">*</span>
        </Label>
        <p className="text-sm text-muted-foreground">
          Conforme RDC 502/2021 Art. 39, é obrigatório documentar o motivo de qualquer
          alteração no prontuário do residente.
        </p>
        <Textarea
          id="changeReason"
          placeholder="Ex: Atualização do endereço conforme solicitação da família em 12/12/2025..."
          {...register('changeReason')}
          className={cn(
            'min-h-[100px]',
            errors.changeReason && 'border-danger focus:border-danger'
          )}
        />
        {errors.changeReason && (
          <p className="text-sm text-danger mt-2">{errors.changeReason.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Mínimo de 10 caracteres. Este motivo ficará registrado permanentemente no histórico de alterações.
        </p>
      </div>
    </CardContent>
  </Card>
)}
```

#### 2.4. Inclusão no Payload de Atualização

```typescript
if (isEditMode) {
  // ... outros campos

  // changeReason é OBRIGATÓRIO no modo edição (RDC 502/2021 Art. 39)
  payload.changeReason = data.changeReason

  response = await api.patch(`/{entities}/${id}`, payload)
} else {
  response = await api.post('/{entities}', payload)
}
```

---

### 3. Modal de Exclusão - Campo `deleteReason`

#### 3.1. Estado para deleteReason

```typescript
const [deleteChangeReason, setDeleteChangeReason] = useState('')
const [deleteReasonError, setDeleteReasonError] = useState('')
```

#### 3.2. Validação ao Excluir

```typescript
const handleDelete = async () => {
  // Validação do motivo
  if (!deleteChangeReason || deleteChangeReason.trim().length < 10) {
    setDeleteReasonError('Motivo obrigatório (mínimo de 10 caracteres)')
    return
  }

  try {
    await deleteMutation.mutateAsync({
      id: deleteModal.{entity}.id,
      deleteReason: deleteChangeReason, // ✅ ATENÇÃO: deleteReason, não changeReason!
    })

    toast({
      title: 'Sucesso',
      description: '{Entity} removido com sucesso',
    })

    setDeleteModal({ open: false, {entity}: null })
    setDeleteChangeReason('')
    setDeleteReasonError('')
  } catch (error) {
    toast({
      title: 'Erro',
      description: 'Erro ao remover {entity}',
      variant: 'destructive',
    })
  }
}
```

#### 3.3. Card do Campo deleteReason no Modal

```tsx
<AlertDialog open={deleteModal.open} onOpenChange={(open) => setDeleteModal({ open, {entity}: null })}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
      <AlertDialogDescription>
        Tem certeza de que deseja excluir este {entity}? Esta ação não pode ser desfeita.
      </AlertDialogDescription>
    </AlertDialogHeader>

    {/* Card Destacado - RDC 502/2021 */}
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-2">
        <ShieldAlert className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
            Rastreabilidade Obrigatória (RDC 502/2021 Art. 39)
          </p>
          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
            Toda exclusão de registro deve ter justificativa documentada para fins de auditoria e conformidade regulatória.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="deleteChangeReason" className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
          Motivo da Exclusão <span className="text-danger">*</span>
        </Label>
        <Textarea
          id="deleteChangeReason"
          placeholder="Ex: Falecimento do residente em 12/12/2025 - Atestado de óbito nº 123456..."
          value={deleteChangeReason}
          onChange={(e) => {
            setDeleteChangeReason(e.target.value)
            setDeleteReasonError('')
          }}
          className={`min-h-[100px] ${deleteReasonError ? 'border-danger focus:border-danger' : ''}`}
        />
        {deleteReasonError && (
          <p className="text-sm text-danger mt-2">{deleteReasonError}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Mínimo de 10 caracteres. Este motivo ficará registrado permanentemente no histórico de alterações.
        </p>
      </div>
    </div>

    <AlertDialogFooter>
      <AlertDialogCancel onClick={() => {
        setDeleteChangeReason('')
        setDeleteReasonError('')
      }}>
        Cancelar
      </AlertDialogCancel>
      <AlertDialogAction
        onClick={handleDelete}
        className="bg-danger hover:bg-danger/90"
        disabled={deleteMutation.isPending}
      >
        {deleteMutation.isPending ? 'Removendo...' : 'Remover Definitivamente'}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## 🎨 Componentes Compartilhados

### GenericHistoryDrawer

Use para módulos que **não precisam** de customização especial.

**Props**:
```typescript
interface GenericHistoryDrawerProps<T> {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: HistoryResponse | undefined
  isLoading: boolean
  error: Error | null
  title: string
  entityName: string
  renderFieldChange?: (field: string, oldValue: any, newValue: any) => ReactNode
}
```

**Exemplo de Uso**:
```tsx
<GenericHistoryDrawer
  open={historyDrawer.open}
  onOpenChange={(open) => setHistoryDrawer({ open, vaccinationId: null })}
  data={history.data}
  isLoading={history.isLoading}
  error={history.error}
  title="Histórico de Vacinação"
  entityName={history.data?.vaccination?.vaccineName || ''}
/>
```

---

## 📊 Módulos por Status de Implementação

### ✅ Implementados (1/10)

1. **Residents** - Implementação completa e validada (referência)

### 🔄 Pendentes (9/10)

2. **Users** - Necessita integração UI
3. **Vaccinations** - Necessita integração UI
4. **Allergies** - Necessita integração UI
5. **Conditions** - Necessita integração UI
6. **VitalSigns** - Necessita integração UI
7. **ClinicalProfiles** - Necessita integração UI
8. **DietaryRestrictions** - Necessita integração UI
9. **Medications** - Necessita integração UI
10. **SOSMedications** - Necessita integração UI

---

## 🛠️ Ferramentas de Desenvolvimento

### Validação TypeScript

```bash
cd apps/frontend && npx tsc --noEmit
```

### Testes Manuais Recomendados

Para cada módulo implementado:

1. **Teste de Listagem**:
   - [ ] Verificar se botão "Ver Histórico" aparece no dropdown
   - [ ] Clicar no botão abre o drawer corretamente
   - [ ] Histórico carrega e exibe as versões

2. **Teste de Edição**:
   - [ ] Campo `changeReason` aparece apenas em modo edição
   - [ ] Validação de mínimo 10 caracteres funciona
   - [ ] Submissão com changeReason válido cria nova versão no histórico

3. **Teste de Exclusão**:
   - [ ] Modal de exclusão exibe campo `deleteReason`
   - [ ] Validação de mínimo 10 caracteres funciona
   - [ ] Exclusão com deleteReason válido registra no histórico
   - [ ] Parâmetro correto (`deleteReason`, não `changeReason`)

---

## 🚨 Armadilhas Comuns (Lessons Learned)

### 1. ❌ Usar `changeReason` em vez de `deleteReason`

**Problema**:
```typescript
await deleteMutation.mutateAsync({
  id: entity.id,
  changeReason: deleteChangeReason, // ❌ ERRADO!
})
```

**Solução**:
```typescript
await deleteMutation.mutateAsync({
  id: entity.id,
  deleteReason: deleteChangeReason, // ✅ CORRETO!
})
```

**Onde verificar**: Handlers de delete em List Views

---

### 2. ❌ Esquecer de invalidar queries de histórico

**Problema**:
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['{entities}'] })
  // ❌ Faltou invalidar o histórico!
}
```

**Solução**:
```typescript
onSuccess: (_, variables) => {
  queryClient.invalidateQueries({ queryKey: ['{entities}'] })
  queryClient.invalidateQueries({ queryKey: ['{entity}-history', variables.id] }) // ✅
}
```

**Onde verificar**: Hooks de atualização (useUpdate{Entity})

---

### 3. ❌ Campo changeReason visível em modo criação

**Problema**:
```tsx
{/* ❌ Sempre visível, mesmo em modo criação */}
<Card>
  <Label>Motivo da Alteração</Label>
  <Textarea {...register('changeReason')} />
</Card>
```

**Solução**:
```tsx
{/* ✅ Visível apenas em modo edição */}
{isEditMode && !readOnly && (
  <Card>
    <Label>Motivo da Alteração</Label>
    <Textarea {...register('changeReason')} />
  </Card>
)}
```

**Onde verificar**: Formulários de edição

---

### 4. ❌ Validação de changeReason sempre ativa no schema

**Problema**:
```typescript
const schema = z.object({
  changeReason: z.string().min(10), // ❌ Sempre obrigatório, mesmo em criação
})
```

**Solução**:
```typescript
const schema = z.object({
  changeReason: z.string().optional(), // Base: opcional
})

const editSchema = (isEditMode: boolean) =>
  isEditMode
    ? schema.extend({
        changeReason: z.string().min(10) // ✅ Obrigatório apenas em edição
      })
    : schema
```

**Onde verificar**: Schema Zod dos formulários

---

## 📚 Referências

### Código de Referência (Residents)

- **Lista**: `apps/frontend/src/pages/residents/ResidentsList.tsx`
  - Linhas 5: Import ResidentHistoryDrawer
  - Linhas 63: Import ícone History
  - Linhas 80-87: Estado historyDrawer
  - Linhas 441-452: Botão "Ver Histórico" no dropdown
  - Linhas 592-599: Componente ResidentHistoryDrawer
  - Linha 128: Fix deleteReason (não changeReason)

- **Formulário**: `apps/frontend/src/pages/residents/ResidentForm.tsx`
  - Linhas 76-77: Campo changeReason no schema base
  - Linhas 187-194: Validação condicional
  - Linhas 961-989: Card do campo changeReason (apenas edição)
  - Linhas 768-769: Inclusão no payload

- **API**: `apps/frontend/src/api/residents.api.ts`
  - Linhas 242-329: UpdateResidentDto com changeReason
  - Linhas 415-420: delete() com deleteReason

- **Hooks**: `apps/frontend/src/hooks/useResidents.ts`
  - Linhas 54-79: useUpdateResident com toast e invalidation
  - Linhas 82-105: useDeleteResident com deleteReason
  - Linhas 148-164: useResidentVersioning agregador

### Documentação

- [SPRINT_8_SUMMARY.md](SPRINT_8_SUMMARY.md) - Resumo completo da Sprint 8
- [FRONTEND_VERSIONING_IMPLEMENTATION.md](FRONTEND_VERSIONING_IMPLEMENTATION.md) - Guia original
- [AUDIT-VERSIONING-IMPLEMENTATION-PLAN.md](docs/AUDIT-VERSIONING-IMPLEMENTATION-PLAN.md) - Plano de versionamento

### Regulamentações

- **RDC 502/2021 (ANVISA) Art. 39**: Rastreabilidade de alterações em prontuários
- **LGPD Art. 48**: Segurança e transparência no tratamento de dados pessoais

---

## ✅ Critérios de Aceitação

Um módulo está **completo** quando:

1. ✅ Botão "Ver Histórico" funcional na lista
2. ✅ Campo `changeReason` obrigatório em edições (mínimo 10 caracteres)
3. ✅ Campo `deleteReason` obrigatório em exclusões (mínimo 10 caracteres)
4. ✅ Drawer de histórico exibe todas as versões corretamente
5. ✅ Zero erros TypeScript relacionados ao módulo
6. ✅ Testes manuais passando (listagem, edição, exclusão)
7. ✅ Toast notifications funcionando em todas as operações
8. ✅ Query invalidation automática (lista + histórico)

---

**Documento criado por**: Claude Sonnet 4.5 + Dr. Emanuel
**Validado em**: Módulo Residents (100%)
**Próximo módulo**: A ser definido
