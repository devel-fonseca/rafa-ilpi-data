import { api } from './api'

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
    const formData = new FormData()
    formData.append('file', file)

    const params = new URLSearchParams({ category })
    if (relatedId) {
      params.append('relatedId', relatedId)
    }

    const response = await api.post<UploadResponse>(
      `/files/upload?${params.toString()}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )

    return response.data.fileUrl
  } catch (error: any) {
    console.error('Erro ao fazer upload do arquivo:', error)
    throw new Error(
      error.response?.data?.message || 'Erro ao fazer upload do arquivo'
    )
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
  } catch (error: any) {
    console.error('Erro ao fazer upload dos arquivos:', error)
    throw new Error(
      error.response?.data?.message || 'Erro ao fazer upload dos arquivos'
    )
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
    const formData = new FormData()
    formData.append('file', file)

    const params = new URLSearchParams({ category })
    if (relatedId) {
      params.append('relatedId', relatedId)
    }

    const response = await api.post<UploadResponse>(
      `/files/upload?${params.toString()}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )

    return response.data
  } catch (error: any) {
    console.error('Erro ao fazer upload do arquivo:', error)
    throw new Error(
      error.response?.data?.message || 'Erro ao fazer upload do arquivo'
    )
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
  } catch (error: any) {
    console.error('Erro ao obter URL do arquivo:', error)
    throw new Error(
      error.response?.data?.message || 'Erro ao obter URL do arquivo'
    )
  }
}
