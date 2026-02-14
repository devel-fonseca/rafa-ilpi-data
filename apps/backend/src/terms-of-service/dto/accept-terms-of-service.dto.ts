import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

/**
 * DTO para preparar o token de aceite do termo de uso
 * (usado no step 4 do registro, antes de criar o tenant)
 */
export class PrepareTermsAcceptanceDto {
  @ApiProperty({
    example: 'uuid-do-termo-de-uso',
    description: 'ID do termo de uso sendo aceito',
  })
  @IsUUID()
  @IsNotEmpty()
  termsId: string;

  @ApiProperty({
    example: 'uuid-do-plano',
    description:
      'ID do plano escolhido no onboarding. Vincula juridicamente o aceite ao plano selecionado.',
  })
  @IsUUID()
  @IsNotEmpty()
  planId: string;

  @ApiProperty({
    example: '192.168.1.1',
    description: 'Endereço IP do cliente',
  })
  @IsString()
  @IsNotEmpty()
  ipAddress: string;

  @ApiProperty({
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...',
    description: 'User Agent do navegador',
  })
  @IsString()
  @IsNotEmpty()
  userAgent: string;

  @ApiProperty({
    example: { tenant: { name: 'ILPI Exemplo' }, plan: { price: 299 } },
    description: 'Variáveis para substituição no template',
    required: false,
  })
  @IsOptional()
  variables?: Record<string, unknown>;
}

/**
 * DTO para renderizar termo de uso com variáveis
 */
export class RenderTermsOfServiceDto {
  @ApiProperty({
    example: 'uuid-do-termo-de-uso',
    description: 'ID do termo de uso a renderizar',
  })
  @IsUUID()
  @IsNotEmpty()
  termsId: string;

  @ApiProperty({
    example: { tenant: { name: 'ILPI Exemplo' }, plan: { price: 299 } },
    description: 'Variáveis para substituição no template',
    required: false,
  })
  @IsOptional()
  variables?: Record<string, unknown>;
}
