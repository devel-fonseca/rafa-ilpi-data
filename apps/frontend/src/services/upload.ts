import { api } from './api'
import { getErrorMessage } from '@/utils/errorHandling'

/**
 * Interface para resposta do upload de arquivo
 */
export interface UploadResponse {
  fileId: string
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
}

/**
 * Sanitiza o nome do arquivo removendo acentos e caracteres especiais
 * Mantém apenas letras, números, hífens, underscores e pontos
 *
 * @param filename - Nome original do arquivo
 * @returns Nome sanitizado
 */
const sanitizeFilename = (filename: string): string => {
  // Remover acentos usando normalize + replace
  const withoutAccents = filename
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  // Separar nome e extensão
  const lastDotIndex = withoutAccents.lastIndexOf('.')
  const name = lastDotIndex > 0 ? withoutAccents.slice(0, lastDotIndex) : withoutAccents
  const extension = lastDotIndex > 0 ? withoutAccents.slice(lastDotIndex) : ''

  // Remover caracteres especiais (manter apenas letras, números, hífens e underscores)
  const sanitizedName = name.replace(/[^a-zA-Z0-9-_]/g, '_')

  return sanitizedName + extension
}

/**
 * Faz upload de um arquivo para o MinIO
 *
 * @param file - Arquivo a ser enviado
 * @param category - Categoria do arquivo (documents, photos, medical, etc)
 * @param relatedId - ID relacionado (ex: residentId)
 * @returns URL do arquivo no MinIO
 */
export const uploadFile = async (
  file: File,
  category: string = 'documents',
  relatedId?: string
): Promise<string> => {
  try {
    // Sanitizar nome do arquivo
    const sanitizedFilename = sanitizeFilename(file.name)
    const sanitizedFile = new File([file], sanitizedFilename, { type: file.type })

    const formData = new FormData()
    formData.append('file', sanitizedFile)

    const params = new URLSearchParams({ category })
    if (relatedId) {
      params.append('relatedId', relatedId)
    }

    // IMPORTANTE: Não definir Content-Type manualmente para FormData
    // O navegador define automaticamente com o boundary correto
    const response = await api.post<UploadResponse>(
      `/files/upload?${params.toString()}`,
      formData
    )

    return response.data.fileUrl
  } catch (error: unknown) {
    console.error('Erro ao fazer upload do arquivo:', error)
    throw new Error(getErrorMessage(error, 'Erro ao fazer upload do arquivo'))
  }
}

/**
 * Faz upload de múltiplos arquivos em paralelo
 *
 * @param files - Array de arquivos a serem enviados
 * @param category - Categoria dos arquivos
 * @param relatedId - ID relacionado (ex: residentId)
 * @returns Array de URLs dos arquivos no MinIO
 */
export const uploadFiles = async (
  files: File[],
  category: string = 'documents',
  relatedId?: string
): Promise<string[]> => {
  try {
    const uploadPromises = files.map((file) =>
      uploadFile(file, category, relatedId)
    )

    return await Promise.all(uploadPromises)
  } catch (error: unknown) {
    console.error('Erro ao fazer upload dos arquivos:', error)
    throw new Error(getErrorMessage(error, 'Erro ao fazer upload dos arquivos'))
  }
}

/**
 * Faz upload de um arquivo único e retorna a resposta completa
 * (útil quando precisamos de mais informações além da URL)
 *
 * @param file - Arquivo a ser enviado
 * @param category - Categoria do arquivo
 * @param relatedId - ID relacionado
 * @returns Resposta completa do upload
 */
export const uploadFileDetailed = async (
  file: File,
  category: string = 'documents',
  relatedId?: string
): Promise<UploadResponse> => {
  try {
    // Sanitizar nome do arquivo
    const sanitizedFilename = sanitizeFilename(file.name)
    const sanitizedFile = new File([file], sanitizedFilename, { type: file.type })

    const formData = new FormData()
    formData.append('file', sanitizedFile)

    const params = new URLSearchParams({ category })
    if (relatedId) {
      params.append('relatedId', relatedId)
    }

    // IMPORTANTE: Não definir Content-Type manualmente para FormData
    // O navegador define automaticamente com o boundary correto
    const response = await api.post<UploadResponse>(
      `/files/upload?${params.toString()}`,
      formData
    )

    return response.data
  } catch (error: unknown) {
    console.error('Erro ao fazer upload do arquivo:', error)
    throw new Error(getErrorMessage(error, 'Erro ao fazer upload do arquivo'))
  }
}

/**
 * Obtém uma URL assinada (presigned URL) para acessar um arquivo privado
 * A URL é válida por 1 hora
 *
 * @param filePath - Caminho do arquivo no MinIO (ex: tenants/xxx/photos/yyy.png)
 * @returns URL assinada temporária
 */
export const getSignedFileUrl = async (filePath: string): Promise<string> => {
  try {
    const response = await api.get<{ url: string; expiresIn: number }>(
      `/files/download/${filePath}`
    )
    return response.data.url
  } catch (error: unknown) {
    console.error('Erro ao obter URL do arquivo:', error)
    throw new Error(getErrorMessage(error, 'Erro ao obter URL do arquivo'))
  }
}
