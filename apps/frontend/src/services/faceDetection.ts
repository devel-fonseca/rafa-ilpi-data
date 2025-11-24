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

import * as blazeface from '@tensorflow-models/blazeface'
import * as tf from '@tensorflow/tfjs'

let model: blazeface.BlazeFaceModel | null = null
let isLoading = false

/**
 * Carrega o modelo BlazeFace (lazy loading)
 * Modelo é pequeno (~1MB) e rápido de carregar
 */
export async function loadFaceDetectionModel(): Promise<blazeface.BlazeFaceModel> {
  if (model) return model

  if (isLoading) {
    // Aguarda o modelo já em carregamento
    while (isLoading) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    return model!
  }

  try {
    isLoading = true
    console.log('🔄 Carregando modelo BlazeFace...')

    // Carregar modelo
    model = await blazeface.load()

    console.log('✅ Modelo BlazeFace carregado')
    return model
  } catch (error) {
    console.error('❌ Erro ao carregar BlazeFace:', error)
    throw error
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

    // Detectar rostos
    const predictions = await faceModel.estimateFaces(imageElement, false)

    if (predictions.length === 0) {
      console.log('⚠️ Nenhum rosto detectado - usando crop centralizado')
      return getFallbackCrop(imageElement)
    }

    // Usar primeiro rosto detectado (maior confiança)
    const face = predictions[0]

    // Coordenadas do bounding box
    const [x1, y1] = face.topLeft as [number, number]
    const [x2, y2] = face.bottomRight as [number, number]

    const faceWidth = x2 - x1
    const faceHeight = y2 - y1

    // Adicionar margem de 30% ao redor do rosto
    const margin = 0.3
    const marginX = faceWidth * margin
    const marginY = faceHeight * margin

    // Calcular crop com margem (garantir que não ultrapasse limites da imagem)
    let cropX = Math.max(0, x1 - marginX)
    let cropY = Math.max(0, y1 - marginY)
    let cropWidth = Math.min(
      imageElement.width - cropX,
      faceWidth + marginX * 2,
    )
    let cropHeight = Math.min(
      imageElement.height - cropY,
      faceHeight + marginY * 2,
    )

    // Garantir proporção 1:1 (quadrado)
    const cropSize = Math.min(cropWidth, cropHeight)
    cropWidth = cropSize
    cropHeight = cropSize

    // Centralizar crop no rosto
    const faceCenterX = x1 + faceWidth / 2
    const faceCenterY = y1 + faceHeight / 2

    cropX = Math.max(0, faceCenterX - cropSize / 2)
    cropY = Math.max(0, faceCenterY - cropSize / 2)

    // Ajustar se ultrapassar bordas
    if (cropX + cropSize > imageElement.width) {
      cropX = imageElement.width - cropSize
    }
    if (cropY + cropSize > imageElement.height) {
      cropY = imageElement.height - cropSize
    }

    console.log('✅ Rosto detectado com sucesso')

    return {
      hasFace: true,
      cropData: {
        x: Math.round(cropX),
        y: Math.round(cropY),
        width: Math.round(cropWidth),
        height: Math.round(cropHeight),
      },
      confidence: face.probability ? face.probability[0] : undefined,
    }
  } catch (error) {
    console.error('❌ Erro na detecção facial:', error)
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
  if (model) {
    model = null
    tf.disposeVariables()
    console.log('🧹 Recursos de detecção facial liberados')
  }
}
