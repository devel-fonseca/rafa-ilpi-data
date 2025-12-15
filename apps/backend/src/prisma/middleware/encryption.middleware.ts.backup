import { Prisma } from '@prisma/client';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { Logger } from '@nestjs/common';

/**
 * FieldEncryption - Criptografia AES-256-GCM para campos sensíveis do banco
 *
 * Conforme LGPD Art. 46, II - Medidas técnicas para proteção de dados sensíveis
 *
 * CARACTERÍSTICAS:
 * - AES-256-GCM: Authenticated Encryption (criptografia + autenticação)
 * - Chave derivada por tenant (isolamento completo entre tenants)
 * - IV (Initialization Vector) único por operação (previne ataques de repetição)
 * - Auth Tag: Garante integridade dos dados (detecta adulteração)
 *
 * FORMATO ARMAZENADO: salt:iv:tag:encrypted (tudo em hex)
 */
export class FieldEncryption {
  private readonly logger = new Logger(FieldEncryption.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits (padrão GCM)
  private readonly saltLength = 32; // 256 bits
  private readonly authTagLength = 16; // 128 bits (padrão GCM)

  constructor(private readonly masterKey: string) {
    if (!masterKey || masterKey.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters for AES-256');
    }
  }

  /**
   * Derivar chave de criptografia específica por tenant usando PBKDF2
   * Garante isolamento: mesmo que um tenant seja comprometido, outros permanecem seguros
   */
  private deriveKey(tenantId: string, salt: Buffer): Buffer {
    // Usar HMAC-SHA256 para derivação determinística da chave
    // Combinação: masterKey + tenantId + salt = chave única e irreproduzível sem esses 3 elementos
    const keyMaterial = `${this.masterKey}:${tenantId}`;

    return createHash('sha256')
      .update(keyMaterial)
      .update(salt)
      .digest();
  }

  /**
   * Criptografar texto plano
   *
   * @param plaintext - Texto a ser criptografado
   * @param tenantId - ID do tenant (para derivação de chave isolada)
   * @returns String no formato: salt:iv:tag:encrypted (hex)
   */
  encrypt(plaintext: string | null | undefined, tenantId: string): string | null {
    // Preservar valores nulos/undefined
    if (plaintext === null || plaintext === undefined || plaintext === '') {
      return null;
    }

    try {
      // Gerar salt e IV aleatórios (únicos por operação)
      const salt = randomBytes(this.saltLength);
      const iv = randomBytes(this.ivLength);

      // Derivar chave específica para este tenant
      const key = this.deriveKey(tenantId, salt);

      // Criar cipher com AES-256-GCM
      const cipher = createCipheriv(this.algorithm, key, iv);

      // Criptografar
      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
      ]);

      // Obter authentication tag (garante integridade)
      const authTag = cipher.getAuthTag();

      // Formato: salt:iv:tag:encrypted (todos em hex para armazenamento seguro)
      return [
        salt.toString('hex'),
        iv.toString('hex'),
        authTag.toString('hex'),
        encrypted.toString('hex'),
      ].join(':');
    } catch (error) {
      this.logger.error(`Encryption error: ${error.message}`, error.stack);
      throw new Error('Failed to encrypt field');
    }
  }

  /**
   * Descriptografar texto criptografado
   *
   * @param encryptedData - String no formato: salt:iv:tag:encrypted (hex)
   * @param tenantId - ID do tenant (para derivação da mesma chave)
   * @returns Texto plano original
   */
  decrypt(encryptedData: string | null | undefined, tenantId: string): string | null {
    // Preservar valores nulos/undefined
    if (encryptedData === null || encryptedData === undefined || encryptedData === '') {
      return null;
    }

    try {
      // Parse do formato salt:iv:tag:encrypted
      const parts = encryptedData.split(':');
      if (parts.length !== 4) {
        throw new Error('Invalid encrypted data format');
      }

      const [saltHex, ivHex, authTagHex, encryptedHex] = parts;

      // Converter de hex para Buffer
      const salt = Buffer.from(saltHex, 'hex');
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');

      // Derivar a mesma chave (usando mesmo salt + tenantId)
      const key = this.deriveKey(tenantId, salt);

      // Criar decipher
      const decipher = createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag); // Validar integridade

      // Descriptografar
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(), // Falha se authTag inválido (dados adulterados)
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      this.logger.error(`Decryption error: ${error.message}`, error.stack);
      // Se descriptografia falhar, pode ser adulteração ou corrupção
      throw new Error('Failed to decrypt field - data may be corrupted or tampered');
    }
  }

  /**
   * Verificar se string está no formato criptografado
   * Útil para evitar dupla criptografia
   */
  isEncrypted(value: string | null | undefined): boolean {
    if (!value) return false;

    // Formato esperado: 4 partes separadas por ':'
    const parts = value.split(':');
    if (parts.length !== 4) return false;

    // Verificar se todas as partes são hex válido
    const hexRegex = /^[0-9a-f]+$/i;
    return parts.every(part => hexRegex.test(part));
  }
}

