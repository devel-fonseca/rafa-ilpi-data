import { PositionCode } from '@prisma/client'

/**
 * MATRIZ DE HABILITAÇÃO PROFISSIONAL PARA EVOLUÇÕES CLÍNICAS
 *
 * Define quais cargos (PositionCode) podem registrar evoluções em cada área clínica.
 *
 * FUNDAMENTAÇÃO LEGAL:
 * - CFM (Conselho Federal de Medicina): Medicina
 * - COFEN (Conselho Federal de Enfermagem): Enfermagem - ato privativo do Enfermeiro
 * - CFN (Conselho Federal de Nutricionistas): Nutrição
 * - CREFITO (Conselho Regional de Fisioterapia e Terapia Ocupacional): Fisioterapia e Terapia Ocupacional
 * - CFP (Conselho Federal de Psicologia): Psicologia
 * - CFSS (Conselho Federal de Serviço Social): Serviço Social
 * - CFFa (Conselho Federal de Fonoaudiologia): Fonoaudiologia
 *
 * REGRAS IMPORTANTES:
 * 1. Cargo gerencial NÃO cria competência clínica
 * 2. Técnicos e Auxiliares de Enfermagem NÃO podem registrar Enfermagem (ato privativo do Enfermeiro)
 * 3. Somente o profissional habilitado pode registrar evolução da sua área
 * 4. Administradores e cargos administrativos NÃO podem registrar evoluções clínicas
 */

export enum ClinicalProfession {
  MEDICINE = 'MEDICINE',
  NURSING = 'NURSING',
  NUTRITION = 'NUTRITION',
  PHYSIOTHERAPY = 'PHYSIOTHERAPY',
  PSYCHOLOGY = 'PSYCHOLOGY',
  SOCIAL_WORK = 'SOCIAL_WORK',
  SPEECH_THERAPY = 'SPEECH_THERAPY',
  OCCUPATIONAL_THERAPY = 'OCCUPATIONAL_THERAPY',
}

/**
 * Mapeamento: ClinicalProfession ’ PositionCodes habilitados
 *
 * Cada profissão clínica lista os cargos que podem criar/editar evoluções naquela área.
 */
export const PROFESSION_AUTHORIZATION: Record<
  ClinicalProfession,
  PositionCode[]
> = {
  /**
   * MEDICINA
   * Habilitados: Médico
   * Fundamentação: Lei nº 12.842/2013 - Ato privativo do médico
   */
  [ClinicalProfession.MEDICINE]: [PositionCode.DOCTOR],

  /**
   * ENFERMAGEM
   * Habilitados: Enfermeiro
   * Fundamentação: Lei nº 7.498/1986, Decreto 94.406/1987
   * - Diagnóstico de enfermagem: ato privativo do Enfermeiro (COFEN)
   * - Plano de cuidados: ato privativo do Enfermeiro (COFEN)
   *
   * IMPORTANTE: Técnicos e Auxiliares NÃO podem registrar evolução clínica
   */
  [ClinicalProfession.NURSING]: [PositionCode.NURSE],

  /**
   * NUTRIÇÃO
   * Habilitados: Nutricionista
   * Fundamentação: Lei nº 8.234/1991 - Ato privativo do nutricionista
   */
  [ClinicalProfession.NUTRITION]: [PositionCode.NUTRITIONIST],

  /**
   * FISIOTERAPIA
   * Habilitados: Fisioterapeuta
   * Fundamentação: Decreto-Lei nº 938/1969, Lei nº 6.316/1975
   */
  [ClinicalProfession.PHYSIOTHERAPY]: [PositionCode.PHYSIOTHERAPIST],

  /**
   * PSICOLOGIA
   * Habilitados: Psicólogo
   * Fundamentação: Lei nº 4.119/1962 - Ato privativo do psicólogo
   */
  [ClinicalProfession.PSYCHOLOGY]: [PositionCode.PSYCHOLOGIST],

  /**
   * SERVIÇO SOCIAL
   * Habilitados: Assistente Social
   * Fundamentação: Lei nº 8.662/1993 - Ato privativo do assistente social
   */
  [ClinicalProfession.SOCIAL_WORK]: [PositionCode.SOCIAL_WORKER],

  /**
   * FONOAUDIOLOGIA
   * Habilitados: Fonoaudiólogo
   * Fundamentação: Lei nº 6.965/1981 - Ato privativo do fonoaudiólogo
   */
  [ClinicalProfession.SPEECH_THERAPY]: [PositionCode.SPEECH_THERAPIST],

  /**
   * TERAPIA OCUPACIONAL
   * Habilitados: Terapeuta Ocupacional
   * Fundamentação: Decreto-Lei nº 938/1969, Lei nº 6.316/1975
   */
  [ClinicalProfession.OCCUPATIONAL_THERAPY]: [
    PositionCode.OCCUPATIONAL_THERAPIST,
  ],
}

