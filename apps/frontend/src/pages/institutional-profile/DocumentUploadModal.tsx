import { useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import {
  useUploadDocument,
  useProfile,
  useDocumentRequirements,
} from '@/hooks/useInstitutionalProfile'
import { Upload, Loader2, FileText, X, CheckCircle, AlertCircle } from 'lucide-react'

/**
 * Tipos MIME permitidos para upload
 */
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]

/**
 * Labels amigáveis para tipos de arquivo
 */
const FILE_TYPE_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPEG',
  'image/jpg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
}

/**
 * Tamanho máximo de arquivo em bytes (10MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * Schema de validação com Zod
 */
const documentSchema = z.object({
  type: z.string().min(1, 'Selecione o tipo de documento'),
  issuedAt: z.string().optional(),
  expiresAt: z.string().optional(),
  notes: z.string().optional(),
})

type DocumentFormData = z.infer<typeof documentSchema>

/**
 * Props do componente
 */
interface DocumentUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Modal para upload de documentos institucionais
 */
export function DocumentUploadModal({ open, onOpenChange }: DocumentUploadModalProps) {
  const { toast } = useToast()
  const { data: profile } = useProfile()
  const { data: requirements } = useDocumentRequirements(profile?.legalNature)
  const uploadMutation = useUploadDocument()

  // Estado para arquivo selecionado
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  // Form
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
  })

  const documentType = watch('type')

  /**
   * Validação de arquivo selecionado
   */
  const validateFile = (file: File): string | null => {
    // Validar tipo de arquivo
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return `Tipo de arquivo não permitido. Tipos aceitos: ${Object.values(FILE_TYPE_LABELS).join(', ')}`
    }

    // Validar tamanho
    if (file.size > MAX_FILE_SIZE) {
      return `Arquivo muito grande. Tamanho máximo: 10MB`
    }

    return null
  }

  /**
   * Handler para seleção de arquivo
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      setSelectedFile(null)
      setFileError(null)
      return
    }

    const error = validateFile(file)

    if (error) {
      setSelectedFile(null)
      setFileError(error)
      toast({
        title: 'Arquivo inválido',
        description: error,
        variant: 'destructive',
      })
    } else {
      setSelectedFile(file)
      setFileError(null)
    }

    // Limpar o input para permitir selecionar o mesmo arquivo novamente
    event.target.value = ''
  }

  /**
   * Handler para remover arquivo selecionado
   */
  const handleRemoveFile = () => {
    setSelectedFile(null)
    setFileError(null)
  }

  /**
   * Handler para submissão do formulário
   */
  const onSubmit = async (data: DocumentFormData) => {
    // Validar se arquivo foi selecionado
    if (!selectedFile) {
      toast({
        title: 'Erro',
        description: 'Selecione um arquivo para fazer upload',
        variant: 'destructive',
      })
      return
    }

    try {
      // Montar payload
      const metadata = {
        type: data.type,
        ...(data.issuedAt && { issuedAt: data.issuedAt }),
        ...(data.expiresAt && { expiresAt: data.expiresAt }),
        ...(data.notes && { notes: data.notes }),
      }

      // Fazer upload
      await uploadMutation.mutateAsync({
        file: selectedFile,
        metadata,
      })

      toast({
        title: 'Sucesso',
        description: 'Documento enviado com sucesso',
      })

      // Resetar formulário e fechar modal
      reset()
      setSelectedFile(null)
      setFileError(null)
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar documento',
        description: error.response?.data?.message || 'Ocorreu um erro ao fazer upload do documento',
        variant: 'destructive',
      })
    }
  }

  /**
   * Handler para fechar modal (com confirmação se houver dados preenchidos)
   */
  const handleClose = () => {
    if (selectedFile || documentType) {
      if (window.confirm('Tem certeza que deseja cancelar? Os dados preenchidos serão perdidos.')) {
        reset()
        setSelectedFile(null)
        setFileError(null)
        onOpenChange(false)
      }
    } else {
      reset()
      setSelectedFile(null)
      setFileError(null)
      onOpenChange(false)
    }
  }

  /**
   * Formatar tamanho do arquivo
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload de Documento
          </DialogTitle>
          <DialogDescription>
            Envie um novo documento institucional. Todos os campos são importantes para a gestão de compliance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          {/* Tipo de Documento */}
          <div className="space-y-2">
            <Label htmlFor="document-type">
              Tipo de Documento <span className="text-danger">*</span>
            </Label>
            <Select
              value={documentType || ''}
              onValueChange={(value) => setValue('type', value, { shouldValidate: true })}
            >
              <SelectTrigger id="document-type" className={errors.type ? 'border-danger' : ''}>
                <SelectValue placeholder="Selecione o tipo do documento" />
              </SelectTrigger>
              <SelectContent>
                {requirements?.required.map((req) => (
                  <SelectItem key={req.type} value={req.type}>
                    {req.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-danger flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.type.message}
              </p>
            )}
            {!profile?.legalNature && (
              <p className="text-xs text-warning bg-warning/10 border border-warning/30 rounded-md px-3 py-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                Configure a natureza jurídica na aba "Dados Básicos" para ver os documentos específicos da sua instituição.
              </p>
            )}
          </div>

          {/* Upload de Arquivo */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">
              Arquivo <span className="text-danger">*</span>
            </Label>

            {/* Área de upload */}
            {!selectedFile ? (
              <div className="border-2 border-dashed border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
                <label
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center cursor-pointer space-y-2"
                >
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">
                      Clique para selecionar ou arraste um arquivo
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, JPG, PNG ou WebP até 10MB
                    </p>
                  </div>
                </label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            ) : (
              // Preview do arquivo selecionado
              <div className="border border-success/30 bg-success/5 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                      <p className="text-xs text-muted-foreground">
                        {FILE_TYPE_LABELS[selectedFile.type] || selectedFile.type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {fileError && (
              <p className="text-sm text-danger flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {fileError}
              </p>
            )}
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
                <p className="text-sm text-danger">{errors.issuedAt.message}</p>
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
                <p className="text-sm text-danger">{errors.expiresAt.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Deixe em branco se o documento não possui validade
              </p>
            </div>
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
              <p className="text-sm text-danger">{errors.notes.message}</p>
            )}
          </div>

          {/* Footer com botões */}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={uploadMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={uploadMutation.isPending || !selectedFile}>
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Enviar Documento
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
