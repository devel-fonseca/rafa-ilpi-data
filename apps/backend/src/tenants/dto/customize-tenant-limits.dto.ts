import { IsInt, IsOptional, IsObject, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO para customizar limites e features de um tenant específico
 *
 * Usado por SuperAdmins para sobrescrever os limites do plano base em casos especiais:
 * - Retenção de clientes (oferecerfeatures adicionais para evitar cancelamento)
 * - Testes e validações (liberar temporariamente features premium)
 * - Negociações comerciais (ajustes finos antes de fechar contrato)
 *
 * @example
 * {
 *   "customMaxUsers": 10,           // Override: plano tinha 8, agora permite 10
 *   "customMaxResidents": 30,       // Override: plano tinha 20, agora permite 30
 *   "customFeatures": {
 *     "evolucoes_clinicas": true,   // Adiciona feature do plano superior
 *     "agenda": false               // Remove feature do plano atual
 *   }
 * }
 */
export class CustomizeTenantLimitsDto {
  @ApiPropertyOptional({
    description: 'Limite customizado de usuários (sobrescreve maxUsers do plano)',
    example: 10,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  customMaxUsers?: number | null;

  @ApiPropertyOptional({
    description: 'Limite customizado de residentes (sobrescreve maxResidents do plano)',
    example: 30,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  customMaxResidents?: number | null;

  @ApiPropertyOptional({
    description:
      'Features customizadas (merge com features do plano). ' +
      'Chaves com true são adicionadas, false são removidas. ' +
      'Passar null remove todas as customizações.',
    example: {
      evolucoes_clinicas: true,
      agenda: false,
    },
  })
  @IsOptional()
  @IsObject()
  customFeatures?: Record<string, boolean> | null;
}
