# Guia de Integração - Daily Records Versionamento

Este guia documenta como integrar o sistema de versionamento de Daily Records em qualquer página/componente do frontend.

## 📋 Índice

1. [Componentes Disponíveis](#componentes-disponíveis)
2. [Hooks React Query](#hooks-react-query)
3. [Exemplos de Uso](#exemplos-de-uso)
4. [Validações Obrigatórias](#validações-obrigatórias)
5. [Conformidade Regulatória](#conformidade-regulatória)

---

## 🧩 Componentes Disponíveis

### 1. `DailyRecordActions`

Componente de ações completo (Edit/Delete/History) para qualquer lista de registros.

**Localização:** `src/pages/daily-records/components/DailyRecordActions.tsx`

**Props:**
```typescript
interface DailyRecordActionsProps {
  record: DailyRecord
  onActionComplete?: () => void
}
```

**Exemplo:**
```tsx
import { DailyRecordActions } from '@/pages/daily-records/components/DailyRecordActions'

function DailyRecordsList({ records }) {
  const queryClient = useQueryClient()

  return (
    <div>
      {records.map(record => (
        <div key={record.id} className="flex items-center justify-between">
          <div>{record.type} - {record.time}</div>
          <DailyRecordActions
            record={record}
            onActionComplete={() => {
              queryClient.invalidateQueries(['daily-records'])
            }}
          />
        </div>
      ))}
    </div>
  )
}
```

---

### 2. `EditDailyRecordModal`

Modal genérico de edição com validação de `editReason`.

**Localização:** `src/pages/daily-records/modals/EditDailyRecordModal.tsx`

**Props:**
```typescript
interface EditDailyRecordModalProps {
  record: DailyRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}
```

**Validações:**
- ✅ `editReason` obrigatório (min 10 caracteres sem espaços)
- ✅ `time` formato HH:mm (opcional)
- ✅ `notes` texto livre (opcional)

**Exemplo:**
```tsx
import { EditDailyRecordModal } from '@/pages/daily-records/modals/EditDailyRecordModal'

function MyComponent() {
  const [selectedRecord, setSelectedRecord] = useState<DailyRecord | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)

  return (
    <>
      <button onClick={() => {
        setSelectedRecord(record)
        setEditModalOpen(true)
      }}>
        Editar
      </button>

      <EditDailyRecordModal
        record={selectedRecord}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSuccess={() => {
          // Refetch data
          queryClient.invalidateQueries(['daily-records'])
        }}
      />
    </>
  )
}
```

---

### 3. `DeleteDailyRecordModal`

Modal de confirmação de exclusão com validação de `deleteReason`.

**Localização:** `src/pages/daily-records/modals/DeleteDailyRecordModal.tsx`

**Props:**
```typescript
interface DeleteDailyRecordModalProps {
  record: DailyRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}
```

**Validações:**
- ✅ `deleteReason` obrigatório (min 10 caracteres sem espaços)
- ✅ Soft delete (registro mantido com `deletedAt`)

**Exemplo:**
```tsx
import { DeleteDailyRecordModal } from '@/pages/daily-records/modals/DeleteDailyRecordModal'

function MyComponent() {
  const [selectedRecord, setSelectedRecord] = useState<DailyRecord | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  return (
    <>
      <button onClick={() => {
        setSelectedRecord(record)
        setDeleteModalOpen(true)
      }}>
        Excluir
      </button>

      <DeleteDailyRecordModal
        record={selectedRecord}
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onSuccess={() => {
          queryClient.invalidateQueries(['daily-records'])
        }}
      />
    </>
  )
}
```

---

### 4. `DailyRecordHistoryModal`

Modal de visualização de histórico completo de auditoria.

**Localização:** `src/components/DailyRecordHistoryModal.tsx`

**Props:**
```typescript
interface DailyRecordHistoryModalProps {
  recordId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onRecordUpdated?: () => void
}
```

**Features:**
- ✅ Timeline visual de versões
- ✅ Filtros por usuário e tipo de alteração
- ✅ Comparação lado a lado (diff)
- ✅ Botão de restauração de versões
- ✅ Exportação para PDF

---

## 🪝 Hooks React Query

### 1. `useDailyRecordVersioning`

Hook agregado que fornece todas as operações de versionamento.

**Localização:** `src/hooks/useDailyRecordVersioning.ts`

**Exemplo Completo:**
```tsx
import { useDailyRecordVersioning } from '@/hooks/useDailyRecordVersioning'

function DailyRecordsPage() {
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null)
  const { history, update, remove, restore, isLoading } = useDailyRecordVersioning(selectedRecordId)

  // Exemplo: Atualizar registro
  const handleUpdate = () => {
    update.mutate({
      id: selectedRecordId!,
      data: {
        editReason: 'Correção de horário após revisão',
        time: '14:30',
        notes: 'Horário corrigido conforme anotação no livro',
      }
    })
  }

  // Exemplo: Excluir registro
  const handleDelete = () => {
    remove.mutate({
      id: selectedRecordId!,
      deleteReason: 'Registro duplicado identificado'
    })
  }

  // Exemplo: Restaurar versão
  const handleRestore = (versionId: string) => {
    restore.mutate({
      recordId: selectedRecordId!,
      versionId,
      restoreReason: 'Reverter alterações incorretas'
    })
  }

  if (isLoading) return <div>Carregando...</div>

  return (
    <div>
      <h2>Histórico de Versões</h2>
      {history.data?.history.map(version => (
        <div key={version.id}>
          <p>Versão {version.versionNumber}</p>
          <p>Tipo: {version.changeType}</p>
          <p>Motivo: {version.changeReason}</p>
          <p>Alterado por: {version.changedByName}</p>
          <button onClick={() => handleRestore(version.id)}>
            Restaurar esta versão
          </button>
        </div>
      ))}
    </div>
  )
}
```

### 2. Hooks Individuais

**`useUpdateDailyRecord`**
```tsx
const update = useUpdateDailyRecord()

update.mutate({
  id: 'record-id',
  data: {
    editReason: 'Motivo com mais de 10 caracteres',
    time: '15:30'
  }
})
```

**`useDeleteDailyRecord`**
```tsx
const remove = useDeleteDailyRecord()

remove.mutate({
  id: 'record-id',
  deleteReason: 'Registro duplicado acidentalmente'
})
```

**`useRestoreDailyRecordVersion`**
```tsx
const restore = useRestoreDailyRecordVersion()

restore.mutate({
  recordId: 'record-id',
  versionId: 'version-id',
  restoreReason: 'Reverter alterações incorretas aplicadas'
})
```

---

## ✅ Validações Obrigatórias

### Frontend (Zod)

```typescript
// EditReason validation
const editReasonSchema = z.string()
  .min(1, 'Motivo da edição é obrigatório')
  .refine(
    (value) => {
      const cleaned = value.replace(/\s+/g, '')
      return cleaned.length >= 10
    },
    { message: 'Motivo deve ter pelo menos 10 caracteres (sem contar espaços)' }
  )

// DeleteReason validation
const deleteReasonSchema = z.string()
  .min(1, 'Motivo da exclusão é obrigatório')
  .refine(
    (value) => {
      const cleaned = value.replace(/\s+/g, '')
      return cleaned.length >= 10
    },
    { message: 'Motivo deve ter pelo menos 10 caracteres (sem contar espaços)' }
  )
```

### Backend (class-validator)

```typescript
// UpdateDailyRecordDto
@IsString({ message: 'Motivo da edição deve ser um texto' })
@MinLength(10, { message: 'Motivo da edição deve ter pelo menos 10 caracteres' })
editReason: string

// DeleteDailyRecordDto
@IsString({ message: 'Motivo da exclusão deve ser um texto' })
@MinLength(10, { message: 'Motivo da exclusão deve ter pelo menos 10 caracteres' })
deleteReason: string
```

---

## 📜 Conformidade Regulatória

### RDC 502/2021 Art. 39 (ANVISA)

✅ **Versionamento Imutável de Prontuários**
- Todo registro inicial cria entrada com `changeType = 'CREATE'`
- Toda atualização cria entrada com `changeType = 'UPDATE'`
- Toda exclusão cria entrada com `changeType = 'DELETE'`
- Histórico nunca é modificado ou deletado

✅ **Rastreabilidade Completa**
- `changedBy`: UUID do usuário que fez a alteração
- `changedByName`: Nome completo do usuário
- `changedAt`: Timestamp com timezone (TIMESTAMPTZ)
- `ipAddress`: IP da requisição
- `userAgent`: Browser/device usado

✅ **Motivo Obrigatório**
- Toda edição/exclusão exige justificativa mínima de 10 caracteres
- Validação dupla: frontend (UX) + backend (segurança)

### LGPD Art. 5º, II

✅ **Proteção de Dados Sensíveis**
- Dados de saúde armazenados com auditoria completa
- Histórico preserva snapshots antes/depois
- Controle de acesso por tenant

### LGPD Art. 46

✅ **Medidas Técnicas de Segurança**
- Transações atômicas (Prisma `$transaction`)
- Soft delete (preservação de dados)
- Criptografia em trânsito (HTTPS)

### LGPD Art. 48

✅ **Rastreabilidade de Operações**
- Registro completo: quem, quando, onde, por quê
- Histórico imutável para auditorias
- Possibilidade de restauração de versões

---

## 🔄 Fluxo de Dados

### Criação de Registro
```
Frontend → POST /daily-records
Backend → Prisma Transaction:
  1. Create DailyRecord (versionNumber = 1)
  2. Create DailyRecordHistory (changeType = CREATE, previousData = null)
  3. Create VitalSign (se MONITORAMENTO)
Backend → Response com registro criado
Frontend → Invalidate queries ['daily-records']
```

### Atualização de Registro
```
Frontend → PATCH /daily-records/:id { editReason, ...data }
Backend → Validação: editReason.length >= 10
Backend → Prisma Transaction:
  1. Fetch current state
  2. Calculate changedFields (diff previousData vs newData)
  3. Update DailyRecord (versionNumber++)
  4. Create DailyRecordHistory (changeType = UPDATE, previousData, newData)
  5. Update VitalSign (se MONITORAMENTO)
Backend → Response com registro atualizado
Frontend → Invalidate queries ['daily-records', 'daily-record-history']
```

### Exclusão de Registro
```
Frontend → DELETE /daily-records/:id { deleteReason }
Backend → Validação: deleteReason.length >= 10
Backend → Prisma Transaction:
  1. Fetch current state
  2. Update DailyRecord (deletedAt = now, versionNumber++)
  3. Create DailyRecordHistory (changeType = DELETE)
  4. Delete VitalSign (se MONITORAMENTO)
Backend → Response de confirmação
Frontend → Invalidate queries ['daily-records']
```

### Restauração de Versão
```
Frontend → POST /daily-records/:id/restore { versionId, restoreReason }
Backend → Validação: restoreReason.length >= 10
Backend → Prisma Transaction:
  1. Fetch versão específica do histórico
  2. Restaurar dados da versão (newData → registro atual)
  3. Incrementar versionNumber
  4. Create DailyRecordHistory (changeType = UPDATE, changeReason com "Restauração")
Backend → Response com registro restaurado
Frontend → Invalidate queries ['daily-records', 'daily-record-history']
```

---

## 🎯 Checklist de Integração

Ao integrar versionamento em uma nova página/feature:

- [ ] Importar `DailyRecordActions` ou modais individuais
- [ ] Usar hook `useDailyRecordVersioning` para operações
- [ ] Invalidar queries `['daily-records']` após mutações
- [ ] Validar `editReason`/`deleteReason` com min 10 chars (sem espaços)
- [ ] Exibir feedback ao usuário (toast) em caso de sucesso/erro
- [ ] Testar fluxo completo: Create → Update → Delete → Restore
- [ ] Verificar que histórico está sendo criado corretamente
- [ ] Validar isolamento de tenant (não acessar dados de outros tenants)

---

## 📚 Referências

- **Backend DTOs:**
  - `apps/backend/src/daily-records/dto/update-daily-record.dto.ts`
  - `apps/backend/src/daily-records/dto/delete-daily-record.dto.ts`

- **Frontend API Client:**
  - `apps/frontend/src/api/dailyRecords.api.ts`

- **Schema do Banco:**
  - `apps/backend/prisma/schema.prisma` (DailyRecordHistory model)

- **Testes E2E:**
  - `apps/backend/test/e2e/daily-record-versioning.e2e-spec.ts`

---

**Última atualização:** 12/12/2025
**Versão:** 1.0.0
