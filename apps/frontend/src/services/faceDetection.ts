/**
 * Serviço de Detecção Facial usando BlazeFace (TensorFlow.js)
 *
 * Funcionalidades:
 * - Detecta rostos em imagens
 * - Calcula posição e tamanho do rosto
 * - Gera crop inteligente centralizado no rosto
 * - Adiciona margem de 30% para contexto
 * - Fallback para crop centralizado se não detectar rosto
 */
import { devLogger } from '@/utils/devLogger'

type BlazeFaceModule = typeof import('@tensorflow-models/blazeface')
type TensorflowModule = typeof import('@tensorflow/tfjs')

let blazefaceModule: BlazeFaceModule | null = null
let tfModule: TensorflowModule | null = null
let model: import('@tensorflow-models/blazeface').BlazeFaceModel | null = null
let isLoading = false
let loadError = false

function resolveFaceProbability(
  probability: number | { dataSync?: () => ArrayLike<number> } | undefined,
): number | undefined {
  if (typeof probability === 'number') {
    return probability
  }

  if (probability && typeof probability === 'object' && typeof probability.dataSync === 'function') {
    return probability.dataSync()[0]
  }

  return undefined
}

/**
 * Carrega o modelo BlazeFace (lazy loading)
 * Modelo é pequeno (~1MB) e rápido de carregar
 */
export async function loadFaceDetectionModel(): Promise<import('@tensorflow-models/blazeface').BlazeFaceModel | null> {
  // Se já teve erro antes, não tenta novamente
  if (loadError) {
    devLogger.warn('⚠️ Detecção facial desabilitada devido a erro anterior')
    return null
  }

  if (model) return model

  if (isLoading) {
    // Aguarda o modelo já em carregamento
    while (isLoading) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    return model
  }

  try {
    isLoading = true
    devLogger.log('🔄 Carregando modelo BlazeFace...')

    if (!blazefaceModule || !tfModule) {
      const [blazefaceImported, tfImported] = await Promise.all([
        import('@tensorflow-models/blazeface'),
        import('@tensorflow/tfjs'),
      ])
      blazefaceModule = blazefaceImported
      tfModule = tfImported
    }

    // Configurar backend do TensorFlow.js
    await tfModule.ready()
    devLogger.log('🔄 TensorFlow.js backend:', tfModule.getBackend())

    // Carregar modelo com timeout de 10 segundos
    const loadPromise = blazefaceModule.load()
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout ao carregar modelo')), 10000)
    )

    model = await Promise.race([loadPromise, timeoutPromise])

    devLogger.log('✅ Modelo BlazeFace carregado com sucesso')
    return model
  } catch (error) {
    loadError = true
    devLogger.warn(
      '⚠️ Não foi possível carregar o modelo de detecção facial. A aplicação continuará funcionando com crop centralizado.',
      error
    )
    return null
  } finally {
    isLoading = false
  }
}

interface FaceDetectionResult {
  hasFace: boolean
  cropData: {
    x: number
    y: number
    width: number
    height: number
  }
  confidence?: number
}

/**
 * Detecta rosto em uma imagem e retorna coordenadas de crop
 * @param imageElement - Elemento <img> ou HTMLImageElement
 * @returns Dados do crop (com ou sem detecção de rosto)
 */
