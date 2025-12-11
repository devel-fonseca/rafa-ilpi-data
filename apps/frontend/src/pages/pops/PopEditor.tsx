import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Send, FileText, Plus } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { TiptapEditor } from '../../components/tiptap/TiptapEditor'
import {
  useCreatePop,
  useUpdatePop,
  usePublishPop,
  usePop,
  usePopCategories,
} from '../../hooks/usePops'
import {
  PopCategory,
  PopCategoryLabels,
  PopStatus,
  type CreatePopDto,
  type UpdatePopDto,
} from '../../types/pop.types'
import { toast } from 'sonner'
import PopTemplatesModal from './PopTemplatesModal'

export default function PopEditor() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditing = !!id

  // State
  const [showTemplatesModal, setShowTemplatesModal] = useState(false)
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<string>(PopCategory.GESTAO_OPERACAO)
  const [templateId, setTemplateId] = useState<string>()
  const [content, setContent] = useState('')
  const [reviewIntervalMonths, setReviewIntervalMonths] = useState<number>(12)
  const [notes, setNotes] = useState('')

  // Hooks
  const { data: existingPop, isLoading: isLoadingPop } = usePop(id)
  const { data: categories = [] } = usePopCategories()
  const createPop = useCreatePop()
  const updatePop = useUpdatePop()
  const publishPop = usePublishPop()

  // Load existing POP data
  useEffect(() => {
    if (existingPop) {
      setTitle(existingPop.title)
      setCategory(existingPop.category)
      setTemplateId(existingPop.templateId || undefined)
      setContent(existingPop.content)
      setReviewIntervalMonths(existingPop.reviewIntervalMonths || 12)
      setNotes(existingPop.notes || '')
    }
  }, [existingPop])

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      toast.error('Título é obrigatório')
      return
    }

    if (!content.trim()) {
      toast.error('Conteúdo é obrigatório')
      return
    }

    if (isEditing && id) {
      const dto: UpdatePopDto = {
        title,
        content,
        reviewIntervalMonths,
        notes: notes.trim() || undefined,
      }
      await updatePop.mutateAsync({ id, dto })
    } else {
      const dto: CreatePopDto = {
        title,
        category,
        templateId,
        content,
        reviewIntervalMonths,
        notes: notes.trim() || undefined,
      }
      const createdPop = await createPop.mutateAsync(dto)
      navigate(`/dashboard/pops/${createdPop.id}`)
    }
  }

  const handlePublish = async () => {
    if (!id) {
      toast.error('Salve o POP antes de publicar')
      return
    }

    // Salvar alterações primeiro
    await handleSaveDraft()

    // Publicar
    await publishPop.mutateAsync(id)
    navigate(`/dashboard/pops/${id}`)
  }

  const handleTemplateSelected = (
    templateTitle: string,
    templateContent: string,
    templateCategory: PopCategory,
    selectedTemplateId: string,
    suggestedReviewMonths?: number
  ) => {
    setTitle(templateTitle)
    setContent(templateContent)
    setCategory(templateCategory)
    setTemplateId(selectedTemplateId)
    if (suggestedReviewMonths) {
      setReviewIntervalMonths(suggestedReviewMonths)
    }
    setShowTemplatesModal(false)
  }

  const handleStartFromScratch = () => {
    setShowTemplatesModal(false)
  }

  const handleCategoryChange = (value: string) => {
    if (value === '__NEW_CATEGORY__') {
      setShowNewCategoryDialog(true)
    } else {
      setCategory(value)
    }
  }

  const handleCreateNewCategory = () => {
    const trimmedName = newCategoryName.trim()

    if (!trimmedName) {
      toast.error('Nome da categoria é obrigatório')
      return
    }

    if (trimmedName.length > 100) {
      toast.error('Nome da categoria deve ter no máximo 100 caracteres')
      return
    }

    // Verificar se já existe (case-insensitive)
    const exists = categories.some(
      (cat) => cat.toLowerCase() === trimmedName.toLowerCase()
    )
    if (exists) {
      toast.error('Essa categoria já existe')
      return
    }

    setCategory(trimmedName)
    setNewCategoryName('')
    setShowNewCategoryDialog(false)
    toast.success('Categoria criada com sucesso')
  }

  if (isEditing && isLoadingPop) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 animate-pulse text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Carregando POP...</p>
        </div>
      </div>
    )
  }

  if (isEditing && existingPop?.status !== PopStatus.DRAFT) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold">
            Apenas POPs em rascunho podem ser editados
          </p>
          <p className="mt-2 text-muted-foreground">
            Para POPs publicados, crie uma nova versão
          </p>
          <Button className="mt-4" onClick={() => navigate(`/dashboard/pops/${id}`)}>
            Voltar para visualização
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard/pops')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {isEditing ? 'Editar POP' : 'Novo POP'}
              </h1>
              <p className="text-muted-foreground">
                {isEditing
                  ? 'Edite as informações do POP em rascunho'
                  : 'Crie um novo Procedimento Operacional Padrão'}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={createPop.isPending || updatePop.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              Salvar Rascunho
            </Button>
            {/* TODO: Adicionar verificação de permissão PUBLISH_POPS */}
            <Button
              onClick={handlePublish}
              disabled={publishPop.isPending || !id}
            >
              <Send className="mr-2 h-4 w-4" />
              Publicar
            </Button>
          </div>
        </div>

        {/* Form */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title */}
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Título do POP <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Higienização das Mãos"
                    maxLength={255}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">
                    Categoria <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={category}
                    onValueChange={handleCategoryChange}
                    disabled={isEditing} // Não permitir mudar categoria ao editar
                  >
                    <SelectTrigger id="category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Categorias base com labels amigáveis */}
                      <SelectItem value={PopCategory.GESTAO_OPERACAO}>
                        {PopCategoryLabels[PopCategory.GESTAO_OPERACAO]}
                      </SelectItem>
                      <SelectItem value={PopCategory.ENFERMAGEM_CUIDADOS}>
                        {PopCategoryLabels[PopCategory.ENFERMAGEM_CUIDADOS]}
                      </SelectItem>
                      {/* Categorias customizadas já usadas */}
                      {categories
                        .filter(
                          (cat) =>
                            cat !== PopCategory.GESTAO_OPERACAO &&
                            cat !== PopCategory.ENFERMAGEM_CUIDADOS
                        )
                        .map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      {/* Opção para criar nova categoria */}
                      {!isEditing && (
                        <SelectItem value="__NEW_CATEGORY__">
                          <div className="flex items-center text-primary">
                            <Plus className="mr-2 h-4 w-4" />
                            Nova Categoria
                          </div>
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Escolha uma categoria ou crie uma nova
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Content Editor */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Conteúdo do POP <span className="text-destructive">*</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TiptapEditor
                  content={content}
                  onChange={setContent}
                  placeholder="Digite o conteúdo do POP com formatação rica, tabelas, listas..."
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Review Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Revisão</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reviewInterval">
                    Intervalo de Revisão (meses)
                  </Label>
                  <Input
                    id="reviewInterval"
                    type="number"
                    min="1"
                    max="60"
                    value={reviewIntervalMonths}
                    onChange={(e) =>
                      setReviewIntervalMonths(Number(e.target.value))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Notificações serão enviadas 30 dias antes do vencimento
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Notas Internas</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observações internas sobre este POP..."
                  rows={5}
                />
              </CardContent>
            </Card>

            {/* Template Base Button */}
            {!isEditing && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowTemplatesModal(true)}
              >
                <FileText className="mr-2 h-4 w-4" />
                Modelo Base
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Dialog Nova Categoria */}
      <Dialog
        open={showNewCategoryDialog}
        onOpenChange={setShowNewCategoryDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
            <DialogDescription>
              Crie uma nova categoria personalizada para organizar seus POPs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-category">Nome da Categoria</Label>
              <Input
                id="new-category"
                list="categories-suggestions"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ex: Nutrição e Alimentação"
                maxLength={100}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateNewCategory()
                  }
                }}
              />
              {/* Autocomplete com sugestões das categorias existentes */}
              <datalist id="categories-suggestions">
                {categories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
              <p className="text-xs text-muted-foreground">
                Digite o nome da categoria (máximo 100 caracteres)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNewCategoryDialog(false)
                setNewCategoryName('')
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateNewCategory}>Criar Categoria</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Templates Modal */}
      <PopTemplatesModal
        open={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        onSelectTemplate={handleTemplateSelected}
        onStartFromScratch={handleStartFromScratch}
      />
    </>
  )
}
