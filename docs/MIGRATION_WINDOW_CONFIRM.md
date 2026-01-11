# 🔄 Guia de Migração: window.confirm() → ConfirmDialog

Este guia documenta a migração de `window.confirm()` para o sistema padronizado de diálogos de confirmação.

---

## 📊 Comparação: Antes vs Depois

### ❌ ANTES: window.confirm()

```tsx
const handleClose = () => {
  if (selectedFile || documentType) {
    if (window.confirm('Tem certeza que deseja cancelar? Os dados preenchidos serão perdidos.')) {
      reset()
      onClose()
    }
  } else {
    onClose()
  }
}
```

**Problemas:**
- ❌ Design nativo do navegador (inconsistente)
- ❌ Não customizável
- ❌ Sem ícones ou indicadores visuais
- ❌ Textos limitados a uma linha
- ❌ Sem variantes (warning, error, info)
- ❌ Aparência diferente em cada navegador
- ❌ Não integrado ao design system
- ❌ UX inferior

### ✅ DEPOIS: ConfirmDialog

```tsx
const { ConfirmDialog, confirm } = useConfirmDialog()

const handleClose = async () => {
  if (selectedFile || documentType) {
    const confirmed = await confirm({
      title: 'Descartar alterações?',
      description: 'As informações preenchidas serão perdidas e não poderão ser recuperadas.',
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

return (
  <>
    {/* Seu componente */}
    <ConfirmDialog />
  </>
)
```

**Benefícios:**
- ✅ Design integrado ao design system
- ✅ Totalmente customizável
- ✅ Ícone contextual (AlertTriangle para warning)
- ✅ Suporte a textos longos e formatados
- ✅ 3 variantes visuais (default, warning, destructive)
- ✅ Consistente em todos os navegadores
- ✅ Cores, tipografia e espaçamentos padronizados
- ✅ UX superior com contexto visual claro

---

## 🎨 Variantes Visuais

### 1. **Default** (Informativo)
**Quando usar:** Confirmações gerais, não destrutivas

```tsx
const confirmed = await confirm({
  title: 'Salvar rascunho?',
  description: 'Suas alterações serão salvas como rascunho.',
  variant: 'default',
})
```

**Visual:**
- 🔵 Ícone: Info (azul primary)
- 🔵 Botão confirmar: Azul primary
- ⚪ Background ícone: Azul claro (bg-primary/10)

---

### 2. **Warning** (Aviso)
**Quando usar:** Perda de dados, ações que podem ser revertidas

```tsx
const confirmed = await confirm({
  title: 'Descartar alterações?',
  description: 'As informações preenchidas serão perdidas.',
  variant: 'warning',
})
```

**Visual:**
- 🟡 Ícone: AlertTriangle (amarelo/laranja warning)
- 🔵 Botão confirmar: Azul primary (padrão)
- 🟡 Background ícone: Amarelo claro (bg-warning/10)

---

### 3. **Destructive** (Destrutivo)
**Quando usar:** Exclusões permanentes, ações irreversíveis

```tsx
const confirmed = await confirm({
  title: 'Excluir documento?',
  description: 'Esta ação não pode ser desfeita. O documento será permanentemente removido.',
  confirmText: 'Excluir permanentemente',
  variant: 'destructive',
})
```

**Visual:**
- 🔴 Ícone: AlertCircle (vermelho danger)
- 🔴 Botão confirmar: Vermelho danger
- 🔴 Background ícone: Vermelho claro (bg-danger/10)

---

## 📋 Checklist de Migração

### Passo 1: Buscar Usos de window.confirm()

```bash
# Buscar no frontend
grep -r "window.confirm" apps/frontend/src/

# Ou apenas contar
grep -r "window.confirm" apps/frontend/src/ | wc -l
```

### Passo 2: Para Cada Arquivo

- [ ] Importar hook no topo do componente
  ```tsx
  import { useConfirmDialog } from '@/hooks/useConfirmDialog'
  ```

- [ ] Adicionar hook no componente
  ```tsx
  const { ConfirmDialog, confirm } = useConfirmDialog()
  ```

