import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateTermsOfServiceDto {
  @ApiProperty({
    example: 'Termo de Aceite e Termos de Uso - Plataforma RAFA ILPI (Atualizado)',
    description: 'Título do termo de uso',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiProperty({
    example: '<h1>Termo de Aceite e Termos de Uso</h1><p>...</p>',
    description: 'Conteúdo do termo de uso em HTML ou Markdown',
    required: false,
  })
  @IsOptional()
  @IsString()
  content?: string;
}
