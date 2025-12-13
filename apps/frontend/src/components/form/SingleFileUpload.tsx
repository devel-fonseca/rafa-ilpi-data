import { useState, useRef, useEffect } from 'react'
import { CloudUpload, FileText, X, File, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface SingleFileUploadProps {
  onFileSelect: (file: File | null) => void
  currentFileUrl?: string
  accept?: string
  maxSize?: number // em MB, padrão 10
  label?: string
  description?: string
  showPreview?: boolean
  required?: boolean
  disabled?: boolean
  error?: string
}

export function SingleFileUpload({
  onFileSelect,
  currentFileUrl,
  accept = 'image/*,application/pdf',
  maxSize = 10,
  label = 'Upload de Arquivo',
  description,
  showPreview = true,
  required = false,
  disabled = false,
  error
}: SingleFileUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentFileUrl || null)
  const [fileName, setFileName] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Atualizar preview quando currentFileUrl mudar
  useEffect(() => {
    if (currentFileUrl) {
      setIsLoading(true)
      setPreview(currentFileUrl)
      // Extrair nome do arquivo da URL se possível
      try {
        const urlParts = currentFileUrl.split('/')
        const lastPart = urlParts[urlParts.length - 1]
        setFileName(decodeURIComponent(lastPart.split('?')[0]) || 'Arquivo')
      } catch {
        setFileName('Arquivo')
      }
    }
  }, [currentFileUrl])

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click()
    }
  }

  const isPDF = (fileName: string) => fileName.toLowerCase().endsWith('.pdf')

  const getFilePreview = (file: File) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
        setIsLoading(false)
      }
      reader.readAsDataURL(file)
    } else if (file.type === 'application/pdf') {
      setPreview(null) // PDFs não têm preview, mostrar ícone
      setIsLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > maxSize * 1024 * 1024) {
        // Toast ou alert
        alert(`Arquivo deve ter no máximo ${maxSize}MB`)
        return
      }

      setIsLoading(true)
      setFileName(file.name)
      setSelectedFile(file)
      getFilePreview(file)
      onFileSelect(file)
    }
  }

  const handleRemoveFile = () => {
    setPreview(null)
    setFileName('')
    setSelectedFile(null)
    onFileSelect(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}

      {!preview && !selectedFile ? (
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all',
            'hover:border-primary hover:bg-primary/5',
            disabled && 'opacity-50 cursor-not-allowed',
            error ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-gray-50'
          )}
          onClick={handleClick}
        >
          <CloudUpload className="w-10 h-10 mx-auto mb-3 text-gray-400" />
          <p className="text-sm font-medium text-gray-700">Clique para upload</p>
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
          <p className="text-xs text-gray-400 mt-2">Máximo {maxSize}MB</p>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={accept}
            onChange={handleFileChange}
            disabled={disabled}
          />
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
          <div className="flex items-start gap-3">
            {/* Preview da imagem ou ícone de PDF */}
            <div className="flex-shrink-0">
              {preview && !isPDF(fileName) ? (
                <div className="relative w-20 h-20 rounded border border-gray-200 overflow-hidden">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                    onLoad={() => setIsLoading(false)}
                    onError={() => setIsLoading(false)}
                  />
                  {isLoading && (
                    <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  )}
                </div>
              ) : isPDF(fileName) ? (
                <div className="w-20 h-20 rounded border border-gray-200 bg-red-50 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-red-500" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded border border-gray-200 bg-gray-50 flex items-center justify-center">
                  <File className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>

            {/* Informações do arquivo */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 break-words">
                {fileName}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {selectedFile
                  ? `${(selectedFile.size / 1024 / 1024).toFixed(2)}MB`
                  : 'Arquivo existente'}
              </p>
            </div>

            {/* Botões de ação */}
            <div className="flex-shrink-0 flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClick}
                disabled={disabled}
                title="Trocar arquivo"
              >
                <ImageIcon className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveFile}
                disabled={disabled}
                title="Remover arquivo"
              >
                <X className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          </div>

          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={accept}
            onChange={handleFileChange}
            disabled={disabled}
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}
