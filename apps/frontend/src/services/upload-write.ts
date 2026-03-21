import { api } from './api'
import { getErrorMessage } from '@/utils/errorHandling'
import { sanitizeFilename, type UploadResponse } from './upload-core'

/**
 * Faz upload de um arquivo para o storage.
 */
export const uploadFile = async (
  file: File,
  category: string = 'documents',
  relatedId?: string
): Promise<string> => {
  try {
    const sanitizedFilename = sanitizeFilename(file.name)
    const sanitizedFile = new File([file], sanitizedFilename, { type: file.type })

    const formData = new FormData()
    formData.append('file', sanitizedFile)

    const params = new URLSearchParams({ category })
    if (relatedId) {
      params.append('relatedId', relatedId)
    }

    const response = await api.post<UploadResponse>(
      `/files/upload?${params.toString()}`,
      formData
    )

    return response.data.fileUrl
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Erro ao fazer upload do arquivo'))
  }
}

/**
 * Faz upload de múltiplos arquivos em paralelo.
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
    throw new Error(getErrorMessage(error, 'Erro ao fazer upload dos arquivos'))
  }
}

/**
 * Faz upload de um arquivo único e retorna a resposta completa.
 */
export const uploadFileDetailed = async (
  file: File,
  category: string = 'documents',
  relatedId?: string
): Promise<UploadResponse> => {
  try {
    const sanitizedFilename = sanitizeFilename(file.name)
    const sanitizedFile = new File([file], sanitizedFilename, { type: file.type })

    const formData = new FormData()
    formData.append('file', sanitizedFile)

    const params = new URLSearchParams({ category })
    if (relatedId) {
      params.append('relatedId', relatedId)
    }

    const response = await api.post<UploadResponse>(
      `/files/upload?${params.toString()}`,
      formData
    )

    return response.data
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Erro ao fazer upload do arquivo'))
  }
}
