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
 * Sanitiza o nome do arquivo removendo acentos e caracteres especiais.
 * Mantém apenas letras, números, hífens, underscores e pontos.
 */
export const sanitizeFilename = (filename: string): string => {
  const withoutAccents = filename
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  const lastDotIndex = withoutAccents.lastIndexOf('.')
  const name = lastDotIndex > 0 ? withoutAccents.slice(0, lastDotIndex) : withoutAccents
  const extension = lastDotIndex > 0 ? withoutAccents.slice(lastDotIndex) : ''

  const sanitizedName = name.replace(/[^a-zA-Z0-9-_]/g, '_')

  return sanitizedName + extension
}