/**
 * Verifica se um cargo (PositionCode) está habilitado para registrar uma determinada profissão clínica
 *
 * @param positionCode - Cargo do usuário
 * @param profession - Profissão clínica que deseja registrar
 * @returns true se habilitado, false caso contrário
 *
 * @example
 * isAuthorizedForProfession(PositionCode.DOCTOR, ClinicalProfession.MEDICINE) // true
 * isAuthorizedForProfession(PositionCode.NURSE, ClinicalProfession.MEDICINE) // false
 * isAuthorizedForProfession(PositionCode.NURSING_TECHNICIAN, ClinicalProfession.NURSING) // false
 * isAuthorizedForProfession(PositionCode.ADMINISTRATOR, ClinicalProfession.MEDICINE) // false
 */
export function isAuthorizedForProfession(
  positionCode: PositionCode,
  profession: ClinicalProfession,
): boolean {
  const authorizedPositions = PROFESSION_AUTHORIZATION[profession]
  return authorizedPositions.includes(positionCode)
}

/**
 * Retorna lista de profissões clínicas que um cargo (PositionCode) pode registrar
 *
 * @param positionCode - Cargo do usuário
 * @returns Array de ClinicalProfession habilitadas
 *
 * @example
 * getAuthorizedProfessions(PositionCode.DOCTOR) // [ClinicalProfession.MEDICINE]
 * getAuthorizedProfessions(PositionCode.NURSE) // [ClinicalProfession.NURSING]
 * getAuthorizedProfessions(PositionCode.ADMINISTRATOR) // []
 */
export function getAuthorizedProfessions(
  positionCode: PositionCode,
): ClinicalProfession[] {
  const authorizedProfessions: ClinicalProfession[] = []

  for (const [profession, authorizedPositions] of Object.entries(
    PROFESSION_AUTHORIZATION,
  )) {
    if (authorizedPositions.includes(positionCode)) {
      authorizedProfessions.push(profession as ClinicalProfession)
    }
  }

  return authorizedProfessions
}

/**
 * Mensagem de erro amigável quando usuário tenta registrar evolução não autorizada
 *
 * @param positionCode - Cargo do usuário
 * @param profession - Profissão clínica que tentou registrar
 * @returns Mensagem de erro personalizada
 */
export function getUnauthorizedMessage(
  positionCode: PositionCode,
  profession: ClinicalProfession,
): string {
  const professionLabels: Record<ClinicalProfession, string> = {
    [ClinicalProfession.MEDICINE]: 'Medicina',
    [ClinicalProfession.NURSING]: 'Enfermagem',
    [ClinicalProfession.NUTRITION]: 'Nutrição',
    [ClinicalProfession.PHYSIOTHERAPY]: 'Fisioterapia',
    [ClinicalProfession.PSYCHOLOGY]: 'Psicologia',
    [ClinicalProfession.SOCIAL_WORK]: 'Serviço Social',
    [ClinicalProfession.SPEECH_THERAPY]: 'Fonoaudiologia',
    [ClinicalProfession.OCCUPATIONAL_THERAPY]: 'Terapia Ocupacional',
  }

  const positionLabels: Record<PositionCode, string> = {
    [PositionCode.ADMINISTRATOR]: 'Administrador',
    [PositionCode.TECHNICAL_MANAGER]: 'Responsável Técnico',
    [PositionCode.NURSING_COORDINATOR]: 'Coordenador de Enfermagem',
    [PositionCode.NURSE]: 'Enfermeiro',
    [PositionCode.NURSING_TECHNICIAN]: 'Técnico de Enfermagem',
    [PositionCode.NURSING_ASSISTANT]: 'Auxiliar de Enfermagem',
    [PositionCode.DOCTOR]: 'Médico',
    [PositionCode.PSYCHOLOGIST]: 'Psicólogo',
    [PositionCode.SOCIAL_WORKER]: 'Assistente Social',
    [PositionCode.PHYSIOTHERAPIST]: 'Fisioterapeuta',
    [PositionCode.NUTRITIONIST]: 'Nutricionista',
    [PositionCode.SPEECH_THERAPIST]: 'Fonoaudiólogo',
    [PositionCode.OCCUPATIONAL_THERAPIST]: 'Terapeuta Ocupacional',
    [PositionCode.CAREGIVER]: 'Cuidador',
    [PositionCode.ADMINISTRATIVE]: 'Administrativo',
    [PositionCode.ADMINISTRATIVE_ASSISTANT]: 'Assistente Administrativo',
    [PositionCode.OTHER]: 'Outro',
  }

  const professionLabel = professionLabels[profession] || profession
  const positionLabel = positionLabels[positionCode] || positionCode

  const authorizedPositions = PROFESSION_AUTHORIZATION[profession]
  const authorizedLabels = authorizedPositions
    .map((pos) => positionLabels[pos])
    .join(', ')

  return `Você não está habilitado para registrar evoluções de ${professionLabel}. Seu cargo: ${positionLabel}. Profissionais habilitados: ${authorizedLabels}.`
}
