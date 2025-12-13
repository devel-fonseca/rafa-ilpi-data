import { formatDateTimeSafe } from '@/utils/dateHelpers'
import { Edit2, History, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ClinicalNote } from '@/api/clinicalNotes.api'
import { getProfessionConfig, getTagConfig, getSOAPTemplate } from '@/utils/clinicalNotesConstants'

interface ViewClinicalNoteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  note: ClinicalNote | null
  onEdit?: (note: ClinicalNote) => void
  onHistory: (note: ClinicalNote) => void
  onPrint: (note: ClinicalNote) => void
  canEdit: boolean
}

export function ViewClinicalNoteModal({
  open,
  onOpenChange,
  note,
  onEdit,
  onHistory,
  onPrint,
  canEdit,
}: ViewClinicalNoteModalProps) {
  if (!note) return null

  const professionConfig = getProfessionConfig(note.profession)
  const template = getSOAPTemplate(note.profession)

  const now = new Date()
  const editableUntil = new Date(note.editableUntil)
  const isWithinEditWindow = now <= editableUntil

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2">
                <span>{professionConfig.icon}</span>
                <span>Evolução Clínica - {professionConfig.label}</span>
                {note.isAmended && (
                  <Badge variant="destructive" className="text-xs">
                    Obsoleta
                  </Badge>
                )}
                {note.version > 1 && (
                  <Badge variant="secondary" className="text-xs">
                    v{note.version}
                  </Badge>
                )}
              </DialogTitle>
            </div>

            <div className="flex gap-1">
              {canEdit && isWithinEditWindow && !note.isAmended && onEdit && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdit(note)}
                  title="Editar"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={() => onHistory(note)}
                title="Ver histórico"
              >
                <History className="h-4 w-4" />
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => onPrint(note)}
                title="Imprimir"
              >
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Informações gerais */}
        <div className={`rounded-lg p-4 ${professionConfig.bgColor} border ${professionConfig.borderColor}`}>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Data/Hora da Evolução</p>
              <p className="font-medium">{formatDateTimeSafe(note.noteDate)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Profissional</p>
              <p className="font-medium">{note.professional.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Residente</p>
              <p className="font-medium">{note.resident.fullName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">CPF do Residente</p>
              <p className="font-medium">{note.resident.cpf}</p>
            </div>
          </div>
        </div>

        {/* Conteúdo SOAP */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Registro SOAP</h3>

          {/* Subjetivo */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">
              {template.subjective.label}
            </h4>
            {note.subjective ? (
              <div className="bg-muted/50 rounded-md p-3 whitespace-pre-wrap text-sm">
                {note.subjective}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Não preenchido</p>
            )}
          </div>

          {/* Objetivo */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">
              {template.objective.label}
            </h4>
            {note.objective ? (
              <div className="bg-muted/50 rounded-md p-3 whitespace-pre-wrap text-sm">
                {note.objective}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Não preenchido</p>
            )}
          </div>

          {/* Avaliação */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">
              {template.assessment.label}
            </h4>
            {note.assessment ? (
              <div className="bg-muted/50 rounded-md p-3 whitespace-pre-wrap text-sm">
                {note.assessment}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Não preenchido</p>
            )}
          </div>

          {/* Plano */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">
              {template.plan.label}
            </h4>
            {note.plan ? (
              <div className="bg-muted/50 rounded-md p-3 whitespace-pre-wrap text-sm">
                {note.plan}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Não preenchido</p>
            )}
          </div>
        </div>

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {note.tags.map((tag) => {
                const tagConfig = getTagConfig(tag)
                return (
                  <Badge
                    key={tag}
                    variant="outline"
                    className={`${tagConfig.color} ${tagConfig.bgColor} border-0`}
                  >
                    {tagConfig.label}
                  </Badge>
                )
              })}
            </div>
          </div>
        )}

        {/* Metadados */}
        <div className="border-t pt-4 space-y-1 text-xs text-muted-foreground">
          <p>Criado em: {formatDateTimeSafe(note.createdAt)}</p>
          {note.updatedAt !== note.createdAt && (
            <p>Última atualização: {formatDateTimeSafe(note.updatedAt)}</p>
          )}
          {!note.isAmended && !isWithinEditWindow && (
            <p>Janela de edição expirada em: {formatDateTimeSafe(note.editableUntil)}</p>
          )}
          {!note.isAmended && isWithinEditWindow && canEdit && (
            <p className="text-amber-600 font-medium">
              Editável até: {formatDateTimeSafe(note.editableUntil)}
            </p>
          )}
        </div>

        {/* Botão fechar */}
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
