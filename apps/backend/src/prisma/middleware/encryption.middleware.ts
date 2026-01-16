import { Prisma } from '@prisma/client';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';
import { Logger } from '@nestjs/common';

/**
 * FieldEncryption - Criptografia AES-256-GCM para campos sensíveis
 *
 * Conforme LGPD Art. 46 - Medidas técnicas de segurança
 *
 * DECISÃO (14/12/2025 - Dr. E.):
 * - FASE 1: Apenas CPF/RG/CNS (Opção A)
 * - Nome NÃO criptografado (necessário para busca, protegido via RBAC)
 *
 * CARACTERÍSTICAS:
 * - AES-256-GCM: Authenticated Encryption (previne tampering)
 * - Scrypt KDF: Derivação de chave resistente a rainbow tables
 * - Chave derivada por tenant: Isolamento criptográfico total
 * - Salt + IV únicos: Mesmo valor plaintext = ciphertexts diferentes
 * - Auth Tag: Detecta adulteração de dados
 *
 * FORMATO: salt:iv:tag:encrypted (tudo em hex)
 * Exemplo: 128chars:32chars:32chars:variable
 *
 * @author Emanuel (Dr. E.) + Claude Sonnet 4.5
 * @date 2025-12-14
 * @lgpd Art. 46 - Proteção de dados sensíveis
 */
export class FieldEncryption {
  private readonly logger = new Logger(FieldEncryption.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits (GCM padrão)
  private readonly saltLength = 64; // 512 bits (extra security)
  private readonly authTagLength = 16; // 128 bits (GCM padrão)

  constructor(private readonly masterKey: string) {
    if (!masterKey || masterKey.length !== 64) {
      throw new Error(
        'ENCRYPTION_MASTER_KEY must be exactly 64 hex chars (32 bytes)',
      );
    }
  }

  /**
   * Derivar chave específica do tenant usando scrypt
   * Garante isolamento criptográfico: cada tenant tem chave única
   *
   * @param tenantId - UUID do tenant
   * @param salt - Salt aleatório (64 bytes)
   * @returns Chave derivada de 256 bits
   */
  private deriveKey(tenantId: string, salt: Buffer): Buffer {
    // Combinar master key com tenantId como senha
    const password = `${this.masterKey}:${tenantId}`;

    // scrypt: CPU/memory-hard KDF (protege contra força bruta)
    // N=16384, r=8, p=1 (padrão recomendado)
    return scryptSync(password, salt, this.keyLength);
  }

  /**
   * Criptografar texto plano
   *
   * @param plaintext - Texto a ser criptografado
   * @param tenantId - UUID do tenant (para derivação de chave)
   * @returns Ciphertext formato: salt:iv:tag:encrypted (hex)
   */
  encrypt(
    plaintext: string | null | undefined,
    tenantId: string,
  ): string | null {
    // Preservar valores nulos/vazios
    if (!plaintext || plaintext.trim() === '') {
      return null;
    }

    try {
      // 1. Gerar salt e IV aleatórios (únicos por operação)
      const salt = randomBytes(this.saltLength);
      const iv = randomBytes(this.ivLength);

      // 2. Derivar chave específica para este tenant
      const key = this.deriveKey(tenantId, salt);

      // 3. Criar cipher AES-256-GCM
      const cipher = createCipheriv(this.algorithm, key, iv);

      // 4. Criptografar
      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
      ]);

      // 5. Obter authentication tag (garante integridade)
      const authTag = cipher.getAuthTag();

      // 6. Formato: salt:iv:tag:encrypted (hex para storage seguro)
      return [
        salt.toString('hex'), // 128 chars
        iv.toString('hex'), // 32 chars
        authTag.toString('hex'), // 32 chars
        encrypted.toString('hex'), // variável
      ].join(':');
    } catch (error) {
      this.logger.error(
        `Encryption error for tenant ${tenantId}: ${error.message}`,
        error.stack,
      );
      throw new Error('Failed to encrypt field');
    }
  }

  /**
   * Descriptografar ciphertext
   *
   * @param encryptedData - String formato: salt:iv:tag:encrypted (hex)
   * @param tenantId - UUID do tenant (para derivar mesma chave)
   * @returns Texto plano original
   */
  decrypt(
    encryptedData: string | null | undefined,
    tenantId: string,
  ): string | null {
    // Preservar valores nulos/vazios
    if (!encryptedData || encryptedData.trim() === '') {
      return null;
    }

    // Se não tem formato criptografado, retornar como está (dados legados)
    if (!this.isEncrypted(encryptedData)) {
      return encryptedData;
    }

    try {
      // 1. Parse formato salt:iv:tag:encrypted
      const parts = encryptedData.split(':');
      if (parts.length !== 4) {
        throw new Error('Invalid encrypted data format');
      }

      const [saltHex, ivHex, authTagHex, encryptedHex] = parts;

      // 2. Converter hex para Buffer
      const salt = Buffer.from(saltHex, 'hex');
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');

      // 3. Derivar mesma chave (usando mesmo salt + tenantId)
      const key = this.deriveKey(tenantId, salt);

      // 4. Criar decipher
      const decipher = createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag); // Validar integridade

      // 5. Descriptografar (falha se authTag inválido = dados adulterados)
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      this.logger.error(
        `Decryption error for tenant ${tenantId}: ${error.message}`,
        error.stack,
      );
      // Se descriptografia falhar, pode ser adulteração ou corrupção
      throw new Error(
        'Failed to decrypt field - data may be corrupted or tampered',
      );
    }
  }

  /**
   * Verificar se string está no formato criptografado
   * Útil para evitar dupla criptografia e detectar dados legados
   */
  isEncrypted(value: string | null | undefined): boolean {
    if (!value) return false;

    // Formato esperado: 4 partes separadas por ':'
    const parts = value.split(':');
    if (parts.length !== 4) return false;

    // Verificar comprimentos esperados
    const [salt, iv, tag, encrypted] = parts;

    // Salt: 64 bytes hex = 128 chars
    // IV: 16 bytes hex = 32 chars
    // Tag: 16 bytes hex = 32 chars
    // Encrypted: variável (múltiplo de 2 chars hex)
    if (salt.length !== 128) return false;
    if (iv.length !== 32) return false;
    if (tag.length !== 32) return false;
    if (encrypted.length === 0 || encrypted.length % 2 !== 0) return false;

    // Verificar se todas as partes são hex válido
    const hexRegex = /^[0-9a-f]+$/i;
    return parts.every((part) => hexRegex.test(part));
  }
}

