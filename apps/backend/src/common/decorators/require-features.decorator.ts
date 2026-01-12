import { SetMetadata } from '@nestjs/common';

/**
 * Chave usada pelo Reflector para armazenar metadados de features requeridas
 */
export const REQUIRED_FEATURES_KEY = 'requiredFeatures';

/**
 * Decorator @RequireFeatures - Define quais features do plano são necessárias
 *
 * Este decorator é usado em conjunto com FeatureGuard para controlar acesso
 * a endpoints baseado nas features incluídas no plano do tenant.
 *
 * Features core (residentes, usuarios, prontuario) são sempre permitidas
 * e não precisam ser especificadas.
 *
 * Durante trial, todas as features são liberadas automaticamente.
 *
 * @param features - Array de chaves técnicas (snake_case) das features requeridas
 *
 * @example
 * // Requer apenas uma feature
 * @Get('messages')
 * @RequireFeatures('mensagens')
 * async getMessages() { ... }
 *
 * @example
 * // Requer múltiplas features
 * @Get('conformidade/eventos-sentinela')
 * @RequireFeatures('conformidade', 'eventos_sentinela')
 * async getSentinelEvents() { ... }
 *
 * @example
 * // Aplicar no controller inteiro (todas as rotas requerem a feature)
 * @Controller('messages')
 * @RequireFeatures('mensagens')
 * export class MessagesController { ... }
 */
export const RequireFeatures = (...features: string[]) =>
  SetMetadata(REQUIRED_FEATURES_KEY, features);