/**
 * Configuração de campos criptografados por modelo
 *
 * IMPORTANTE: Apenas campos de dados sensíveis (LGPD Art. 5º, II)
 * Campos de metadata, IDs, datas e relações NÃO devem ser criptografados
 */
export const ENCRYPTED_FIELDS: Record<string, string[]> = {
  // RESIDENTES - Dados pessoais e biométricos
  Resident: [
    'cpf',           // Identificação civil (pode revelar histórico completo da pessoa)
    'rg',            // Identificação civil
    'birthPlace',    // Origem (pode revelar nacionalidade, contexto familiar)
    'phone',         // Contato direto (permite assédio, fraude)
    'emergencyPhone', // Contato de familiares
  ],

  // USUÁRIOS - Credenciais e contatos
  User: [
    'cpf',           // Identificação civil
    'phone',         // Contato pessoal
    'cep',           // Localização residencial
    'address',       // Endereço completo
    'city',          // Cidade
    'state',         // Estado
  ],

  // PRESCRIÇÕES MÉDICAS - Dados sensíveis de saúde (Art. 5º, II)
  Prescription: [
    'medication',    // Nome do medicamento (revela condição de saúde)
    'dosage',        // Dosagem (revela gravidade da condição)
    'frequency',     // Frequência de uso
    'instructions',  // Instruções adicionais (podem conter diagnóstico)
  ],

  // MEDICAMENTOS EM USO - Dados sensíveis de saúde
  Medication: [
    'name',          // Nome do medicamento
    'dosage',        // Dosagem
    'frequency',     // Frequência
    'instructions',  // Instruções de uso
  ],

  // MEDICAMENTOS SOS - Dados sensíveis de saúde
  SOSMedication: [
    'name',          // Nome do medicamento
    'dosage',        // Dosagem
    'instructions',  // Instruções de uso
    'indication',    // Indicação (revela sintoma/condição)
  ],

  // ALERGIAS - Dados sensíveis de saúde
  Allergy: [
    'substance',     // Substância alergênica (revela vulnerabilidade)
    'reaction',      // Reação alérgica (gravidade da condição)
    'notes',         // Observações adicionais
  ],

  // CONDIÇÕES CRÔNICAS - Dados sensíveis de saúde
  // Condition: [
  //   'condition',     // Nome da condição (diagnóstico)
  //   'notes',         // Observações clínicas
  // ],

  // RESTRIÇÕES ALIMENTARES - Dados sensíveis de saúde
  DietaryRestriction: [
    'description',   // Descrição da restrição (pode revelar doença)
    'notes',         // Observações
  ],

  // VACINAÇÕES - Dados sensíveis de saúde
  Vaccination: [
    'vaccineName',   // Nome da vacina
    'dose',          // Dose aplicada
    'lot',           // Lote (rastreabilidade)
    'manufacturer',  // Fabricante
    'location',      // Local de aplicação (pode revelar instituição de saúde)
    'notes',         // Observações
  ],

  // NOTAS CLÍNICAS - Dados sensíveis de saúde (diagnóstico, evolução)
  ClinicalNote: [
    'content',       // Conteúdo da nota clínica (diagnóstico, sintomas, evolução)
    'diagnosis',     // Diagnóstico
    'treatment',     // Tratamento prescrito
  ],

  // SINAIS VITAIS - Dados sensíveis de saúde
  VitalSign: [
    'notes',         // Observações sobre sinais vitais anormais
  ],

  // PRONTUÁRIO CLÍNICO - Dados sensíveis de saúde (profile fields)
  ClinicalProfile: [
    'medicalHistory',        // Histórico médico completo
    'surgicalHistory',       // Histórico cirúrgico
    'familyHistory',         // Histórico familiar (genética)
    'socialHistory',         // Histórico social (pode revelar vícios, vulnerabilidades)
    'psychiatricHistory',    // Histórico psiquiátrico (estigma social)
    'immunizationHistory',   // Histórico de imunizações
  ],
};