/**
 * Configuração de campos criptografados por modelo
 *
 * DECISÃO LGPD (14/12/2025 - Dr. E.):
 * FASE 1 - Opção A: Apenas CPF/RG/CNS (Identificadores Únicos)
 *
 * JUSTIFICATIVA:
 * - CPF/RG/CNS: Raramente usados em buscas textuais
 * - Nome: NÃO criptografado (necessário para busca/autocomplete)
 * - Proteção do nome via: RBAC (controle de acesso) + Auditoria (UserHistory)
 * - LGPD Art. 7º, I: Base legal = consentimento (residente autoriza)
 * - LGPD Art. 46: Segurança adequada via controle de acesso
 *
 * FASES FUTURAS (comentadas - descomentar após validar FASE 1):
 * - FASE 2: Condition, Allergy, ClinicalNote (dados clínicos textuais)
 * - FASE 3: Prescription, Medication, DailyRecord (dados complementares)
 */
export const ENCRYPTED_FIELDS: Record<string, string[]> = {
  // FASE 1 - Identificadores Críticos (IMPLEMENTADO - 14/12/2025)
  Resident: [
    'cpf', // CPF do residente (crítico)
    'rg', // RG do residente
    'cns', // Cartão Nacional de Saúde
    'legalGuardianCpf', // CPF do responsável legal
    'legalGuardianRg', // RG do responsável legal
  ],

  // FASE 2 - Dados Clínicos Textuais (IMPLEMENTADO - 14/12/2025)
  Condition: [
    'name',        // Nome da condição/diagnóstico
    'icd10Code',   // Código CID-10
    'notes',       // Observações clínicas
  ],
  Allergy: [
    'allergen',    // Alérgeno
    'reaction',    // Reação alérgica
    'notes',       // Observações
  ],
  ClinicalNote: [
    'subjective',  // Subjetivo (queixa do paciente)
    'objective',   // Objetivo (exame físico)
    'assessment',  // Avaliação (diagnóstico)
    'plan',        // Plano (conduta)
  ],

  // FASE 3 - Dados Complementares (IMPLEMENTADO - 14/12/2025)
  Prescription: [
    'notes',       // Observações da prescrição
  ],
  Medication: [
    'instructions', // Instruções de uso
    'notes',       // Observações
  ],
  DailyRecord: [
    'notes',       // Notas gerais
  ],
};

