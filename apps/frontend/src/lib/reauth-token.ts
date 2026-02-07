/**
 * Módulo de armazenamento do token de reautenticação
 *
 * IMPORTANTE: Este módulo é separado para evitar dependência circular
 * entre api.ts e useReauthentication.ts.
 *
 * Armazena token em memória (não em localStorage por segurança).
 */

// Armazenamento in-memory do token de reautenticação
let reauthTokenCache: string | null = null
let reauthTokenExpiry: number | null = null

/**
 * Define o token de reautenticação com tempo de expiração
 */
export function setReauthToken(token: string, expiresInSeconds: number): void {
  reauthTokenCache = token
  reauthTokenExpiry = Date.now() + expiresInSeconds * 1000
}

/**
 * Obtém o token de reautenticação válido (ou null se expirado/não existe)
 */
export function getReauthToken(): string | null {
  if (!reauthTokenCache || !reauthTokenExpiry) {
    return null
  }

  const now = Date.now()
  // 10 segundos de margem antes da expiração
  if (now >= reauthTokenExpiry - 10000) {
    reauthTokenCache = null
    reauthTokenExpiry = null
    return null
  }

  return reauthTokenCache
}

/**
 * Verifica se existe token de reautenticação válido
 */
export function hasValidReauthToken(): boolean {
  return getReauthToken() !== null
}

/**
 * Limpa o token de reautenticação da memória
 */
export function clearReauthToken(): void {
  reauthTokenCache = null
  reauthTokenExpiry = null
}
