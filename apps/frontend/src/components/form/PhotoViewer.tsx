import React, { useState, useEffect, useRef } from 'react'
import { User, AlertCircle } from 'lucide-react'
import { getSignedFileUrl } from '@/services/upload'

interface PhotoViewerProps {
  photoUrl?: string
  altText?: string
  size?: 'small' | 'medium' | 'large'
  className?: string
  isSignedUrl?: boolean
}

const sizeClasses = {
  small: 'w-16 h-16',    // Quadrado 1:1
  medium: 'w-32 h-32',   // Quadrado 1:1
  large: 'w-48 h-48',    // Quadrado 1:1
}

// Cache global em memória para URLs assinadas
const urlCache = new Map<string, { url: string; timestamp: number }>()
const CACHE_DURATION = 50 * 60 * 1000 // 50 minutos (URLs válidas por 1 hora)

/**
 * Componente PhotoViewer - Visualizador inteligente de fotos
 *
 * Recursos:
 * - Cache em memória para URLs assinadas (evita múltiplas requisições)
 * - Detecção automática de URLs já assinadas (http/https)
 * - Fallback elegante com ícone de usuário
 * - Suporte a 3 tamanhos (small, medium, large)
 * - Tratamento robusto de erros
 * - Spinner de carregamento
 */
export function PhotoViewer({
  photoUrl,
  altText = 'Foto',
  size = 'medium',
  className = '',
  isSignedUrl = false,
}: PhotoViewerProps) {
  const [displayUrl, setDisplayUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Limpar URL do cache se expirou
  const getCachedUrl = (url: string): string | null => {
    const cached = urlCache.get(url)
    if (cached) {
      const now = Date.now()
      if (now - cached.timestamp < CACHE_DURATION) {
        return cached.url
      } else {
        urlCache.delete(url)
      }
    }
    return null
  }

  // Salvar URL no cache
  const setCachedUrl = (key: string, url: string) => {
    urlCache.set(key, { url, timestamp: Date.now() })
  }

  useEffect(() => {
    if (!photoUrl) {
      setDisplayUrl(null)
      setIsLoading(false)
      setError(null)
      return
    }

    // Se já é uma URL assinada, usa direto
    if (isSignedUrl || photoUrl.startsWith('http')) {
      setDisplayUrl(photoUrl)
      setIsLoading(false)
      setError(null)
      return
    }

    // Verificar cache antes de fazer requisição
    const cachedUrl = getCachedUrl(photoUrl)
    if (cachedUrl) {
      setDisplayUrl(cachedUrl)
      setIsLoading(false)
      setError(null)
      return
    }

    // Fazer requisição para assinar URL
    const loadSignedUrl = async () => {
      // Cancelar requisição anterior se existir
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()
      setIsLoading(true)
      setError(null)

      try {
        const signed = await getSignedFileUrl(photoUrl)
        setCachedUrl(photoUrl, signed)
        setDisplayUrl(signed)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Erro ao gerar URL assinada:', err)
          setError('Erro ao carregar foto')
          setDisplayUrl(null)
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadSignedUrl()

    // Cleanup: cancelar requisição se componente desmontar
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [photoUrl, isSignedUrl])

  return (
    <div
      className={`relative rounded-lg border-2 border-gray-300 overflow-hidden bg-gray-50 flex items-center justify-center ${sizeClasses[size]} ${className}`}
    >
      {isLoading ? (
        // Spinner de carregamento
        <div className="flex items-center justify-center w-full h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        // Fallback com erro
        <div className="flex flex-col items-center justify-center gap-2 text-center p-2">
          <AlertCircle className="w-1/3 h-1/3 text-red-300" />
          <p className="text-xs text-red-500">{error}</p>
        </div>
      ) : displayUrl ? (
        // Imagem carregada
        <img
          src={displayUrl}
          alt={altText}
          className="w-full h-full object-cover"
          onError={() => {
            setError('Não conseguiu carregar a imagem')
            setDisplayUrl(null)
          }}
        />
      ) : (
        // Fallback padrão (sem foto)
        <User className="w-1/3 h-1/3 text-gray-400" />
      )}
    </div>
  )
}
