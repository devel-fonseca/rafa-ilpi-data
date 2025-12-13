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
  const imageRef = useRef<HTMLImageElement>(null)

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

  // Converter canvas para WebP e salvar como File
  const canvasToWebP = useCallback(async (canvas: HTMLCanvasElement): Promise<File> => {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], 'photo.webp', { type: 'image/webp' })
            resolve(file)
          } else {
            reject(new Error('Falha ao converter imagem'))
          }
        },
        'image/webp',
        0.95 // Qualidade 95%
      )
    })
  }, [])

  // Desenhar imagem no canvas com enquadramento quadrado 1:1
  const drawCroppedImage = useCallback(() => {
    if (!imageRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = imageRef.current
    const canvasWidth = 300
    const canvasHeight = 300
    const targetAspect = 1 // Proporção quadrada 1:1

    // Calcular dimensões finais com proporção 1:1
    let finalWidth = img.width
    let finalHeight = img.height
    const imgAspect = finalWidth / finalHeight

    if (imgAspect > targetAspect) {
      finalWidth = finalHeight * targetAspect
    } else {
      finalHeight = finalWidth / targetAspect
    }

    // Centralizar imagem
    const offsetX = (img.width - finalWidth) / 2
    const offsetY = (img.height - finalHeight) / 2

    // Redimensionar canvas para 300x300
    canvas.width = canvasWidth
    canvas.height = canvasHeight

    // Desenhar imagem enquadrada
    ctx.drawImage(
      img,
      offsetX,
      offsetY,
      finalWidth,
      finalHeight,
      0,
      0,
      canvasWidth,
      canvasHeight
    )
  }, [])

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
          {required && <span className="text-red-500 ml-1">*</span>}
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
              className="absolute top-0 right-0 -m-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-full p-1 shadow-lg transition-colors"
              title="Remover foto"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Badge de detecção facial */}
            {faceDetected !== null && (
              <div
                className={`absolute bottom-2 left-2 px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 shadow-md ${
                  faceDetected
                    ? 'bg-green-500 text-white'
                    : 'bg-yellow-500 text-white'
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
              : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
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

          <CloudUpload className="w-10 h-10 mx-auto mb-3 text-gray-400" />
          <p className="text-sm font-medium text-gray-700">{description}</p>
          <p className="text-xs text-gray-500 mt-2">
            Máximo {maxSize}MB • PNG, JPG, WebP
          </p>
          <p className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1">
            <Scan className="w-3 h-3" />
            Detecção facial automática
          </p>
        </div>
      )}

      {/* Indicador de processamento */}
      {isProcessing && (
        <div className="border-2 border-dashed border-primary rounded-lg p-8 text-center bg-primary/5">
          <Loader2 className="w-10 h-10 mx-auto mb-3 text-primary animate-spin" />
          <p className="text-sm font-medium text-gray-700">Processando imagem...</p>
          <p className="text-xs text-gray-500 mt-2 flex items-center justify-center gap-1">
            <Scan className="w-3 h-3" />
            Detectando rosto e aplicando enquadramento
          </p>
        </div>
      )}

      {/* Mensagem de erro */}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
