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
 * Documentos opcionais/adicionais (NÃO obrigatórios para compliance)
 * Úteis para fiscalizações, auditorias e gestão administrativa
 */
export const OPTIONAL_DOCUMENTS = [
  'CERT_CMI',                     // Certidão de Regularidade no Conselho Municipal do Idoso
  'REGIMENTO_INTERNO',            // Regimento Interno da ILPI
  'PLANO_CONTINGENCIA',           // Plano de Contingência de Emergências Sanitárias
  'CNAS_CEBAS',                   // Comprovante de inscrição no CNAS/CEBAS (quando houver)
  'RELATORIO_ANUAL',              // Relatório Anual de Atividades (alguns municípios exigem de fundações)
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
  CMI: 'Certidão de Matrícula do Imóvel / Contrato de Locação',
  DOC_REPRESENTANTE: 'Documentos do Representante Legal (RG/CPF)',
  CNPJ: 'Cadastro Nacional de Pessoa Jurídica',
  RT_INDICACAO: 'Indicação de Responsável Técnico',
  RT_DOCUMENTOS: 'Documentos do Responsável Técnico',
  ALVARA_USO: 'Alvará de Funcionamento/Uso',
  LIC_SANITARIA: 'Licença Sanitária (Vigilância Sanitária)',
  AVCB: 'Auto de Vistoria do Corpo de Bombeiros',

  // Documentos opcionais/adicionais
  CERT_CMI: 'Certidão de Regularidade no Conselho Municipal do Idoso',
  REGIMENTO_INTERNO: 'Regimento Interno da ILPI',
  PLANO_CONTINGENCIA: 'Plano de Contingência de Emergências Sanitárias',
  CNAS_CEBAS: 'Comprovante de Inscrição CNAS/CEBAS',
  RELATORIO_ANUAL: 'Relatório Anual de Atividades',
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
 * Retorna todos os tipos de documentos disponíveis (obrigatórios + opcionais)
 * @param legalNature - Natureza jurídica da ILPI
 * @returns Array com todos os tipos de documentos
 */
export function getAllDocumentTypes(legalNature: LegalNature | null | undefined): string[] {
  const required = getRequiredDocuments(legalNature)
  return [...required, ...OPTIONAL_DOCUMENTS]
}

/**
 * Retorna apenas os documentos opcionais
 * @returns Array com tipos de documentos opcionais
 */
export function getOptionalDocuments(): string[] {
  return OPTIONAL_DOCUMENTS
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

/**
 * Janelas de alerta configuráveis por tipo de documento (em dias antes do vencimento)
 *
 * Documentos críticos (CNPJ, Licenças, Alvarás): 5 alertas (90, 60, 30, 15, 7 dias)
 * Documentos importantes (Estatuto, Contrato): 4 alertas (60, 30, 15, 7 dias)
 * Documentos secundários: 3 alertas (30, 15, 7 dias)
 */
export const DOCUMENT_ALERT_WINDOWS: Record<string, number[]> = {
  // Documentos CRÍTICOS - Regulatórios (5 alertas)
  CNPJ: [90, 60, 30, 15, 7],
  LIC_SANITARIA: [90, 60, 30, 15, 7],        // Licença Sanitária
  ALVARA_USO: [90, 60, 30, 15, 7],           // Alvará de Uso/Funcionamento
  AVCB: [90, 60, 30, 15, 7],                 // Auto de Vistoria do Corpo de Bombeiros
  RT_INDICACAO: [90, 60, 30, 15, 7],         // Responsável Técnico
  RT_DOCUMENTOS: [90, 60, 30, 15, 7],        // Documentos do RT

  // Documentos IMPORTANTES - Constitutivos (4 alertas)
  ESTATUTO: [60, 30, 15, 7],                 // Estatuto Social
  ATA_DIRETORIA: [60, 30, 15, 7],            // Ata de Diretoria
  ESCRITURA: [60, 30, 15, 7],                // Escritura de Constituição
  CONTRATO_SOCIAL: [60, 30, 15, 7],          // Contrato Social
  DOC_ADMINISTRADORES: [60, 30, 15, 7],      // Documentos de Administradores
  MEI_REGISTRO: [60, 30, 15, 7],             // Registro MEI
  DOC_MEI: [60, 30, 15, 7],                  // Documentos do MEI

  // Documentos SECUNDÁRIOS - Complementares (3 alertas)
  CMI: [30, 15, 7],                          // Certidão de Matrícula de Imóvel
  DOC_REPRESENTANTE: [30, 15, 7],            // Documentos de Representante Legal
  CERT_CMI: [30, 15, 7],                     // Certidão CMI (Conselho Municipal do Idoso)
  REGIMENTO_INTERNO: [30, 15, 7],            // Regimento Interno
  PLANO_CONTINGENCIA: [30, 15, 7],           // Plano de Contingência
  CNAS_CEBAS: [30, 15, 7],                   // CNAS/CEBAS
  RELATORIO_ANUAL: [30, 15, 7],              // Relatório Anual
}

/**
 * Janela de alerta padrão para documentos não mapeados (30, 15, 7 dias)
 */
export const DEFAULT_ALERT_WINDOWS = [30, 15, 7]

/**
 * Retorna as janelas de alerta configuradas para um tipo de documento
 * @param documentType - Tipo do documento
 * @returns Array com os dias de antecedência para alertas (ordenado DESC)
 */
export function getDocumentAlertWindows(documentType: string): number[] {
  return DOCUMENT_ALERT_WINDOWS[documentType] || DEFAULT_ALERT_WINDOWS
}

/**
 * Verifica se um documento deve disparar alerta baseado nos dias restantes
 * @param documentType - Tipo do documento
 * @param daysUntilExpiration - Dias até o vencimento
 * @returns true se deve disparar alerta nesta janela
 */
export function shouldTriggerAlert(documentType: string, daysUntilExpiration: number): boolean {
  const alertWindows = getDocumentAlertWindows(documentType)

  // Alerta se os dias restantes correspondem exatamente a uma das janelas configuradas
  // Ou se está na margem de ±1 dia (para evitar perder alertas por diferença de horário)
  return alertWindows.some(window =>
    Math.abs(daysUntilExpiration - window) <= 1
  )
}
