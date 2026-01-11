# 🔔 Diálogos de Confirmação Padronizados

Sistema de diálogos de confirmação integrado ao design system, substituindo `window.confirm()` com UI consistente e customizável.

## 📋 Componentes

### `ConfirmDialog`
Componente base de diálogo de confirmação com suporte a diferentes variantes visuais.

### `useConfirmDialog`
Hook que simplifica o uso de diálogos com API Promise-based.

---

## 🎯 Uso Básico

### 1. Com Hook (Recomendado)

```tsx
import { useConfirmDialog } from '@/hooks/useConfirmDialog'

function MyComponent() {
  const { ConfirmDialog, confirm } = useConfirmDialog()

  const handleDiscard = async () => {
    const confirmed = await confirm({
      title: 'Descartar alterações?',
      description: 'As informações preenchidas serão perdidas e não poderão ser recuperadas.',
      confirmText: 'Descartar',
      cancelText: 'Continuar editando',
      variant: 'warning',
    })

    if (confirmed) {
      // Usuário confirmou
      navigate('/back')
    } else {
      // Usuário cancelou
      console.log('Operação cancelada')
    }
  }

  return (
    <>
      <Button onClick={handleDiscard}>Cancelar</Button>

      {/* Renderizar o componente ConfirmDialog */}
      <ConfirmDialog />
    </>
  )
}
```

### 2. Com Componente Direto

```tsx
import { useState } from 'react'
import { ConfirmDialog } from '@/components/dialogs'

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false)

  const handleConfirm = () => {
    // Lógica de confirmação
    deleteItem()
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Excluir</Button>

      <ConfirmDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        title="Excluir item?"
        description="Esta ação não pode ser desfeita."
        confirmText="Excluir"
        variant="destructive"
        onConfirm={handleConfirm}
      />
    </>
  )
}
```

---

## 🎨 Variantes

### `default` (Informativo)
Usado para confirmações gerais, não destrutivas.

```tsx
const confirmed = await confirm({
  title: 'Salvar rascunho?',
  description: 'Suas alterações serão salvas como rascunho.',
  variant: 'default', // Azul (primary)
})
```

### `warning` (Aviso)
Usado para ações que resultam em perda de dados, mas não são permanentes.

```tsx
const confirmed = await confirm({
  title: 'Descartar alterações?',
  description: 'As informações preenchidas serão perdidas.',
  variant: 'warning', // Amarelo/Laranja
})
```

### `destructive` (Destrutivo)
Usado para ações irreversíveis como exclusões.

```tsx
const confirmed = await confirm({
  title: 'Excluir documento?',
  description: 'Esta ação não pode ser desfeita. O documento será permanentemente removido.',
  confirmText: 'Excluir permanentemente',
  variant: 'destructive', // Vermelho
})
```

---

## 📐 Props do ConfirmDialog

| Prop | Tipo | Default | Descrição |
|------|------|---------|-----------|
| `open` | `boolean` | - | **Obrigatório**. Controla visibilidade |
| `onOpenChange` | `(open: boolean) => void` | - | **Obrigatório**. Callback de mudança de estado |
| `title` | `string` | - | **Obrigatório**. Título do diálogo |
| `description` | `string` | - | **Obrigatório**. Mensagem explicativa |
| `confirmText` | `string` | `"Confirmar"` | Texto do botão de confirmação |
| `cancelText` | `string` | `"Cancelar"` | Texto do botão de cancelamento |
| `variant` | `'default' \| 'warning' \| 'destructive'` | `'default'` | Variante visual |
| `onConfirm` | `() => void` | - | **Obrigatório**. Callback ao confirmar |
| `onCancel` | `() => void` | - | Callback ao cancelar (opcional) |

---

## 🏗️ Padrões de Uso

### ❌ Antes (window.confirm)

```tsx
const handleDelete = () => {
  if (window.confirm('Tem certeza?')) {
    deleteItem()
  }
}
```

**Problemas:**
- Design inconsistente com o sistema
- Não customizável
- UX inferior
- Aparência varia entre navegadores

### ✅ Depois (ConfirmDialog)

```tsx
const { ConfirmDialog, confirm } = useConfirmDialog()

const handleDelete = async () => {
  const confirmed = await confirm({
    title: 'Excluir item?',
    description: 'Esta ação não pode ser desfeita.',
    variant: 'destructive',
  })

  if (confirmed) {
    deleteItem()
  }
}

return (
  <>
    <Button onClick={handleDelete}>Excluir</Button>
    <ConfirmDialog />
  </>
)
```

**Benefícios:**
- ✅ Design integrado ao sistema
- ✅ Totalmente customizável
- ✅ UX superior com ícones e cores
- ✅ Consistente em todos os navegadores
- ✅ Acessível (keyboard navigation, screen readers)

