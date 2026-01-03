import { PositionCode } from '@prisma/client'

/**
 * MATRIZ DE HABILITA��O PROFISSIONAL PARA EVOLU��ES CL�NICAS
 *
 * Define quais cargos (PositionCode) podem registrar evolu��es em cada �rea cl�nica.
 *
 * FUNDAMENTA��O LEGAL:
 * - CFM (Conselho Federal de Medicina): Medicina
 * - COFEN (Conselho Federal de Enfermagem): Enfermagem - ato privativo do Enfermeiro
 * - CFN (Conselho Federal de Nutricionistas): Nutri��o
 * - CREFITO (Conselho Regional de Fisioterapia e Terapia Ocupacional): Fisioterapia e Terapia Ocupacional
 * - CFP (Conselho Federal de Psicologia): Psicologia
 * - CFSS (Conselho Federal de Servi�o Social): Servi�o Social
 * - CFFa (Conselho Federal de Fonoaudiologia): Fonoaudiologia
 *
 * REGRAS IMPORTANTES:
 * 1. Cargo gerencial N�O cria compet�ncia cl�nica
 * 2. T�cnicos e Auxiliares de Enfermagem N�O podem registrar Enfermagem (ato privativo do Enfermeiro)
 * 3. Somente o profissional habilitado pode registrar evolu��o da sua �rea
 * 4. Administradores e cargos administrativos N�O podem registrar evolu��es cl�nicas
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
 * Mapeamento: ClinicalProfession � PositionCodes habilitados
 *
 * Cada profiss�o cl�nica lista os cargos que podem criar/editar evolu��es naquela �rea.
 */
export const PROFESSION_AUTHORIZATION: Record<
  ClinicalProfession,
  PositionCode[]
> = {
  /**
   * MEDICINA
   * Habilitados: M�dico
   * Fundamenta��o: Lei n� 12.842/2013 - Ato privativo do m�dico
   */
  [ClinicalProfession.MEDICINE]: [
    PositionCode.DOCTOR,
    PositionCode.TECHNICAL_MANAGER,
  ],

  /**
   * ENFERMAGEM
   * Habilitados: Enfermeiro
   * Fundamenta��o: Lei n� 7.498/1986, Decreto 94.406/1987
   * - Diagn�stico de enfermagem: ato privativo do Enfermeiro (COFEN)
   * - Plano de cuidados: ato privativo do Enfermeiro (COFEN)
   *
   * IMPORTANTE: T�cnicos e Auxiliares N�O podem registrar evolu��o cl�nica
   */
  [ClinicalProfession.NURSING]: [
    PositionCode.NURSE,
    PositionCode.NURSING_COORDINATOR,
    PositionCode.TECHNICAL_MANAGER,
  ],

  /**
   * NUTRI��O
   * Habilitados: Nutricionista
   * Fundamenta��o: Lei n� 8.234/1991 - Ato privativo do nutricionista
   */
  [ClinicalProfession.NUTRITION]: [
    PositionCode.NUTRITIONIST,
    PositionCode.TECHNICAL_MANAGER,
  ],

  /**
   * FISIOTERAPIA
   * Habilitados: Fisioterapeuta
   * Fundamenta��o: Decreto-Lei n� 938/1969, Lei n� 6.316/1975
   */
  [ClinicalProfession.PHYSIOTHERAPY]: [
    PositionCode.PHYSIOTHERAPIST,
    PositionCode.TECHNICAL_MANAGER,
  ],

  /**
   * PSICOLOGIA
   * Habilitados: Psic�logo
   * Fundamenta��o: Lei n� 4.119/1962 - Ato privativo do psic�logo
   */
  [ClinicalProfession.PSYCHOLOGY]: [
    PositionCode.PSYCHOLOGIST,
    PositionCode.TECHNICAL_MANAGER,
  ],

  /**
   * SERVI�O SOCIAL
   * Habilitados: Assistente Social
   * Fundamenta��o: Lei n� 8.662/1993 - Ato privativo do assistente social
   */
  [ClinicalProfession.SOCIAL_WORK]: [
    PositionCode.SOCIAL_WORKER,
    PositionCode.TECHNICAL_MANAGER,
  ],

  /**
   * FONOAUDIOLOGIA
   * Habilitados: Fonoaudi�logo
   * Fundamenta��o: Lei n� 6.965/1981 - Ato privativo do fonoaudi�logo
   */
  [ClinicalProfession.SPEECH_THERAPY]: [
    PositionCode.SPEECH_THERAPIST,
    PositionCode.TECHNICAL_MANAGER,
  ],

  /**
   * TERAPIA OCUPACIONAL
   * Habilitados: Terapeuta Ocupacional
   * Fundamenta��o: Decreto-Lei n� 938/1969, Lei n� 6.316/1975
   */
  [ClinicalProfession.OCCUPATIONAL_THERAPY]: [
    PositionCode.OCCUPATIONAL_THERAPIST,
    PositionCode.TECHNICAL_MANAGER,
  ],
}

