import React, { useState, useRef, useEffect } from 'react'
import { User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PhotoUploadProps {
  onPhotoSelected: (file: File | null) => void
  currentPhoto?: string
}

export function PhotoUpload({ onPhotoSelected, currentPhoto }: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentPhoto || null)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  console.log('🖼️ PhotoUpload - currentPhoto recebido:', currentPhoto)
  console.log('🖼️ PhotoUpload - preview state:', preview)

  // Atualizar preview quando currentPhoto mudar
  useEffect(() => {
    if (currentPhoto) {
      console.log('🔄 PhotoUpload - Atualizando preview com currentPhoto:', currentPhoto)
      setIsLoading(true)
      setPreview(currentPhoto)
    }
  }, [currentPhoto])

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione uma imagem')
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 5MB')
        return
      }

      const reader = new FileReader()
      reader.onload = (event) => {
        setPreview(event.target?.result as string)
      }
      reader.readAsDataURL(file)
      onPhotoSelected(file)
    }
  }

  return (
    <div>
      <div
        className={cn(
          'relative w-36 h-48 border-2 border-dashed rounded-lg cursor-pointer overflow-hidden',
          'flex flex-col items-center justify-center transition-all',
          'hover:border-primary hover:bg-primary/5',
          preview ? 'border-gray-400' : 'border-gray-300 bg-gray-50'
        )}
        onClick={handleClick}
      >
        {preview ? (
          <>
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                <p className="text-xs text-gray-600">Carregando foto...</p>
              </div>
            )}
            <img
              src={preview}
              alt="Preview"
              className="absolute inset-0 w-full h-full object-cover"
              crossOrigin="anonymous"
              onLoad={() => setIsLoading(false)}
              onError={() => setIsLoading(false)}
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <p className="text-white text-sm font-medium">Trocar foto</p>
            </div>
          </>
        ) : (
          <>
            <User className="w-12 h-12 text-gray-400 mb-2" />
            <p className="text-xs text-gray-500 text-center px-2">
              Clique para upload<br/>
              <span className="text-xs">Foto 3x4</span>
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>
    </div>
  )
}