export async function detectFaceAndCrop(
  imageElement: HTMLImageElement,
): Promise<FaceDetectionResult> {
  try {
    // Carregar modelo se necessário
    const faceModel = await loadFaceDetectionModel()

    // Se modelo não carregou, usar fallback
    if (!faceModel) {
      devLogger.log('⚠️ Modelo não disponível - usando crop centralizado')
      return getFallbackCrop(imageElement)
    }

    // Detectar rostos
    const predictions = await faceModel.estimateFaces(imageElement, false)

    if (predictions.length === 0) {
      devLogger.log('⚠️ Nenhum rosto detectado - usando crop centralizado')
      return getFallbackCrop(imageElement)
    }

    // Usar primeiro rosto detectado (maior confiança)
    const face = predictions[0]

    // Coordenadas do bounding box
    const [x1, y1] = face.topLeft as [number, number]
    const [x2, y2] = face.bottomRight as [number, number]

    const faceWidth = x2 - x1
    const faceHeight = y2 - y1

    // Margens assimétricas em nível moderado:
    // preserva a testa sem "afastar" excessivamente o rosto.
    const sideMargin = faceWidth * 0.25
    const topMargin = faceHeight * 0.42
    const bottomMargin = faceHeight * 0.22

    const expandedLeft = x1 - sideMargin
    const expandedRight = x2 + sideMargin
    const expandedTop = y1 - topMargin
    const expandedBottom = y2 + bottomMargin

    const expandedWidth = expandedRight - expandedLeft
    const expandedHeight = expandedBottom - expandedTop

    // Garantir proporção 1:1 (quadrado) e respeitar limites da imagem
    const cropSize = Math.min(
      Math.max(expandedWidth, expandedHeight),
      imageElement.width,
      imageElement.height,
    )

    // Centro com viés suave para cima (mais discreto que a versão anterior)
    const faceCenterX = x1 + faceWidth / 2
    const faceCenterY = y1 + faceHeight * 0.48

    let cropX = faceCenterX - cropSize / 2
    let cropY = faceCenterY - cropSize / 2

    // Ajustar se ultrapassar bordas
    if (cropX < 0) cropX = 0
    if (cropY < 0) cropY = 0
    if (cropX + cropSize > imageElement.width) {
      cropX = imageElement.width - cropSize
    }
    if (cropY + cropSize > imageElement.height) {
      cropY = imageElement.height - cropSize
    }

    devLogger.log('✅ Rosto detectado com sucesso')

    return {
      hasFace: true,
      cropData: {
        x: Math.round(cropX),
        y: Math.round(cropY),
        width: Math.round(cropSize),
        height: Math.round(cropSize),
      },
      confidence: resolveFaceProbability(face.probability),
    }
  } catch (error) {
    devLogger.error('❌ Erro na detecção facial:', error)
    // Fallback para crop centralizado em caso de erro
    return getFallbackCrop(imageElement)
  }
}

/**
 * Retorna crop centralizado (fallback quando não detecta rosto)
 */
function getFallbackCrop(imageElement: HTMLImageElement): FaceDetectionResult {
  const size = Math.min(imageElement.width, imageElement.height)
  const x = (imageElement.width - size) / 2
  const y = (imageElement.height - size) / 2

  return {
    hasFace: false,
    cropData: {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(size),
      height: Math.round(size),
    },
  }
}

/**
 * Aplica crop na imagem usando canvas
 * @param imageElement - Imagem original
 * @param cropData - Coordenadas do crop
 * @param outputSize - Tamanho final da imagem (padrão: 300x300)
 * @returns Blob da imagem cropada em WebP
 */
export async function applyCrop(
  imageElement: HTMLImageElement,
  cropData: { x: number; y: number; width: number; height: number },
  outputSize: number = 300,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = outputSize
    canvas.height = outputSize

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('Não foi possível criar contexto do canvas'))
      return
    }

    // Desenhar crop da imagem original redimensionado para outputSize
    ctx.drawImage(
      imageElement,
      cropData.x,
      cropData.y,
      cropData.width,
      cropData.height,
      0,
      0,
      outputSize,
      outputSize,
    )

    // Converter para WebP
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Erro ao gerar blob da imagem'))
        }
      },
      'image/webp',
      0.95, // Qualidade 95%
    )
  })
}

/**
 * Pipeline completo: detecta rosto, aplica crop e retorna blob
 * @param file - Arquivo original
 * @returns Blob da imagem processada
 */
export async function processImageWithFaceDetection(
  file: File,
): Promise<{
  blob: Blob
  hasFace: boolean
  confidence?: number
}> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = async (e) => {
      img.src = e.target?.result as string

      img.onload = async () => {
        try {
          // Detectar rosto
          const detection = await detectFaceAndCrop(img)

          // Aplicar crop
          const blob = await applyCrop(img, detection.cropData, 300)

          resolve({
            blob,
            hasFace: detection.hasFace,
            confidence: detection.confidence,
          })
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => reject(new Error('Erro ao carregar imagem'))
    }

    reader.onerror = () => reject(new Error('Erro ao ler arquivo'))
    reader.readAsDataURL(file)
  })
}

/**
 * Limpa recursos do TensorFlow.js (chamar ao desmontar componente)
 */
export function cleanupFaceDetection() {
  if (model && tfModule) {
    model = null
    tfModule.disposeVariables()
    devLogger.log('🧹 Recursos de detecção facial liberados')
  }
}
