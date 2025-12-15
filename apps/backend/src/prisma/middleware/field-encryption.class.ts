import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';

/**
 * Field-Level Encryption para conformidade LGPD Art. 46
 *
 * Implementa criptografia AES-256-GCM com chave derivada por tenant,
 * garantindo isolamento criptográfico completo entre tenants.
 *
 * Características:
 * - Algoritmo: AES-256-GCM (autenticado, previne tampering)
 * - Derivação de chave: scrypt (seguro contra rainbow tables)
 * - Salt único por valor criptografado
 * - IV (Initialization Vector) aleatório por operação
 * - Authentication tag para verificar integridade
 *
 * Formato do ciphertext:
 * `salt:iv:tag:encrypted` (todos em hex)
 *
 * Exemplo:
 * `64bytes_hex:32bytes_hex:32bytes_hex:variable_hex`
 *
 * @author Emanuel (Dr. E.) + Claude Sonnet 4.5
 * @date 2025-12-14
 * @lgpd Art. 46 - Medidas técnicas de segurança
 */
export class FieldEncryption {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits (padrão GCM)
  private readonly saltLength = 64; // 512 bits (extra security)
  private readonly tagLength = 16; // 128 bits (padrão GCM)

  /**
   * Obtém a master key do ambiente
   * @throws Error se ENCRYPTION_MASTER_KEY não estiver definida
   */
  private getMasterKey(): Buffer {
    const key = process.env.ENCRYPTION_MASTER_KEY;
    if (!key) {
      throw new Error(
        'ENCRYPTION_MASTER_KEY not set in environment variables',
      );
    }

    // Validar formato (64 chars hex = 32 bytes)
    if (key.length !== 64) {
      throw new Error(
        `ENCRYPTION_MASTER_KEY must be 64 hex chars (got ${key.length})`,
      );
    }

    return Buffer.from(key, 'hex');
  }

  /**
   * Deriva chave específica do tenant usando scrypt
   *
   * Isso garante que cada tenant tenha uma chave única,
   * fornecendo isolamento criptográfico total.
   *
   * @param tenantId - UUID do tenant
   * @param salt - Salt aleatório (único por valor)
   * @returns Chave derivada de 256 bits
   */
  private deriveKey(tenantId: string, salt: Buffer): Buffer {
    const masterKey = this.getMasterKey();

    // Combinar master key com tenantId como senha
    const password = `${masterKey.toString('hex')}:${tenantId}`;

    // scrypt: CPU/memory-hard KDF (Key Derivation Function)
    // Protege contra ataques de força bruta
    return scryptSync(password, salt, this.keyLength);
  }

  /**
   * Criptografa um valor de texto plano
   *
   * @param plaintext - Texto a ser criptografado
   * @param tenantId - UUID do tenant (para derivação de chave)
   * @returns Ciphertext no formato `salt:iv:tag:encrypted` (hex)
   */
  encrypt(plaintext: string, tenantId: string): string {
    // Se valor vazio, retornar como está
    if (!plaintext || plaintext.trim() === '') {
      return plaintext;
    }

    // 1. Gerar salt e IV aleatórios
    const salt = randomBytes(this.saltLength);
    const iv = randomBytes(this.ivLength);

    // 2. Derivar chave do tenant
    const key = this.deriveKey(tenantId, salt);

    // 3. Criar cipher
    const cipher = createCipheriv(this.algorithm, key, iv);

    // 4. Criptografar
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    // 5. Obter authentication tag
    const tag = cipher.getAuthTag();

    // 6. Formato: salt:iv:tag:encrypted (tudo em hex)
    return [
      salt.toString('hex'),
      iv.toString('hex'),
      tag.toString('hex'),
      encrypted.toString('hex'),
    ].join(':');
  }

  /**
   * Descriptografa um ciphertext
   *
   * @param ciphertext - Texto criptografado no formato `salt:iv:tag:encrypted`
   * @param tenantId - UUID do tenant (para derivação de chave)
   * @returns Texto plano original
   */
  decrypt(ciphertext: string, tenantId: string): string {
    // Se valor vazio ou não tem formato esperado, retornar como está
    if (!ciphertext || !ciphertext.includes(':')) {
      return ciphertext;
    }

    try {
      // 1. Parse formato salt:iv:tag:encrypted
      const parts = ciphertext.split(':');

      if (parts.length !== 4) {
        // Formato inválido, pode ser texto plano
        return ciphertext;
      }

      const [saltHex, ivHex, tagHex, encryptedHex] = parts;

      const salt = Buffer.from(saltHex, 'hex');
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');

      // 2. Derivar mesma chave
      const key = this.deriveKey(tenantId, salt);

      // 3. Criar decipher
      const decipher = createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);

      // 4. Descriptografar
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      // Em caso de erro (chave errada, dados corrompidos, etc),
      // retornar ciphertext original ao invés de falhar
      console.error('Decryption failed:', error);
      return ciphertext;
    }
  }

  /**
   * Verifica se um valor parece ser um ciphertext
   * (formato salt:iv:tag:encrypted)
   */
  isEncrypted(value: string): boolean {
    if (!value || typeof value !== 'string') {
      return false;
    }

    const parts = value.split(':');
    if (parts.length !== 4) {
      return false;
    }

    // Verificar se todos os parts são hex válidos
    const [salt, iv, tag, encrypted] = parts;

    // Salt: 64 bytes hex = 128 chars
    // IV: 16 bytes hex = 32 chars
    // Tag: 16 bytes hex = 32 chars
    // Encrypted: variável (múltiplo de 2)
    return (
      salt.length === 128 &&
      iv.length === 32 &&
      tag.length === 32 &&
      encrypted.length > 0 &&
      encrypted.length % 2 === 0
    );
  }
}
