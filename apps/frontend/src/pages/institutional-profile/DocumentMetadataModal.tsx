import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { getCurrentDate } from '@/utils/dateHelpers'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useUpdateDocumentMetadata } from '@/hooks/useInstitutionalProfile'
import { Loader2, AlertCircle } from 'lucide-react'
import type { TenantDocument } from '@/api/institutional-documents.api'

/**
 * Schema de validação com Zod
 * Todos os campos são opcionais
 */
const metadataSchema = z.object({
  issuedAt: z.string().optional(),
  expiresAt: z.string().optional(),
  documentNumber: z.string().optional(),
  issuerEntity: z.string().optional(),
  tags: z.string().optional(), // Será convertido para array no submit
  notes: z.string().optional(),
})

type MetadataFormData = z.infer<typeof metadataSchema>

/**
 * Props do componente
 */
interface DocumentMetadataModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: TenantDocument | null
}

/**
 * Modal para edição de metadados de documentos institucionais
 */
export function DocumentMetadataModal({ open, onOpenChange, document }: DocumentMetadataModalProps) {
  const { toast } = useToast()
  const updateMutation = useUpdateDocumentMetadata()

  // Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MetadataFormData>({
    resolver: zodResolver(metadataSchema),
  })

  // Resetar formulário quando documento muda
  useEffect(() => {
    if (document) {
      reset({
        issuedAt: document.issuedAt ? document.issuedAt.split('T')[0] : '',
        expiresAt: document.expiresAt ? document.expiresAt.split('T')[0] : '',
        documentNumber: document.documentNumber || '',
        issuerEntity: document.issuerEntity || '',
        tags: document.tags ? document.tags.join(', ') : '',
        notes: document.notes || '',
      })
    }
  }, [document, reset])

  /**
   * Handler para submissão do formulário
   */
  const onSubmit = async (data: MetadataFormData) => {
    if (!document) return

    try {
      // Montar payload (enviar apenas campos preenchidos)
      const payload: Record<string, unknown> = {}

      if (data.issuedAt) {
        payload.issuedAt = data.issuedAt
      }

      if (data.expiresAt) {
        payload.expiresAt = data.expiresAt
      }

      if (data.documentNumber !== undefined) {
        payload.documentNumber = data.documentNumber || null // Permite limpar o campo
      }

      if (data.issuerEntity !== undefined) {
        payload.issuerEntity = data.issuerEntity || null // Permite limpar o campo
      }

      if (data.notes !== undefined) {
        payload.notes = data.notes || null // Permite limpar o campo
      }

      // Processar tags: converter string separada por vírgula em array
      if (data.tags !== undefined) {
        if (data.tags && data.tags.trim() !== '') {
          payload.tags = data.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag !== '')
        } else {
          payload.tags = [] // Permite limpar todas as tags
        }
      }

      // Fazer update
      await updateMutation.mutateAsync({
        documentId: document.id,
        data: payload,
      })

      toast({
        title: 'Sucesso',
        description: 'Metadados atualizados com sucesso',
      })

      onOpenChange(false)
    } catch (error: unknown) {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      toast({
        title: 'Erro ao atualizar metadados',
        description: errorResponse?.data?.message || 'Ocorreu um erro ao atualizar os metadados',
        variant: 'destructive',
      })
    }
  }

  /**
   * Handler para fechar modal
   */
  const handleClose = () => {
    reset()
    onOpenChange(false)
  }

  if (!document) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Metadados</DialogTitle>
          <DialogDescription>
            Atualize as informações do documento sem alterar o arquivo enviado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          {/* Informação do documento */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            <p className="text-sm font-medium text-foreground">{document.fileName}</p>
            <p className="text-xs text-muted-foreground">
              Enviado em {new Date(document.createdAt).toLocaleDateString('pt-BR')}
            </p>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Data de Emissão */}
            <div className="space-y-2">
              <Label htmlFor="issued-at">Data de Emissão</Label>
              <Input
                id="issued-at"
                type="date"
                {...register('issuedAt')}
                max={getCurrentDate()}
              />
              {errors.issuedAt && (
                <p className="text-sm text-danger flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.issuedAt.message}
                </p>
              )}
            </div>

            {/* Data de Validade */}
            <div className="space-y-2">
              <Label htmlFor="expires-at">Data de Validade</Label>
              <Input
                id="expires-at"
                type="date"
                {...register('expiresAt')}
                min={getCurrentDate()}
              />
              {errors.expiresAt && (
                <p className="text-sm text-danger flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.expiresAt.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Deixe em branco se o documento não possui validade
              </p>
            </div>
          </div>

          {/* Campos de Metadados Adicionais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Número do Documento */}
            <div className="space-y-2">
              <Label htmlFor="document-number">Número do Documento</Label>
              <Input
                id="document-number"
                type="text"
                placeholder="Ex: Protocolo, Alvará, etc."
                {...register('documentNumber')}
                maxLength={100}
              />
              {errors.documentNumber && (
                <p className="text-sm text-danger flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.documentNumber.message}
                </p>
              )}
            </div>

            {/* Entidade Emissora */}
            <div className="space-y-2">
              <Label htmlFor="issuer-entity">Entidade Emissora</Label>
              <Input
                id="issuer-entity"
                type="text"
                placeholder="Ex: Prefeitura, Cartório, etc."
                {...register('issuerEntity')}
                maxLength={200}
              />
              {errors.issuerEntity && (
                <p className="text-sm text-danger flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.issuerEntity.message}
                </p>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              type="text"
              placeholder="Separe as tags por vírgula (ex: urgente, renovação)"
              {...register('tags')}
            />
            {errors.tags && (
              <p className="text-sm text-danger flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.tags.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Utilize tags para facilitar a organização e busca dos documentos
            </p>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Adicione informações complementares sobre o documento..."
              {...register('notes')}
              rows={3}
            />
            {errors.notes && (
              <p className="text-sm text-danger flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.notes.message}
              </p>
            )}
          </div>

          {/* Footer com botões */}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={updateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
