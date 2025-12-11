import { useState } from 'react'
import { FileText, Search, X, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { ScrollArea } from '../../components/ui/scroll-area'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs'
import { usePopTemplates } from '../../hooks/usePops'
import {
  PopCategory,
  PopCategoryLabels,
  type PopTemplate,
} from '../../types/pop.types'

interface PopTemplatesModalProps {
  open: boolean
  onClose: () => void
  onSelectTemplate: (
    title: string,
    content: string,
    category: PopCategory,
    templateId: string,
    suggestedReviewMonths?: number
  ) => void
  onStartFromScratch: () => void
}

export default function PopTemplatesModal({
  open,
  onClose,
  onSelectTemplate,
  onStartFromScratch,
}: PopTemplatesModalProps) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<
    PopCategory | 'all'
  >('all')
  const [selectedTemplate, setSelectedTemplate] = useState<PopTemplate | null>(null)
  const [showWarningDialog, setShowWarningDialog] = useState(false)

  const { data: templatesData, isLoading } = usePopTemplates()

  const filteredTemplates = templatesData?.templates.filter((template) => {
    const matchesSearch =
      search === '' ||
      template.title.toLowerCase().includes(search.toLowerCase()) ||
      template.description.toLowerCase().includes(search.toLowerCase())

    const matchesCategory =
      selectedCategory === 'all' || template.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  const handleSelectTemplate = (template: PopTemplate) => {
    setSelectedTemplate(template)
    setShowWarningDialog(true)
  }

  const handleConfirmTemplate = () => {
    if (selectedTemplate) {
      onSelectTemplate(
        selectedTemplate.title,
        selectedTemplate.defaultContent,
        selectedTemplate.category,
        selectedTemplate.id,
        selectedTemplate.suggestedReviewMonths
      )
      setShowWarningDialog(false)
      setSelectedTemplate(null)
    }
  }

  const handleCancelWarning = () => {
    setShowWarningDialog(false)
    setSelectedTemplate(null)
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Escolher Template de POP</DialogTitle>
          <DialogDescription>
            Selecione um template baseado em RDC 502/2021 ou comece do zero
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar template..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
            {search && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => setSearch('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Category Tabs */}
          <Tabs
            value={selectedCategory}
            onValueChange={(value) =>
              setSelectedCategory(value as PopCategory | 'all')
            }
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">
                Todos ({templatesData?.count.total || 0})
              </TabsTrigger>
              <TabsTrigger value={PopCategory.GESTAO_OPERACAO}>
                {PopCategoryLabels[PopCategory.GESTAO_OPERACAO]} (
                {templatesData?.count.gestaoOperacao || 0})
              </TabsTrigger>
              <TabsTrigger value={PopCategory.ENFERMAGEM_CUIDADOS}>
                {PopCategoryLabels[PopCategory.ENFERMAGEM_CUIDADOS]} (
                {templatesData?.count.enfermagemCuidados || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={selectedCategory} className="mt-4">
              <ScrollArea className="h-[350px] pr-4">
                {isLoading ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Carregando templates...
                  </div>
                ) : !filteredTemplates || filteredTemplates.length === 0 ? (
                  <div className="py-8 text-center">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-sm text-muted-foreground">
                      Nenhum template encontrado
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleSelectTemplate(template)}
                        className="w-full rounded-lg border p-4 text-left transition-colors hover:bg-accent"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <h4 className="font-semibold">{template.title}</h4>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {template.description}
                            </p>
                            {template.suggestedReviewMonths && (
                              <p className="mt-2 text-xs text-muted-foreground">
                                Revisão sugerida: {template.suggestedReviewMonths}{' '}
                                meses
                              </p>
                            )}
                          </div>
                          <Badge variant="outline">
                            {PopCategoryLabels[template.category]}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Actions - Fixed at bottom */}
        <div className="flex justify-between border-t pt-4 mt-4">
          <Button variant="outline" onClick={onStartFromScratch}>
            Começar do Zero
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </DialogContent>

      {/* Warning Dialog */}
      <AlertDialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              <AlertDialogTitle>Aviso Antes de Usar Template de POP</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-4 pt-4">
              <p className="font-semibold text-foreground">
                <strong>Atenção:</strong> Este é um <strong>modelo base</strong> e não substitui a análise, adaptação e aprovação do <strong>Responsável Técnico da ILPI</strong>.
              </p>

              <p className="text-sm">Ao prosseguir, você reconhece que:</p>

              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>O conteúdo é <strong>exemplificativo</strong> e pode não refletir integralmente a realidade da sua instituição;</li>
                <li>O Responsável Técnico deve <strong>revisar e ajustar</strong> o documento antes da publicação;</li>
                <li>A responsabilidade pela conformidade com normas sanitárias e operacionais é <strong>exclusivamente da ILPI</strong>;</li>
                <li>O modelo <strong>não constitui orientação técnica assistencial</strong>.</li>
              </ul>

              <p className="font-semibold text-foreground pt-2">
                Deseja aplicar este modelo ao seu POP?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelWarning}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmTemplate}>
              Aplicar Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