/**
 * Verifica se um cargo (PositionCode) est� habilitado para registrar uma determinada profiss�o cl�nica
 *
 * @param positionCode - Cargo do usu�rio
 * @param profession - Profiss�o cl�nica que deseja registrar
 * @returns true se habilitado, false caso contr�rio
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
 * Retorna lista de profiss�es cl�nicas que um cargo (PositionCode) pode registrar
 *
 * @param positionCode - Cargo do usu�rio
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
 * Mensagem de erro amig�vel quando usu�rio tenta registrar evolu��o n�o autorizada
 *
 * @param positionCode - Cargo do usu�rio
 * @param profession - Profiss�o cl�nica que tentou registrar
 * @returns Mensagem de erro personalizada
 */
export function getUnauthorizedMessage(
  positionCode: PositionCode,
  profession: ClinicalProfession,
): string {
  const professionLabels: Record<ClinicalProfession, string> = {
    [ClinicalProfession.MEDICINE]: 'Medicina',
    [ClinicalProfession.NURSING]: 'Enfermagem',
    [ClinicalProfession.NUTRITION]: 'Nutri��o',
    [ClinicalProfession.PHYSIOTHERAPY]: 'Fisioterapia',
    [ClinicalProfession.PSYCHOLOGY]: 'Psicologia',
    [ClinicalProfession.SOCIAL_WORK]: 'Servi�o Social',
    [ClinicalProfession.SPEECH_THERAPY]: 'Fonoaudiologia',
    [ClinicalProfession.OCCUPATIONAL_THERAPY]: 'Terapia Ocupacional',
  }

  const positionLabels: Record<PositionCode, string> = {
    [PositionCode.ADMINISTRATOR]: 'Administrador',
    [PositionCode.TECHNICAL_MANAGER]: 'Respons�vel T�cnico',
    [PositionCode.NURSING_COORDINATOR]: 'Coordenador de Enfermagem',
    [PositionCode.NURSE]: 'Enfermeiro',
    [PositionCode.NURSING_TECHNICIAN]: 'T�cnico de Enfermagem',
    [PositionCode.NURSING_ASSISTANT]: 'Auxiliar de Enfermagem',
    [PositionCode.DOCTOR]: 'M�dico',
    [PositionCode.PSYCHOLOGIST]: 'Psic�logo',
    [PositionCode.SOCIAL_WORKER]: 'Assistente Social',
    [PositionCode.PHYSIOTHERAPIST]: 'Fisioterapeuta',
    [PositionCode.NUTRITIONIST]: 'Nutricionista',
    [PositionCode.SPEECH_THERAPIST]: 'Fonoaudi�logo',
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

  return `Voc� n�o est� habilitado para registrar evolu��es de ${professionLabel}. Seu cargo: ${positionLabel}. Profissionais habilitados: ${authorizedLabels}.`
}
