import { useRef, useState, useEffect, useCallback } from 'react'
import { CloudUpload, X, Loader2, Scan } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { PhotoViewer } from './PhotoViewer'
import { processImageWithFaceDetection } from '@/services/faceDetection'

interface PhotoUploadNewProps {
  onPhotoSelect: (file: File | null) => void
  currentPhotoUrl?: string
  label?: string
  description?: string
  maxSize?: number // em MB
  required?: boolean
  disabled?: boolean
}

/**
 * Componente PhotoUploadNew - Upload de fotos com enquadramento
 *
 * Recursos:
 * - Drag & drop intuitivo
 * - Clique na foto para trocar (UX intuitiva)
 * - Enquadramento quadrado 1:1 (300x300px)
 * - Preview em tempo real
 * - Conversão automática para WebP
 * - Redimensionamento para 300x300 pixels
 * - Botão remover (X) no canto superior direito
 */
export function PhotoUploadNew({
  onPhotoSelect,
  currentPhotoUrl,
  label = 'Foto do Residente',
  description = 'Clique para selecionar ou arraste uma imagem',
  maxSize = 5,
  required = false,
  disabled = false,
}: PhotoUploadNewProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Estados de carregamento/seleção
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [faceDetected, setFaceDetected] = useState<boolean | null>(null)

  // Sincronizar preview com currentPhotoUrl quando muda (ex: residente carregado ou perfil atualizado)
  useEffect(() => {
    if (currentPhotoUrl) {
      setSelectedImage(currentPhotoUrl)
      setFaceDetected(null) // Resetar badge de detecção facial ao carregar foto existente
    } else {
      setSelectedImage(null)
    }
  }, [currentPhotoUrl])

  // Processar arquivo selecionado com detecção facial
  const validateAndProcessFile = useCallback(
    async (file: File) => {
      setError(null)
      setFaceDetected(null)

      // Validar tipo
      if (!file.type.startsWith('image/')) {
        setError('Selecione um arquivo de imagem válido')
        return
      }

      // Validar tamanho
      if (file.size > maxSize * 1024 * 1024) {
        setError(`Arquivo deve ter no máximo ${maxSize}MB`)
        return
      }

      try {
        setIsProcessing(true)

        // Processar imagem com detecção facial
        const result = await processImageWithFaceDetection(file)

        // Converter blob para DataURL para preview
        const reader = new FileReader()
        reader.onload = (e) => {
          setSelectedImage(e.target?.result as string)
        }
        reader.readAsDataURL(result.blob)

        // Criar File a partir do blob
        const webpFile = new File([result.blob], 'photo.webp', {
          type: 'image/webp',
        })

        // Atualizar estado de detecção
        setFaceDetected(result.hasFace)

        // Enviar para o componente pai
        onPhotoSelect(webpFile)

        console.log(
          `✅ Foto processada - Rosto detectado: ${result.hasFace ? 'Sim' : 'Não'}${
            result.confidence ? ` (${(result.confidence * 100).toFixed(0)}%)` : ''
          }`,
        )
      } catch (err) {
        setError('Erro ao processar imagem')
        console.error('Erro no processamento:', err)
      } finally {
        setIsProcessing(false)
      }
    },
    [maxSize, onPhotoSelect]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        validateAndProcessFile(file)
      }
    },
    [validateAndProcessFile]
  )

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      validateAndProcessFile(files[0])
    }
  }, [validateAndProcessFile])

  const handleRemove = () => {
    setSelectedImage(null)
    setError(null)
    setFaceDetected(null)
    onPhotoSelect(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const handleClickPreview = () => {
    if (!disabled) {
      inputRef.current?.click()
    }
  }

  return (
    <div className="w-full space-y-3">
      {label && (
        <Label>
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </Label>
      )}

      {/* Canvas oculto para processar imagem */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Visualizador de foto com controles */}
      {selectedImage && (
        <div className="space-y-2">
          {/* Container da foto com botão remover */}
          <div className="relative inline-block">
            <div onClick={handleClickPreview} className="cursor-pointer">
              <PhotoViewer
                photoUrl={selectedImage}
                altText={label}
                size="lg"
                isSignedUrl={selectedImage?.startsWith('data:') || selectedImage?.startsWith('blob:')}
              />
            </div>

            {/* Botão remover (X) no canto superior direito */}
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled}
              className="absolute top-0 right-0 -m-2 bg-danger hover:bg-danger/60 disabled:bg-muted/40 text-white rounded-full p-1 shadow-lg transition-colors"
              title="Remover foto"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Badge de detecção facial */}
            {faceDetected !== null && (
              <div
                className={`absolute bottom-2 left-2 px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 shadow-md ${
                  faceDetected
                    ? 'bg-success text-white'
                    : 'bg-warning text-white'
                }`}
              >
                <Scan className="w-3 h-3" />
                {faceDetected ? 'Rosto detectado' : 'Crop centralizado'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Área de upload (mostrar apenas quando não há foto selecionada) */}
      {!selectedImage && !isProcessing && (
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClickPreview}
          className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border bg-muted/50 hover:border-border/40 hover:bg-muted'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={disabled}
            className="hidden"
          />

          <CloudUpload className="w-10 h-10 mx-auto mb-3 text-muted-foreground/70" />
          <p className="text-sm font-medium text-foreground/80">{description}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Máximo {maxSize}MB • PNG, JPG, WebP
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1 flex items-center justify-center gap-1">
            <Scan className="w-3 h-3" />
            Detecção facial automática
          </p>
        </div>
      )}

      {/* Indicador de processamento */}
      {isProcessing && (
        <div className="border-2 border-dashed border-primary rounded-lg p-8 text-center bg-primary/5">
          <Loader2 className="w-10 h-10 mx-auto mb-3 text-primary animate-spin" />
          <p className="text-sm font-medium text-foreground/80">Processando imagem...</p>
          <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
            <Scan className="w-3 h-3" />
            Detectando rosto e aplicando enquadramento
          </p>
        </div>
      )}

      {/* Mensagem de erro */}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  )
}