/**
 * Criar middleware de criptografia para Prisma
 *
 * FUNCIONAMENTO:
 * 1. ANTES de salvar (create/update): criptografa campos sensíveis
 * 2. DEPOIS de buscar (find*): descriptografa campos sensíveis
 * 3. Transparente para Services (não precisam saber)
 *
 * IMPORTANTE:
 * - Requer tenantId em todas as queries (para derivação de chave)
 * - Campos criptografados NÃO podem ser usados em WHERE/LIKE
 * - Performance overhead: ~5-10% por operação
 *
 * @param encryptionKey - Master key do ambiente (.env)
 */
export function createEncryptionMiddleware(
  encryptionKey: string,
): Prisma.Middleware {
  const encryption = new FieldEncryption(encryptionKey);
  const logger = new Logger('EncryptionMiddleware');

  return async (params, next) => {
    const model = params.model;
    const action = params.action;

    // Verificar se modelo tem campos criptografados configurados
    if (!model || !ENCRYPTED_FIELDS[model]) {
      return next(params);
    }

    const fieldsToEncrypt = ENCRYPTED_FIELDS[model];

    // ============================================================
    // ENCRYPT: Antes de salvar (CREATE, UPDATE, UPSERT)
    // ============================================================
    if (
      ['create', 'update', 'upsert', 'createMany', 'updateMany'].includes(
        action,
      )
    ) {
      const tenantId = extractTenantId(params);

      if (!tenantId) {
        logger.warn(
          `No tenantId found for ${model}.${action} - skipping encryption`,
        );
        return next(params);
      }

      // Criptografar campos nos dados
      encryptFields(params, action, fieldsToEncrypt, encryption, tenantId);
    }

    // Executar operação no banco
    const result = await next(params);

    // ============================================================
    // DECRYPT: Após buscar (FIND*, CREATE, UPDATE retornam dados)
    // ============================================================
    if (
      ['findUnique', 'findFirst', 'findMany', 'create', 'update'].includes(
        action,
      )
    ) {
      if (!result) return result;

      const decryptRecord = (record: Record<string, unknown>) => {
        const tenantId = record?.tenantId;
        if (!tenantId) return record;

        for (const field of fieldsToEncrypt) {
          if (record[field] && typeof record[field] === 'string') {
            try {
              // Só descriptografar se estiver criptografado
              if (encryption.isEncrypted(record[field] as string)) {
                record[field] = encryption.decrypt(record[field] as string, tenantId as string);
              }
            } catch (error) {
              logger.error(
                `Failed to decrypt ${model}.${field} for tenant ${tenantId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              );
              // Manter valor criptografado em caso de erro (não quebrar app)
            }
          }
        }

        return record;
      };

      // Descriptografar único registro ou array
      if (Array.isArray(result)) {
        return result.map(decryptRecord);
      } else {
        return decryptRecord(result);
      }
    }

    return result;
  };
}

/**
 * Extrair tenantId dos parâmetros da operação
 * Suporta múltiplos formatos de query
 */
function extractTenantId(params: Prisma.MiddlewareParams): string | null {
  // Prioridade 1: tenantId direto nos dados
  if (params.args?.data?.tenantId) {
    return params.args.data.tenantId as string;
  }

  // Prioridade 2: tenantId no where
  if (params.args?.where?.tenantId) {
    return params.args.where.tenantId as string;
  }

  // Prioridade 3: tenantId em operações nested (update)
  if (params.args?.data?.tenant?.connect?.id) {
    return params.args.data.tenant.connect.id as string;
  }

  return null;
}

/**
 * Criptografar campos baseado no tipo de ação
 */
function encryptFields(
  params: Prisma.MiddlewareParams,
  action: string,
  fields: string[],
  encryption: FieldEncryption,
  tenantId: string,
): void {
  const processData = (data: Record<string, unknown>) => {
    if (!data) return;

    for (const field of fields) {
      if (data[field] && typeof data[field] === 'string') {
        // Evitar dupla criptografia
        if (!encryption.isEncrypted(data[field] as string)) {
          data[field] = encryption.encrypt(data[field] as string, tenantId);
        }
      }
    }
  };

  switch (action) {
    case 'create':
      processData(params.args?.data);
      break;

    case 'update':
      processData(params.args?.data);
      break;

    case 'upsert':
      // Processar tanto create quanto update
      processData(params.args?.create);
      processData(params.args?.update);
      break;

    case 'createMany':
      // Processar array de dados
      if (Array.isArray(params.args?.data)) {
        params.args.data.forEach(processData);
      }
      break;

    case 'updateMany':
      processData(params.args?.data);
      break;
  }
}
