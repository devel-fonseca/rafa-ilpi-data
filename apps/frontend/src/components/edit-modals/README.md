# Modais de Edição de Registros Diários

## Status da Implementação

✅ **Completos:**
- EditAlimentacaoModal - Modal com stepper (4 etapas) para edição de alimentação
- EditMonitoramentoModal - Modal simples para edição de sinais vitais

⏳ **Pendentes:**
- EditHigieneModal
- EditHidratacaoModal
- EditEliminacaoModal
- EditComportamentoModal
- EditIntercorrenciaModal
- EditAtividadesModal
- EditVisitaModal
- EditOutrosModal

## Padrão de Implementação

### Estrutura Base de um Modal de Edição

Todos os modais de edição devem seguir este padrão:

```typescript
import React, { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Edit } from 'lucide-react'
// ... outros imports

// 1. Schema Zod com validações + editReason obrigatório
const editSchema = z.object({
  time: z.string().min(1).regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
  // ... campos específicos do tipo de registro
  observacoes: z.string().optional(),
  editReason: z.string().min(10, 'Motivo deve ter pelo menos 10 caracteres'),
})

// 2. Interface Props
interface EditModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  record: any  // Registro a ser editado
  isUpdating?: boolean
}

// 3. Componente
export function EditXxxModal({ open, onClose, onSubmit, record, isUpdating }: EditModalProps) {
  const { register, handleSubmit, control, formState: { errors }, reset } = useForm({
    resolver: zodResolver(editSchema),
  })

  // 4. Preencher form com dados do registro ao abrir
  useEffect(() => {
    if (record && open) {
      reset({
        time: record.time,
        // ... mapear record.data.campo para cada campo
        observacoes: record.notes || '',
        editReason: '',
      })
    }
  }, [record, open, reset])

  // 5. Submit handler
  const handleFormSubmit = (data: FormData) => {
    const payload = {
      time: data.time,
      data: {
        // ... campos específicos
      },
      notes: data.observacoes,
      editReason: data.editReason,
    }
    onSubmit(payload)
  }

  // 6. JSX do Dialog
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Edit /> Editar [Tipo]
          </DialogTitle>
          <DialogDescription>
            É obrigatório informar o motivo da edição para auditoria.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          {/* Campos editáveis */}

          {/* Box com info do registro original */}
          <div className="bg-muted/30 p-4 rounded-lg">
            <p>Registrado por: {record.recordedBy}</p>
            <p>Data: {new Date(record.date).toLocaleDateString('pt-BR')}</p>
          </div>

          {/* Campo de motivo OBRIGATÓRIO */}
          <div>
            <Label>Motivo da edição *</Label>
            <Textarea {...register('editReason')} />
            {errors.editReason && <p className="text-danger">{errors.editReason.message}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

## Modais Pendentes - Referência

### EditHigieneModal
**Campos a editar:**
- time (horário)
- tipo (Banho Completo, Banho Parcial, Higiene Oral, Troca de Fralda, Troca de Roupa)
- auxilioNecessario (boolean)
- observacoes (string)
- editReason (obrigatório, min 10 chars)

**Modal original:** `/pages/daily-records/modals/HigieneModal.tsx`

### EditHidratacaoModal
**Campos a editar:**
- time
- volumeMl (number)
- tipo (Água, Suco, Chá, Leite, Outros)
- observacoes
- editReason

**Modal original:** `/pages/daily-records/modals/HidratacaoModal.tsx`

### EditEliminacaoModal
**Campos a editar:**
- time
- tipo (Diurese, Evacuação, Ambas)
- caracteristicas (para Evacuação: Normal, Pastosa, Líquida, Endurecida)
- observacoes
- editReason

**Modal original:** `/pages/daily-records/modals/EliminacaoModal.tsx`

### EditComportamentoModal
**Campos a editar:**
- time
- humor (Calmo, Agitado, Ansioso, Deprimido, Agressivo, Confuso)
- nivelAtividade (Ativo, Moderado, Sedentário, Acamado)
- interacaoSocial (Boa, Regular, Isolado)
- observacoes
- editReason

**Modal original:** `/pages/daily-records/modals/ComportamentoModal.tsx`

### EditIntercorrenciaModal
**Campos a editar:**
- time
- tipo (Queda, Febre, Dor, Ferimento, Alteração de comportamento, Outro)
- gravidade (Leve, Moderada, Grave)
- descricao (string)
- providenciasTomadas (string)
- observacoes
- editReason

**Modal original:** `/pages/daily-records/modals/IntercorrenciaModal.tsx`

### EditAtividadesModal
**Campos a editar:**
- time
- tipo (Fisioterapia, Terapia Ocupacional, Recreação, Exercício, Música, Arte, Passeio, Outros)
- duracao (number em minutos)
- participacao (Ativa, Passiva, Recusou)
- observacoes
- editReason

**Modal original:** `/pages/daily-records/modals/AtividadesModal.tsx`

### EditVisitaModal
**Campos a editar:**
- time
- visitantes (array de strings ou string separada por vírgula)
- duracao (number em minutos)
- observacoes
- editReason

**Modal original:** `/pages/daily-records/modals/VisitaModal.tsx`

### EditOutrosModal
**Campos a editar:**
- time
- descricao (string obrigatória)
- observacoes
- editReason

**Modal original:** `/pages/daily-records/modals/OutrosModal.tsx`

## Checklist para Criar um Novo Modal de Edição

1. [ ] Copiar o arquivo `EditMonitoramentoModal.tsx` como template
2. [ ] Renomear para `Edit[Tipo]Modal.tsx`
3. [ ] Abrir o modal original em `/pages/daily-records/modals/[Tipo]Modal.tsx`
4. [ ] Copiar o schema Zod e adicionar `editReason: z.string().min(10)`
5. [ ] Atualizar o useEffect para mapear `record.data.campo` aos campos do form
6. [ ] Copiar os campos do formulário do modal original
7. [ ] Adicionar a seção de informações do registro original
8. [ ] Adicionar o campo de motivo da edição (sempre no final)
9. [ ] Ajustar o payload no handleFormSubmit mantendo a estrutura `{ time, data: {...}, notes, editReason }`
10. [ ] Exportar no `index.ts`
11. [ ] Adicionar ao switch/case no `ResidentMedicalRecord.tsx`
12. [ ] Testar o modal com um registro real

## Integração no ResidentMedicalRecord

Após criar todos os modais, adicionar ao componente principal:

```typescript
import {
  EditAlimentacaoModal,
  EditMonitoramentoModal,
  EditHigieneModal,
  // ... outros
} from '@/components/edit-modals'

