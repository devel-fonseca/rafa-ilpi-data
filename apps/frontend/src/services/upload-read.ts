import { api } from './api'
import { getErrorMessage } from '@/utils/errorHandling'

/**
 * Obtém uma URL assinada (presigned URL) para acessar um arquivo privado.
 * A URL é válida por 1 hora.
 */
export const getSignedFileUrl = async (filePath: string): Promise<string> => {
  try {
    const response = await api.get<{ url: string; expiresIn: number }>(
      `/files/download/${filePath}`
    )
    return response.data.url
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Erro ao obter URL do arquivo'))
  }
}
