/**
 * Configuração de Requisitos de Documentos por Natureza Jurídica
 *
 * Define os tipos de documentos obrigatórios para cada tipo de ILPI
 * conforme legislação vigente (RDC 502/2021 ANVISA e legislação complementar)
 */

import { LegalNature } from '@prisma/client'

/**
 * Tipos de documentos específicos por natureza jurídica
 */
export const DOCUMENT_TYPES_BY_LEGAL_NATURE: Record<LegalNature, string[]> = {
  // Associação sem fins lucrativos
  ASSOCIACAO: [
    'ESTATUTO',                    // Estatuto social registrado
    'CMI',                         // Certidão de Matrícula de Imóvel
    'ATA_DIRETORIA',              // Ata de eleição da diretoria atual
    'DOC_REPRESENTANTE',          // RG/CPF do representante legal
  ],

  // Fundação privada
  FUNDACAO: [
    'ESCRITURA',                  // Escritura de constituição da fundação
    'CMI',                        // Certidão de Matrícula de Imóvel
    'DOC_REPRESENTANTE',          // RG/CPF do representante legal
  ],

  // Empresa privada
  EMPRESA_PRIVADA: [
    'CONTRATO_SOCIAL',            // Contrato social ou ato constitutivo
    'CMI',                        // Certidão de Matrícula de Imóvel
    'DOC_ADMINISTRADORES',        // RG/CPF dos sócios/administradores
  ],

  // Microempreendedor Individual
  MEI: [
    'MEI_REGISTRO',               // Certificado de registro MEI (CCMEI)
    'CMI',                        // Certidão de Matrícula de Imóvel
    'DOC_MEI',                    // RG/CPF do MEI
  ],
}

/**
 * Documentos regulatórios comuns a todas as naturezas jurídicas
 * (Exigidos pela ANVISA RDC 502/2021 e legislação sanitária)
 */
export const COMMON_REGULATORY_DOCUMENTS = [
  'CNPJ',                         // Cadastro Nacional de Pessoa Jurídica
  'RT_INDICACAO',                 // Indicação de Responsável Técnico
  'RT_DOCUMENTOS',                // Documentos do RT (diploma, registro profissional, CPF, RG)
  'ALVARA_USO',                   // Alvará de funcionamento/uso
  'LIC_SANITARIA',                // Licença sanitária da Vigilância Sanitária
  'AVCB',                         // Auto de Vistoria do Corpo de Bombeiros (AVCB ou CLCB)
]

/**
 * Descrições amigáveis para cada tipo de documento
 */
export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  // Documentos específicos - Associação
  ESTATUTO: 'Estatuto Social Registrado',
  ATA_DIRETORIA: 'Ata de Eleição da Diretoria',

  // Documentos específicos - Fundação
  ESCRITURA: 'Escritura de Constituição',

  // Documentos específicos - Empresa Privada
  CONTRATO_SOCIAL: 'Contrato Social / Ato Constitutivo',
  DOC_ADMINISTRADORES: 'Documentos dos Sócios/Administradores',

  // Documentos específicos - MEI
  MEI_REGISTRO: 'Certificado MEI (CCMEI)',
  DOC_MEI: 'Documentos do MEI (RG/CPF)',

  // Documentos comuns
  CMI: 'Certidão de Matrícula de Imóvel',
  DOC_REPRESENTANTE: 'Documentos do Representante Legal (RG/CPF)',
  CNPJ: 'Cadastro Nacional de Pessoa Jurídica',
  RT_INDICACAO: 'Indicação de Responsável Técnico',
  RT_DOCUMENTOS: 'Documentos do Responsável Técnico',
  ALVARA_USO: 'Alvará de Funcionamento/Uso',
  LIC_SANITARIA: 'Licença Sanitária (Vigilância Sanitária)',
  AVCB: 'Auto de Vistoria do Corpo de Bombeiros',
}

/**
 * Retorna todos os documentos obrigatórios para uma natureza jurídica
 * @param legalNature - Natureza jurídica da ILPI
 * @returns Array com tipos de documentos obrigatórios
 */
export function getRequiredDocuments(legalNature: LegalNature | null | undefined): string[] {
  if (!legalNature) {
    return COMMON_REGULATORY_DOCUMENTS
  }

  const specificDocuments = DOCUMENT_TYPES_BY_LEGAL_NATURE[legalNature] || []

  return [...specificDocuments, ...COMMON_REGULATORY_DOCUMENTS]
}

/**
 * Retorna o label amigável de um tipo de documento
 * @param documentType - Tipo do documento
 * @returns Label descritivo
 */
export function getDocumentLabel(documentType: string): string {
  return DOCUMENT_TYPE_LABELS[documentType] || documentType
}

/**
 * Verifica se um documento é obrigatório para a natureza jurídica
 * @param documentType - Tipo do documento
 * @param legalNature - Natureza jurídica
 * @returns true se for obrigatório
 */
export function isDocumentRequired(
  documentType: string,
  legalNature: LegalNature | null | undefined
): boolean {
  const required = getRequiredDocuments(legalNature)
  return required.includes(documentType)
}

/**
 * Tipos de arquivo permitidos para upload
 */
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]

/**
 * Tamanho máximo de arquivo (em bytes) - 10MB
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * Validação de formato de arquivo
 * @param mimeType - MIME type do arquivo
 * @returns true se for permitido
 */
export function isAllowedFileType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType)
}