// No handleOpenEdit, renderizar o modal correto baseado no record.type:
{editingRecord?.type === 'ALIMENTACAO' && (
  <EditAlimentacaoModal
    open={editModalOpen}
    onClose={() => setEditModalOpen(false)}
    onSubmit={handleConfirmEdit}
    record={editingRecord}
    isUpdating={isUpdating}
  />
)}

{editingRecord?.type === 'MONITORAMENTO' && (
  <EditMonitoramentoModal ... />
)}
// ... repetir para todos os tipos
```

## Observações Importantes

1. **Motivo da Edição:** SEMPRE obrigatório com mínimo 10 caracteres
2. **Payload Structure:** Manter consistência: `{ time, data: {...}, notes, editReason }`
3. **Reset Form:** Usar useEffect para popular o form quando `record` ou `open` mudar
4. **Validations:** Manter as mesmas validações do modal de criação
5. **Loading State:** Respeitar `isUpdating` prop para desabilitar botões
6. **Original Info Box:** Sempre mostrar quem registrou e quando
7. **Type Safety:** Usar o schema Zod para type inference: `type FormData = z.infer<typeof schema>`

## Backend - UpdateDailyRecordDto

O backend já está preparado para receber qualquer campo do registro + editReason:

```typescript
{
  time?: string
  date?: string
  data?: any  // objeto com campos específicos do tipo
  recordedBy?: string
  notes?: string
  editReason: string  // OBRIGATÓRIO (min 10 chars)
}
```

O backend valida, cria snapshot, registra no histórico e atualiza o registro automaticamente.
