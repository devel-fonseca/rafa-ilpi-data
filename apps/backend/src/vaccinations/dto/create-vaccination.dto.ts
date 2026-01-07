import { IsString, IsOptional, IsUUID, Matches, MaxLength } from 'class-validator'

/**
 * DTO para criação de registro de vacinação
 * Conformidade: RDC 502/2021 - Art. 39
 * 11 campos obrigatórios conforme especificação
 */
export class CreateVaccinationDto {
  /**
   * 1) Vacina/Profilaxia
   * Exemplos: COVID-19, Influenza, Hepatite B, Tétano, etc.
   */
  @IsString({ message: 'Vacina deve ser um texto' })
  @MaxLength(255, { message: 'Vacina não pode ter mais de 255 caracteres' })
  vaccine: string

  /**
   * 3) Dose
   * Exemplos: 1ª dose, 2ª dose, Reforço, Dose única
   */
  @IsString({ message: 'Dose deve ser um texto' })
  @MaxLength(100, { message: 'Dose não pode ter mais de 100 caracteres' })
  dose: string

  /**
   * 2) Data da vacinação
   * Formato: YYYY-MM-DD
   * Não pode ser no futuro
   */
  @IsString({ message: 'Data deve ser uma string no formato YYYY-MM-DD' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Data deve estar no formato YYYY-MM-DD',
  })
  date: string

  /**
   * 4) Lote do imunizante
   * Código alfanumérico do lote
   */
  @IsString({ message: 'Lote deve ser um texto' })
  @MaxLength(50, { message: 'Lote não pode ter mais de 50 caracteres' })
  batch: string

  /**
   * 5) Fabricante
   * Nome do laboratório/fabricante
   */
  @IsString({ message: 'Fabricante deve ser um texto' })
  @MaxLength(255, { message: 'Fabricante não pode ter mais de 255 caracteres' })
  manufacturer: string

  /**
   * 6) CNES (Código Nacional do Estabelecimento de Saúde)
   * 8-10 dígitos numéricos
   */
  @IsString({ message: 'CNES deve ser um texto' })
  @Matches(/^\d{8,10}$/, {
    message: 'CNES deve conter 8 a 10 dígitos numéricos',
  })
  cnes: string

  /**
   * 7) Estabelecimento de Saúde
   * Nome completo da unidade
   */
  @IsString({ message: 'Estabelecimento de Saúde deve ser um texto' })
  @MaxLength(255, { message: 'Estabelecimento de Saúde não pode ter mais de 255 caracteres' })
  healthUnit: string

  /**
   * 8) Município
   * Localidade de vacinação
   */
  @IsString({ message: 'Município deve ser um texto' })
  @MaxLength(100, { message: 'Município não pode ter mais de 100 caracteres' })
  municipality: string

  /**
   * 9) UF (Unidade Federativa)
   * 2 caracteres (ex: SP, RJ, MG)
   */
  @IsString({ message: 'UF deve ser um texto' })
  @Matches(/^[A-Z]{2}$/, {
    message: 'UF deve conter exatamente 2 caracteres maiúsculos',
  })
  state: string

  /**
   * 10) Comprovante (URL do arquivo)
   * Arquivo enviado via upload (campo opcional na criação, será preenchido após upload)
   */
  @IsOptional()
  @IsString({ message: 'URL do comprovante deve ser um texto' })
  @MaxLength(500, { message: 'URL do comprovante não pode ter mais de 500 caracteres' })
  certificateUrl?: string

  /**
   * 11) Observações
   * Anotações adicionais
   */
  @IsOptional()
  @IsString({ message: 'Observações deve ser um texto' })
  @MaxLength(1000, { message: 'Observações não pode ter mais de 1000 caracteres' })
  notes?: string

  /**
   * ID do residente (referência)
   */
  @IsUUID('4', { message: 'residentId deve ser um UUID válido' })
  residentId: string
}