---

## 🎯 Casos de Uso Comuns

### 1. Descartar Formulário

```tsx
const handleClose = async () => {
  if (isDirty) {
    const confirmed = await confirm({
      title: 'Descartar alterações?',
      description: 'As informações preenchidas serão perdidas.',
      confirmText: 'Descartar',
      cancelText: 'Continuar editando',
      variant: 'warning',
    })

    if (confirmed) {
      reset()
      onClose()
    }
  } else {
    onClose()
  }
}
```

### 2. Excluir Recurso

```tsx
const handleDelete = async () => {
  const confirmed = await confirm({
    title: 'Excluir documento?',
    description: 'Esta ação não pode ser desfeita. O documento será permanentemente removido.',
    confirmText: 'Excluir permanentemente',
    variant: 'destructive',
  })

  if (confirmed) {
    await deleteDocument(id)
    toast({ title: 'Documento excluído com sucesso' })
  }
}
```

### 3. Sair sem Salvar

```tsx
const handleNavigateAway = async (nextRoute: string) => {
  if (hasUnsavedChanges) {
    const confirmed = await confirm({
      title: 'Sair sem salvar?',
      description: 'Você tem alterações não salvas que serão perdidas.',
      confirmText: 'Sair sem salvar',
      variant: 'warning',
    })

    if (confirmed) {
      navigate(nextRoute)
    }
  } else {
    navigate(nextRoute)
  }
}
```

### 4. Ação Irreversível

```tsx
const handleArchive = async () => {
  const confirmed = await confirm({
    title: 'Arquivar residente?',
    description: 'O residente será movido para o arquivo e não aparecerá mais na lista ativa.',
    confirmText: 'Arquivar',
    variant: 'default',
  })

  if (confirmed) {
    await archiveResident(id)
  }
}
```

---

## 🚫 Quando NÃO Usar

### Não use para:
- ❌ Informações simples → Use `toast` ou `alert`
- ❌ Sucesso de operação → Use `toast` com variant success
- ❌ Formulários → Use validação inline
- ❌ Tutoriais → Use `Dialog` normal ou `Popover`

### Use apenas para:
- ✅ Confirmação de ações destrutivas
- ✅ Confirmação de descarte de dados
- ✅ Ações irreversíveis importantes
- ✅ Quando perda de dados está em jogo

---

## 🎨 Integração com Design System

O componente usa:
- ✅ `AlertDialog` do shadcn/ui
- ✅ Cores do design system (`primary`, `danger`, `warning`)
- ✅ Ícones do Lucide React
- ✅ Tipografia consistente
- ✅ Espaçamentos padronizados

---

## ♿ Acessibilidade

- ✅ **Keyboard navigation**: ESC para fechar, Tab para navegar
- ✅ **Focus trap**: Foco fica dentro do diálogo
- ✅ **ARIA labels**: Screen readers leem corretamente
- ✅ **Backdrop dismiss**: Click fora fecha (mas dispara onCancel)

---

## 📝 Migração de window.confirm()

### Buscar todos os usos:

```bash
grep -r "window.confirm" apps/frontend/src/
```

### Substituir cada um:

1. Adicionar hook no componente:
   ```tsx
   const { ConfirmDialog, confirm } = useConfirmDialog()
   ```

2. Substituir `window.confirm()` por `await confirm()`:
   ```tsx
   // Antes
   if (window.confirm('Tem certeza?')) {
     action()
   }

   // Depois
   const confirmed = await confirm({
     title: 'Tem certeza?',
     description: 'Descrição da ação.',
   })
   if (confirmed) {
     action()
   }
   ```

3. Adicionar componente no JSX:
   ```tsx
   return (
     <>
       {/* Seu conteúdo */}
       <ConfirmDialog />
     </>
   )
   ```

---

## 🧪 Testing

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'

it('should confirm action', async () => {
  const TestComponent = () => {
    const { ConfirmDialog, confirm } = useConfirmDialog()

    const handleClick = async () => {
      const confirmed = await confirm({
        title: 'Confirmar?',
        description: 'Descrição',
      })
      if (confirmed) {
        console.log('Confirmado')
      }
    }

    return (
      <>
        <button onClick={handleClick}>Ação</button>
        <ConfirmDialog />
      </>
    )
  }

  render(<TestComponent />)

  fireEvent.click(screen.getByText('Ação'))

  expect(screen.getByText('Confirmar?')).toBeInTheDocument()

  fireEvent.click(screen.getByText('Confirmar'))

  // Assert que a ação foi executada
})
```

---

## 📚 Referências

- [shadcn/ui AlertDialog](https://ui.shadcn.com/docs/components/alert-dialog)
- [ARIA Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [Design System Guidelines](/docs/design-system.md)
