import { formatDateTimeSafe } from '@/utils/dateHelpers'
import { Eye, Edit2, History, Printer, AlertTriangle, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ClinicalNote } from '@/api/clinicalNotes.api'
import { getProfessionConfig, getTagConfig } from '@/utils/clinicalNotesConstants'

interface ClinicalNoteCardProps {
  note: ClinicalNote
  onView: (note: ClinicalNote) => void
  onEdit?: (note: ClinicalNote) => void
  onHistory: (note: ClinicalNote) => void
  onPrint: (note: ClinicalNote) => void
  onViewDocument?: (documentUrl: string, documentTitle?: string) => void
  canEdit: boolean // Se o usuário é o autor e está dentro da janela de 12h
}

export function ClinicalNoteCard({
  note,
  onView,
  onEdit,
  onHistory,
  onPrint,
  onViewDocument,
  canEdit,
}: ClinicalNoteCardProps) {
  const professionConfig = getProfessionConfig(note.profession)

  // Verificar se está dentro da janela de edição
  const now = new Date()
  const editableUntil = new Date(note.editableUntil)
  const isWithinEditWindow = now <= editableUntil

  // Preview do conteúdo SOAP (S + A, limitado)
  const subjectivePreview = note.subjective
    ? note.subjective.substring(0, 100) + (note.subjective.length > 100 ? '...' : '')
    : ''
  const assessmentPreview = note.assessment
    ? note.assessment.substring(0, 100) + (note.assessment.length > 100 ? '...' : '')
    : ''

  // Verificar se tem documento anexado
  const hasDocument = note.documents && note.documents.length > 0
  const firstDocument = hasDocument ? note.documents?.[0] : null

  // Formatar ID curto (primeiros 8 caracteres)
  const shortId = note.id.substring(0, 8)

  return (
    <Card className={`border-l-4 ${professionConfig.borderColor} ${professionConfig.bgColor}`}>
      <CardContent className="pt-4">
        {/* Header com profissão, data e badges */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{professionConfig.icon}</span>
              <h3 className={`font-semibold ${professionConfig.color}`}>
                {professionConfig.label}
              </h3>
              <span className="text-sm text-muted-foreground">
                - {formatDateTimeSafe(note.noteDate)}
              </span>
              {note.isAmended && (
                <Badge variant="destructive" className="text-xs gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Obsoleta
                </Badge>
              )}
              {note.version > 1 && (
                <Badge variant="secondary" className="text-xs">
                  v{note.version}
                </Badge>
              )}
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex gap-1">
            {hasDocument && firstDocument?.pdfFileUrl && onViewDocument && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onViewDocument(firstDocument.pdfFileUrl!, firstDocument.title)}
                title="Ver documento anexado"
                className="gap-1"
              >
                <FileText className="h-4 w-4" />
                Doc
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={() => onView(note)}
              title="Ver detalhes"
            >
              <Eye className="h-4 w-4" />
            </Button>

            {canEdit && isWithinEditWindow && !note.isAmended && onEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(note)}
                title="Editar (janela de 12h)"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={() => onHistory(note)}
              title="Ver histórico de versões"
            >
              <History className="h-4 w-4" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => onPrint(note)}
              title="Imprimir evolução"
            >
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Preview SOAP (S + A) */}
        <div className="space-y-2 text-sm">
          {subjectivePreview && (
            <div>
              <span className="font-medium text-muted-foreground">[S] </span>
              <span className="text-foreground">{subjectivePreview}</span>
            </div>
          )}

          {assessmentPreview && (
            <div>
              <span className="font-medium text-muted-foreground">[A] </span>
              <span className="text-foreground">{assessmentPreview}</span>
            </div>
          )}

          {!subjectivePreview && !assessmentPreview && (
            <p className="text-muted-foreground italic">
              Campos S e A não preenchidos. Clique para ver detalhes.
            </p>
          )}
        </div>

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {note.tags.map((tag) => {
              const tagConfig = getTagConfig(tag)
              return (
                <Badge
                  key={tag}
                  variant="outline"
                  className={`text-xs ${tagConfig.color} ${tagConfig.bgColor} border-0`}
                >
                  {tagConfig.label}
                </Badge>
              )
            })}
          </div>
        )}

        {/* Assinatura Eletrônica */}
        <div className="mt-4 pt-3 border-t text-xs text-muted-foreground space-y-0.5">
          <p>
            <span className="font-medium text-foreground">{note.professional.name}</span>
            {' | '}
            <span>{professionConfig.label}</span>
            {professionConfig.registrationLabel && (
              <>
                {' – '}
                <span>{professionConfig.registrationLabel}</span>
              </>
            )}
          </p>
          <p>
            Assinado eletronicamente em {formatDateTimeSafe(note.createdAt)} – ID: {shortId}
          </p>
        </div>

        {/* Avisos */}
        {!note.isAmended && canEdit && !isWithinEditWindow && (
          <div className="mt-3 text-xs text-muted-foreground">
            Janela de edição expirada em {formatDateTimeSafe(note.editableUntil)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
