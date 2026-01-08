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
      <DialogContent className="max-w-4xl max-h-[90vh] sm:max-h-[85vh] flex flex-col p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl">Escolher Template de POP</DialogTitle>
          <DialogDescription className="text-sm">
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
            <div className="overflow-x-auto">
              <TabsList className="inline-flex w-full md:grid md:grid-cols-3 min-w-max">
                <TabsTrigger value="all" className="whitespace-nowrap">
                  Todos ({templatesData?.count.total || 0})
                </TabsTrigger>
                <TabsTrigger value={PopCategory.GESTAO_OPERACAO} className="whitespace-nowrap">
                  <span className="hidden sm:inline">{PopCategoryLabels[PopCategory.GESTAO_OPERACAO]}</span>
                  <span className="inline sm:hidden">Gestão</span> ({templatesData?.count.gestaoOperacao || 0})
                </TabsTrigger>
                <TabsTrigger value={PopCategory.ENFERMAGEM_CUIDADOS} className="whitespace-nowrap">
                  <span className="hidden sm:inline">{PopCategoryLabels[PopCategory.ENFERMAGEM_CUIDADOS]}</span>
                  <span className="inline sm:hidden">Enfermagem</span> ({templatesData?.count.enfermagemCuidados || 0})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={selectedCategory} className="mt-4">
              <ScrollArea className="h-[300px] sm:h-[350px] pr-2 sm:pr-4">
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
                  <div className="space-y-2 sm:space-y-3">
                    {filteredTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleSelectTemplate(template)}
                        className="w-full rounded-lg border p-3 sm:p-4 text-left transition-colors hover:bg-accent"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                              <h4 className="font-semibold text-sm sm:text-base truncate">{template.title}</h4>
                            </div>
                            <p className="mt-1 text-xs sm:text-sm text-muted-foreground line-clamp-2">
                              {template.description}
                            </p>
                            {template.suggestedReviewMonths && (
                              <p className="mt-1 sm:mt-2 text-xs text-muted-foreground">
                                Revisão sugerida: {template.suggestedReviewMonths}{' '}
                                meses
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className="self-start shrink-0 text-xs">
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
        <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 border-t pt-4 mt-4">
          <Button variant="outline" onClick={onStartFromScratch} className="w-full sm:w-auto">
            Começar do Zero
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">
            Cancelar
          </Button>
        </div>
      </DialogContent>

      {/* Warning Dialog */}
      <AlertDialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <AlertDialogContent className="max-w-lg sm:max-w-xl">
          <AlertDialogHeader>
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500 shrink-0 mt-0.5" />
              <AlertDialogTitle className="text-base sm:text-lg">Aviso Antes de Usar Template de POP</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-3 sm:space-y-4 pt-3 sm:pt-4">
              <p className="font-semibold text-foreground text-sm sm:text-base">
                <strong>Atenção:</strong> Este é um <strong>modelo base</strong> e não substitui a análise, adaptação e aprovação do <strong>Responsável Técnico da ILPI</strong>.
              </p>

              <p className="text-xs sm:text-sm">Ao prosseguir, você reconhece que:</p>

              <ul className="list-disc list-inside space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <li>O conteúdo é <strong>exemplificativo</strong> e pode não refletir integralmente a realidade da sua instituição;</li>
                <li>O Responsável Técnico deve <strong>revisar e ajustar</strong> o documento antes da publicação;</li>
                <li>A responsabilidade pela conformidade com normas sanitárias e operacionais é <strong>exclusivamente da ILPI</strong>;</li>
                <li>O modelo <strong>não constitui orientação técnica assistencial</strong>.</li>
              </ul>

              <p className="font-semibold text-foreground pt-2 text-sm sm:text-base">
                Deseja aplicar este modelo ao seu POP?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={handleCancelWarning} className="w-full sm:w-auto">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmTemplate} className="w-full sm:w-auto">
              Aplicar Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
