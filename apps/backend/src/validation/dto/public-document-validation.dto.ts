/**
 * DTO para resposta de validação pública de documentos
 */

export interface PublicDocumentValidationDto {
  /** Status de validação */
  valid: boolean;

  /** Tipo do documento */
  documentType: 'vaccination' | 'contract' | 'institutional_document' | 'resident_document' | 'prescription' | 'unknown';

  /** Informações do documento (sem dados pessoais sensíveis) */
  documentInfo: {
    /** Data de upload/processamento */
    processedAt: string;

    /** Nome do validador (usuário que carimbou) */
    validatedBy: string;

    /** Papel/função do validador */
    validatorRole: string;

    /** Registro profissional (opcional) */
    professionalRegistry?: string;

    /** Nome da ILPI/Instituição */
    institutionName: string;

    /** CNPJ da instituição */
    institutionCnpj: string;

    /** Hash SHA-256 do arquivo original */
    hashOriginal: string;

    /** Hash SHA-256 do arquivo processado */
    hashFinal: string;

    /** Metadados adicionais (JSON) */
    metadata?: Record<string, unknown>;
  };

  /** Token público de validação */
  publicToken: string;

  /** Timestamp da consulta */
  consultedAt: string;
}
