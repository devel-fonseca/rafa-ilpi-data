import { AxiosError } from 'axios'

/**
 * Helper type-safe para extrair mensagem de erro de diferentes tipos de erro
 *
 * Suporta:
 * - AxiosError (erros de API)
 * - Error nativo
 * - Qualquer outro tipo unknown
 *
 * @param error - Erro capturado (tipo unknown)
 * @param defaultMessage - Mensagem padrão caso não seja possível extrair
 * @returns Mensagem de erro formatada
 *
 * @example
 * try {
 *   await api.post('/endpoint')
 * } catch (error: unknown) {
 *   const message = getErrorMessage(error, 'Erro ao processar requisição')
 *   toast.error(message)
 * }
 */
export const getErrorMessage = (error: unknown, defaultMessage: string): string => {
  // Verifica se é um AxiosError (erro de requisição HTTP)
  if (error instanceof AxiosError) {
    return error.response?.data?.message || defaultMessage
  }

  // Verifica se é um Error nativo
  if (error instanceof Error) {
    return error.message
  }

  // Retorna mensagem padrão para outros tipos
  return defaultMessage
}
