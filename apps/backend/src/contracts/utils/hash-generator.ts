import { createHash } from 'crypto';

/**
 * Gera hash SHA-256 do conteúdo de um contrato
 * para garantir integridade e prova jurídica
 */
export function generateContractHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}
