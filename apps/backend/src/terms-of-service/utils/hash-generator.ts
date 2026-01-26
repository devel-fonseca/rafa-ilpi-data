import { createHash } from 'crypto';

/**
 * Gera hash SHA-256 do conteúdo de um termo de uso
 * para garantir integridade e prova jurídica
 */
export function generateTermsHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}
