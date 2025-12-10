import { IsString, IsOptional, IsDateString, IsArray, MaxLength, IsNumber } from 'class-validator'

/**
 * DTO para criar documento a partir de arquivo já enviado
 * (usado quando o arquivo é enviado primeiro via /files/upload)
 */
export class CreateTenantDocumentWithUrlDto {
  // Tipo do documento
  @IsString()
  @MaxLength(100)
  type: string

  // Informações do arquivo já enviado
  @IsString()
  fileUrl: string

  @IsString()
  fileKey: string

  @IsString()
  fileName: string

  @IsNumber()
  fileSize: number

  @IsString()
  mimeType: string

  // Metadados opcionais
  @IsOptional()
  @IsDateString()
  issuedAt?: string

  @IsOptional()
  @IsDateString()
  expiresAt?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  documentNumber?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  issuerEntity?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]

  @IsOptional()
  @IsString()
  notes?: string
}
