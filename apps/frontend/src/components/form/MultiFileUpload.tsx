import { useState, useRef } from 'react'
import { CloudUpload, FileText, X, File, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { formatDateOnlySafe } from '@/utils/dateHelpers'

interface ExistingFile {
  id?: string
  url: string
  name?: string
  uploadedAt?: string
}

interface FileWithPreview {
  id: string
  file: File
  preview?: string
}

interface MultiFileUploadProps {
  onFilesChange: (files: File[]) => void
  existingFiles?: ExistingFile[]
  onRemoveExisting?: (url: string) => void
  onViewFile?: (url: string) => void
  accept?: string
  maxSize?: number // em MB
  maxFiles?: number
  title?: string
  description?: string
  disabled?: boolean
}

export function MultiFileUpload({
  onFilesChange,
  existingFiles = [],
  onRemoveExisting,
  onViewFile,
  accept = 'image/*,application/pdf',
  maxSize = 10,
  maxFiles,
  title = 'Documentos',
  description = 'PDF, imagens, etc.',
  disabled = false
}: MultiFileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [newFiles, setNewFiles] = useState<FileWithPreview[]>([])
  const [loadingPreviews, setLoadingPreviews] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  // Gerar preview para imagens
  const generatePreview = async (file: File, id: string) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setNewFiles(prev =>
          prev.map(f =>
            f.id === id ? { ...f, preview: e.target?.result as string } : f
          )
        )
        setLoadingPreviews(prev => {
          const updated = new Set(prev)
          updated.delete(id)
          return updated
        })
      }
      reader.readAsDataURL(file)
    } else {
      setLoadingPreviews(prev => {
        const updated = new Set(prev)
        updated.delete(id)
        return updated
      })
    }
  }

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return

    const filesArray = Array.from(fileList)

    // Validar limite de arquivos
    const totalFiles = newFiles.length + existingFiles.length + filesArray.length
    if (maxFiles && totalFiles > maxFiles) {
      alert(`Máximo de ${maxFiles} arquivos permitidos`)
      return
    }

    // Validar tamanho
    const validFiles = filesArray.filter(file => {
      if (file.size > maxSize * 1024 * 1024) {
        alert(`Arquivo ${file.name} excede o tamanho máximo de ${maxSize}MB`)
        return false
      }
      return true
    })

    // Adicionar arquivos e gerar previews
    const newFileEntries: FileWithPreview[] = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file
    }))

    setNewFiles(prev => [...prev, ...newFileEntries])

    // Gerar previews
    newFileEntries.forEach(entry => {
      setLoadingPreviews(prev => new Set(prev).add(entry.id))
      generatePreview(entry.file, entry.id)
    })

    // Notificar mudança
    const allFiles = [...newFiles, ...newFileEntries].map(f => f.file)
    onFilesChange(allFiles)
  }

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click()
    }
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleRemoveNewFile = (id: string) => {
    const updated = newFiles.filter(f => f.id !== id)
    setNewFiles(updated)
    onFilesChange(updated.map(f => f.file))
  }

  const handleRemoveExistingFile = (url: string) => {
    onRemoveExisting?.(url)
  }

  const isPDF = (fileName: string) => fileName.toLowerCase().endsWith('.pdf')

  const allFiles = [...existingFiles, ...newFiles]
  const hasFiles = allFiles.length > 0

  return (
    <div className="space-y-3">
      {title && <Label className="text-base font-semibold">{title}</Label>}

      {/* Dropzone */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all',
          'hover:border-primary hover:bg-primary/5',
          isDragging ? 'border-primary bg-primary/10' : 'border-border bg-muted/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <CloudUpload className="w-10 h-10 mx-auto mb-2 text-muted-foreground/70" />
        <p className="text-sm font-medium text-foreground/80">
          Arraste arquivos ou clique para selecionar
        </p>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        <p className="text-xs text-muted-foreground/70 mt-2">Máximo {maxSize}MB por arquivo</p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled}
        />
      </div>

      {/* Botão Adicionar Documento (alternativo) */}
      {hasFiles && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={disabled}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Documento
        </Button>
      )}

      {/* Lista de Arquivos */}
      {hasFiles && (
        <div className="space-y-2 mt-4">
          {/* Arquivos Existentes */}
          {existingFiles.map((file) => (
            <div
              key={`existing-${file.id || file.url}`}
              className={cn(
                "flex items-start gap-3 p-3 bg-white border border-border rounded-lg transition-all",
                onViewFile && "cursor-pointer hover:border-primary hover:bg-primary/5"
              )}
              onClick={() => onViewFile?.(file.url)}
            >
              {/* Miniatura */}
              <div className="flex-shrink-0">
                {file.url && file.url.includes('image') && !isPDF(file.name || '') ? (
                  <div className="w-12 h-12 rounded border border-border overflow-hidden bg-muted/50">
                    <img
                      src={file.url}
                      alt={file.name || 'Arquivo'}
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                ) : isPDF(file.name || file.url) ? (
                  <div className="w-12 h-12 rounded border border-border bg-danger/5 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-danger" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded border border-border bg-muted/50 flex items-center justify-center flex-shrink-0">
                    <File className="w-6 h-6 text-muted-foreground/70" />
                  </div>
                )}
              </div>

              {/* Informações */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground break-words">
                  {file.name || 'Arquivo'}
                </p>
                {file.uploadedAt && (
                  <p className="text-xs text-muted-foreground">
                    {formatDateOnlySafe(file.uploadedAt)}
                  </p>
                )}
              </div>

              {/* Remover */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveExistingFile(file.url)}
                disabled={disabled}
                title="Remover arquivo"
                className="flex-shrink-0"
              >
                <Trash2 className="w-4 h-4 text-danger" />
              </Button>
            </div>
          ))}

          {/* Novos Arquivos */}
          {newFiles.map(({ id, file, preview }) => (
            <div
              key={id}
              className="flex items-start gap-3 p-3 bg-white border border-primary/30 rounded-lg bg-primary/5"
            >
              {/* Miniatura */}
              <div className="flex-shrink-0">
                {preview ? (
                  <div className="w-12 h-12 rounded border border-border overflow-hidden">
                    <img
                      src={preview}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : isPDF(file.name) ? (
                  <div className="w-12 h-12 rounded border border-border bg-danger/5 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-danger" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded border border-border bg-muted/50 flex items-center justify-center flex-shrink-0">
                    {loadingPreviews.has(id) ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    ) : (
                      <File className="w-6 h-6 text-muted-foreground/70" />
                    )}
                  </div>
                )}
              </div>

              {/* Informações */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground break-words">
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)}MB
                </p>
              </div>

              {/* Remover */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveNewFile(id)}
                disabled={disabled}
                title="Remover arquivo"
                className="flex-shrink-0"
              >
                <X className="w-4 h-4 text-danger" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