- [ ] Converter `if (window.confirm(...))` para `const confirmed = await confirm(...)`

- [ ] Adicionar `<ConfirmDialog />` no JSX

- [ ] Escolher variante apropriada (`default`, `warning`, `destructive`)

- [ ] Melhorar textos (título curto, descrição clara)

- [ ] Testar manualmente o fluxo

### Passo 3: Validar

- [ ] Verificar TypeScript compila sem erros
- [ ] Testar keyboard navigation (Tab, Enter, ESC)
- [ ] Testar click fora do diálogo
- [ ] Verificar textos claros e descritivos
- [ ] Confirmar variante visual adequada

---

## 🎯 Padrões de Uso por Contexto

### 1. Descartar Formulário

```tsx
const confirmed = await confirm({
  title: 'Descartar alterações?',
  description: 'As informações preenchidas serão perdidas e não poderão ser recuperadas.',
  confirmText: 'Descartar',
  cancelText: 'Continuar editando',
  variant: 'warning',
})
```

### 2. Excluir Recurso

```tsx
const confirmed = await confirm({
  title: 'Excluir [nome do recurso]?',
  description: 'Esta ação não pode ser desfeita. O [recurso] será permanentemente removido do sistema.',
  confirmText: 'Excluir permanentemente',
  cancelText: 'Cancelar',
  variant: 'destructive',
})
```

### 3. Sair Sem Salvar

```tsx
const confirmed = await confirm({
  title: 'Sair sem salvar?',
  description: 'Você tem alterações não salvas que serão perdidas.',
  confirmText: 'Sair sem salvar',
  cancelText: 'Voltar',
  variant: 'warning',
})
```

### 4. Ação Permanente

```tsx
const confirmed = await confirm({
  title: 'Arquivar [recurso]?',
  description: 'O [recurso] será movido para o arquivo e não aparecerá mais na lista ativa.',
  confirmText: 'Arquivar',
  cancelText: 'Cancelar',
  variant: 'default',
})
```

---

## 📝 Exemplos Completos

### Exemplo 1: Modal de Upload (DocumentUploadModal.tsx)

**Antes:**
```tsx
const handleClose = () => {
  if (selectedFile || documentType) {
    if (window.confirm('Tem certeza que deseja cancelar? Os dados preenchidos serão perdidos.')) {
      reset()
      setSelectedFile(null)
      onOpenChange(false)
    }
  } else {
    reset()
    setSelectedFile(null)
    onOpenChange(false)
  }
}
```

**Depois:**
```tsx
import { useConfirmDialog } from '@/hooks/useConfirmDialog'

function DocumentUploadModal() {
  const { ConfirmDialog, confirm } = useConfirmDialog()

  const handleClose = async () => {
    if (selectedFile || documentType) {
      const confirmed = await confirm({
        title: 'Descartar alterações?',
        description: 'As informações preenchidas serão perdidas e não poderão ser recuperadas.',
        confirmText: 'Descartar',
        cancelText: 'Continuar editando',
        variant: 'warning',
      })

      if (confirmed) {
        reset()
        setSelectedFile(null)
        onOpenChange(false)
      }
    } else {
      reset()
      setSelectedFile(null)
      onOpenChange(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        {/* Conteúdo do modal */}
      </Dialog>

      {/* Diálogo de confirmação */}
      <ConfirmDialog />
    </>
  )
}
```

---

### Exemplo 2: Exclusão de Documento

**Antes:**
```tsx
const handleDelete = (id: string) => {
  if (window.confirm('Deseja realmente excluir este documento?')) {
    deleteDocument(id)
  }
}
```

**Depois:**
```tsx
import { useConfirmDialog } from '@/hooks/useConfirmDialog'

function DocumentList() {
  const { ConfirmDialog, confirm } = useConfirmDialog()
  const deleteMutation = useDeleteDocument()

  const handleDelete = async (document: Document) => {
    const confirmed = await confirm({
      title: `Excluir ${document.typeLabel}?`,
      description: 'Esta ação não pode ser desfeita. O documento será permanentemente removido do sistema.',
      confirmText: 'Excluir permanentemente',
      cancelText: 'Cancelar',
      variant: 'destructive',
    })

    if (confirmed) {
      deleteMutation.mutate(document.id, {
        onSuccess: () => {
          toast({ title: 'Documento excluído com sucesso' })
        },
      })
    }
  }

  return (
    <>
      {/* Lista de documentos */}
      <ConfirmDialog />
    </>
  )
}
```