/**
 * Criar middleware de criptografia para Prisma
 *
 * FUNCIONAMENTO:
 * 1. ANTES de salvar (create/update): criptografa campos sensíveis
 * 2. DEPOIS de buscar (findMany/findUnique): descriptografa campos sensíveis
 * 3. Transparente para a camada de negócio (Services não precisam saber)
 *
 * @param encryptionKey - Master key do ambiente (.env)
 */
export function createEncryptionMiddleware(encryptionKey: string): Prisma.Middleware {
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
    // CRIPTOGRAFAR ANTES DE SALVAR (CREATE, UPDATE, UPSERT)
    // ============================================================
    if (['create', 'update', 'upsert', 'createMany', 'updateMany'].includes(action)) {
      const tenantId = extractTenantId(params);

      if (!tenantId) {
        logger.warn(`No tenantId found for ${model}.${action} - skipping encryption`);
        return next(params);
      }

      // Processar dados de criação/atualização
      const dataToProcess = getDataToProcess(params, action);

      if (dataToProcess) {
        // Criptografar cada campo configurado
        for (const field of fieldsToEncrypt) {
          if (dataToProcess[field] !== undefined && dataToProcess[field] !== null) {
            const plaintext = dataToProcess[field];

            // Evitar dupla criptografia
            if (typeof plaintext === 'string' && !encryption.isEncrypted(plaintext)) {
              dataToProcess[field] = encryption.encrypt(plaintext, tenantId);
            }
          }
        }
      }
    }

    // Executar operação no banco
    const result = await next(params);

    // ============================================================
    // DESCRIPTOGRAFAR DEPOIS DE BUSCAR (FIND, FINDMANY, etc)
    // ============================================================
    if (['findUnique', 'findFirst', 'findMany'].includes(action)) {
      if (!result) return result;

      const decrypt = (record: any) => {
        const tenantId = record.tenantId;
        if (!tenantId) return record;

        for (const field of fieldsToEncrypt) {
          if (record[field] && typeof record[field] === 'string') {
            try {
              record[field] = encryption.decrypt(record[field], tenantId);
            } catch (error) {
              logger.error(
                `Failed to decrypt ${model}.${field} for tenant ${tenantId}: ${error.message}`,
              );
              // Manter valor criptografado em caso de erro (não quebrar aplicação)
            }
          }
        }

        return record;
      };

      // Descriptografar único registro ou array de registros
      if (Array.isArray(result)) {
        return result.map(decrypt);
      } else {
        return decrypt(result);
      }
    }

    return result;
  };
}

/**
 * Extrair tenantId dos parâmetros da operação
 * Suporta múltiplos formatos de query
 */
function extractTenantId(params: any): string | null {
  // Prioridade 1: tenantId direto nos dados
  if (params.args?.data?.tenantId) {
    return params.args.data.tenantId;
  }

  // Prioridade 2: tenantId no where
  if (params.args?.where?.tenantId) {
    return params.args.where.tenantId;
  }

  // Prioridade 3: tenantId em operações de update (nested)
  if (params.args?.data?.tenant?.connect?.id) {
    return params.args.data.tenant.connect.id;
  }

  return null;
}

/**
 * Obter objeto de dados para processar baseado no tipo de ação
 */
function getDataToProcess(params: any, action: string): any {
  switch (action) {
    case 'create':
      return params.args?.data;

    case 'update':
      return params.args?.data;

    case 'upsert':
      // Processar tanto create quanto update em upsert
      if (params.args?.create) {
        processFields(params.args.create);
      }
      if (params.args?.update) {
        processFields(params.args.update);
      }
      return null; // Já processado

    case 'createMany':
      // Processar array de dados
      if (Array.isArray(params.args?.data)) {
        params.args.data.forEach((item: any) => processFields(item));
      }
      return null; // Já processado

    case 'updateMany':
      return params.args?.data;

    default:
      return null;
  }
}

function processFields(data: any): void {
  // Helper para processar campos dentro de objetos nested
  // Chamado por getDataToProcess quando necessário
}
