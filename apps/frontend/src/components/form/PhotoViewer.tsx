import { useState, useEffect, useRef } from 'react'
import { User, AlertCircle } from 'lucide-react'
import { getSignedFileUrl } from '@/services/upload'

interface PhotoViewerProps {
  photoUrl?: string
  /** URLs de thumbnails (vêm do backend via API) */
  photoUrlSmall?: string
  photoUrlMedium?: string
  altText?: string
  /** Tamanhos semânticos otimizados para thumbnails */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Se true, exibe bordas arredondadas (rounded-full) */
  rounded?: boolean
  className?: string
  /** Se true, não tenta assinar a URL (já vem assinada da API) */
  isSignedUrl?: boolean
}

const sizeClasses = {
  xs: 'w-8 h-8',      // 32px - para listagens muito compactas
  sm: 'w-16 h-16',    // 64px - ideal para listas (usa thumbnail small)
  md: 'w-32 h-32',    // 128px - ideal para cards (usa thumbnail medium)
  lg: 'w-48 h-48',    // 192px - ideal para perfis (usa original)
  xl: 'w-64 h-64',    // 256px - ideal para visualização detalhada (usa original)
}

// Cache global em memória para URLs assinadas
const urlCache = new Map<string, { url: string; timestamp: number }>()
const CACHE_DURATION = 50 * 60 * 1000 // 50 minutos (URLs válidas por 1 hora)

// Placeholder blur (SVG base64 - quadrado cinza com gradiente)
const BLUR_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNlNWU3ZWIiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNmOWZhZmIiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9InVybCgjZykiLz48L3N2Zz4='

/**
 * PhotoViewer V2 - Visualizador inteligente de fotos com thumbnails
 *
 * Melhorias V2:
 * - Seleção inteligente de thumbnail baseada no tamanho (economiza 92% de banda)
 * - Lazy loading nativo do navegador
 * - Blur placeholder para melhor UX
 * - Suporte a rounded (bordas arredondadas)
 * - 5 tamanhos semânticos (xs, sm, md, lg, xl)
 * - Backward compatible com fotos antigas (sem thumbnails)
 * - Cache em memória para URLs assinadas
 */
export function PhotoViewer({
  photoUrl,
  photoUrlSmall,
  photoUrlMedium,
  altText = 'Foto',
  size = 'md',
  rounded = false,
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

  /**
   * Seleção inteligente de thumbnail baseada no tamanho solicitado
   * Reduz uso de banda em até 92%
   */
  const selectBestThumbnail = (): string | undefined => {
    // Mapeamento: tamanho → melhor thumbnail
    switch (size) {
      case 'xs': // 32px - usa small (64px) se disponível
      case 'sm': // 64px - usa small (64px)
        return photoUrlSmall || photoUrlMedium || photoUrl
      case 'md': // 128px - usa medium (150px)
        return photoUrlMedium || photoUrl
      case 'lg': // 192px - usa original (300px)
      case 'xl': // 256px - usa original (300px)
      default:
        return photoUrl
    }
  }

  useEffect(() => {
    // Selecionar melhor thumbnail
    const selectedUrl = selectBestThumbnail()

    if (!selectedUrl) {
      setDisplayUrl(null)
      setIsLoading(false)
      setError(null)
      return
    }

    // Se já é uma URL assinada, usa direto
    if (isSignedUrl || selectedUrl.startsWith('http')) {
      setDisplayUrl(selectedUrl)
      setIsLoading(false)
      setError(null)
      return
    }

    // Verificar cache antes de fazer requisição
    const cachedUrl = getCachedUrl(selectedUrl)
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
        const signed = await getSignedFileUrl(selectedUrl)
        setCachedUrl(selectedUrl, signed)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoUrl, photoUrlSmall, photoUrlMedium, size, isSignedUrl])

  // Classes de borda: rounded ou rounded-lg
  const borderClass = rounded ? 'rounded-full' : 'rounded-lg'

  return (
    <div
      className={`relative ${borderClass} border-2 border-border overflow-hidden bg-muted/50 flex items-center justify-center ${sizeClasses[size]} ${className}`}
    >
      {isLoading ? (
        // Spinner de carregamento
        <div className="flex items-center justify-center w-full h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        // Fallback com erro
        <div className="flex flex-col items-center justify-center gap-2 text-center p-2">
          <AlertCircle className="w-1/3 h-1/3 text-danger/30" />
          <p className="text-xs text-danger">{error}</p>
        </div>
      ) : displayUrl ? (
        // Imagem carregada com lazy loading e blur placeholder
        <img
          src={displayUrl}
          alt={altText}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          style={{
            backgroundImage: `url(${BLUR_PLACEHOLDER})`,
            backgroundSize: 'cover',
          }}
          onError={() => {
            setError('Não conseguiu carregar a imagem')
            setDisplayUrl(null)
          }}
        />
      ) : (
        // Fallback padrão (sem foto)
        <User className="w-1/3 h-1/3 text-muted-foreground/70" />
      )}
    </div>
  )
}