---

### Exemplo 3: Navegação com Alterações Não Salvas

**Antes:**
```tsx
const handleNavigate = (route: string) => {
  if (isDirty) {
    if (window.confirm('Tem alterações não salvas. Deseja continuar?')) {
      navigate(route)
    }
  } else {
    navigate(route)
  }
}
```

**Depois:**
```tsx
import { useConfirmDialog } from '@/hooks/useConfirmDialog'

function MyForm() {
  const { ConfirmDialog, confirm } = useConfirmDialog()
  const { formState: { isDirty } } = useForm()

  const handleNavigate = async (route: string) => {
    if (isDirty) {
      const confirmed = await confirm({
        title: 'Sair sem salvar?',
        description: 'Você tem alterações não salvas que serão perdidas.',
        confirmText: 'Sair sem salvar',
        cancelText: 'Continuar editando',
        variant: 'warning',
      })

      if (confirmed) {
        navigate(route)
      }
    } else {
      navigate(route)
    }
  }

  return (
    <>
      {/* Formulário */}
      <ConfirmDialog />
    </>
  )
}
```

---

## 🚨 Armadilhas Comuns

### ❌ Esquecer de Renderizar `<ConfirmDialog />`

```tsx
// ❌ ERRADO - Diálogo nunca aparecerá
const { confirm } = useConfirmDialog()

return <Button onClick={() => confirm({...})}>Ação</Button>
```

```tsx
// ✅ CORRETO
const { ConfirmDialog, confirm } = useConfirmDialog()

return (
  <>
    <Button onClick={() => confirm({...})}>Ação</Button>
    <ConfirmDialog />
  </>
)
```

---

### ❌ Usar Variante Errada

```tsx
// ❌ ERRADO - Exclusão com variante default
const confirmed = await confirm({
  title: 'Excluir residente?',
  description: 'Esta ação não pode ser desfeita.',
  variant: 'default', // ❌ Deveria ser 'destructive'
})
```

```tsx
// ✅ CORRETO
const confirmed = await confirm({
  title: 'Excluir residente?',
  description: 'Esta ação não pode ser desfeita.',
  variant: 'destructive', // ✅ Vermelho alerta o perigo
})
```

---

### ❌ Não Usar `await`

```tsx
// ❌ ERRADO - confirm() retorna Promise, não boolean
const confirmed = confirm({...})
if (confirmed) { /* nunca executa */ }
```

```tsx
// ✅ CORRETO
const confirmed = await confirm({...})
if (confirmed) { /* executa corretamente */ }
```

---

## 📊 Progresso da Migração

### Status Atual

- ✅ **DocumentUploadModal.tsx** - Migrado
- ⏳ **[Outros arquivos]** - Pendente

### Como Encontrar Próximos

```bash
# Listar todos os arquivos com window.confirm
grep -r "window.confirm" apps/frontend/src/ -l
```

---

## 🎓 Recursos

- [Documentação Completa](../apps/frontend/src/components/dialogs/README.md)
- [Código do Componente](../apps/frontend/src/components/dialogs/ConfirmDialog.tsx)
- [Hook useConfirmDialog](../apps/frontend/src/hooks/useConfirmDialog.tsx)
- [ARIA Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)

---

## ✅ Benefícios Alcançados

- ✅ Design consistente em todo sistema
- ✅ UX superior com contexto visual
- ✅ Totalmente acessível (WCAG 2.1 AA)
- ✅ Customizável para cada contexto
- ✅ Type-safe com TypeScript
- ✅ API moderna com Promises
- ✅ Documentação completa

---

**Última atualização:** 2026-01-10
**Autor:** Claude Sonnet 4.5 via Claude Code
**Status:** ✅ Sistema implementado e pronto para migração completa
