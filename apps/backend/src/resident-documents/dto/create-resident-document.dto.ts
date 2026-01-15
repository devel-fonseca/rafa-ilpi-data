import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateResidentDocumentDto {
  @ApiProperty({
    description: 'Tipo de documento',
    enum: [
      'CARTAO_CONVENIO',
      'COMPROVANTE_RESIDENCIA_RESIDENTE',
      'DOCUMENTOS_RESPONSAVEL_LEGAL',
      'COMPROVANTE_RESIDENCIA_RESPONSAVEL',
      'DOCUMENTOS_PESSOAIS',
      'LAUDO_MEDICO',
      'TERMO_ADMISSAO',
      'TERMO_CONSENTIMENTO_IMAGEM',
      'TERMO_CONSENTIMENTO_LGPD',
    ],
    example: 'CARTAO_CONVENIO',
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    description: 'Detalhes opcionais do documento (ex: nome do convênio, descrição)',
    example: 'Unimed - Plano Básico',
    required: false,
  })
  @IsOptional()
  @IsString()
  details?: string;
}
