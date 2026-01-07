import { useState, useRef, DragEvent } from 'react'
import { CloudUpload, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void
  accept?: string
  multiple?: boolean
  maxSize?: number // em MB
  title?: string
  description?: string
}

interface SelectedFile {
  file: File
  id: string
}

export function FileUpload({
  onFilesSelected,
  accept,
  multiple = true,
  maxSize = 10,
  title = 'Clique ou arraste documentos',
  description = 'PDF, imagens, etc.'
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<SelectedFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return

    const filesArray = Array.from(newFiles)
    const validFiles = filesArray.filter(file => {
      if (file.size > maxSize * 1024 * 1024) {
        alert(`Arquivo ${file.name} excede o tamanho máximo de ${maxSize}MB`)
        return false
      }
      return true
    })

    const selectedFiles = validFiles.map(file => ({
      file,
      id: Math.random().toString(36)
    }))

    const updatedFiles = multiple ? [...files, ...selectedFiles] : selectedFiles
    setFiles(updatedFiles)
    onFilesSelected(updatedFiles.map(f => f.file))
  }

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleRemoveFile = (id: string) => {
    const updatedFiles = files.filter(f => f.id !== id)
    setFiles(updatedFiles)
    onFilesSelected(updatedFiles.map(f => f.file))
  }

  return (
    <div>
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all',
          'hover:border-primary hover:bg-primary/5',
          isDragging ? 'border-primary bg-primary/10' : 'border-border bg-muted/50'
        )}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <CloudUpload className="w-12 h-12 mx-auto mb-3 text-muted-foreground/70" />
        <p className="text-sm font-medium text-foreground/80">{title}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map(({ file, id }) => (
            <div
              key={id}
              className="flex items-center justify-between p-3 bg-white border border-border rounded-lg text-sm"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="truncate text-foreground/80">{file.name}</span>
                <span className="text-muted-foreground/70 text-xs flex-shrink-0">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemoveFile(id)
                }}
                className="flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
