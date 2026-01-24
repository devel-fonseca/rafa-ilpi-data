/**
 * Metadados para geração do carimbo institucional no PDF
 */
export interface StampMetadata {
  tenantName: string;
  tenantCnpj: string;
  tenantId: string;
  userName: string;
  userRole: string;
  userProfessionalRegistry?: string; // Ex: COREN/SP 123456
  uploadDate: Date;
  hashOriginal: string;
  hashFinal?: string; // Preenchido após gerar PDF final
  publicToken: string; // Token público para validação (não expõe ID interno)

  // Campos opcionais para documentos de residentes
  residentName?: string;
  residentCpf?: string;
}

/**
 * Dados de um assinante do contrato
 */
export interface SignatoryData {
  name: string;
  cpf?: string;
  role: 'RESIDENTE' | 'RESPONSAVEL_LEGAL' | 'TESTEMUNHA' | 'ILPI';
}

/**
 * Resultado do processamento de arquivo (imagem ou PDF)
 */
export interface ProcessedFileResult {
  pdfBuffer: Buffer;
  hashOriginal: string;
  hashFinal: string;
}
