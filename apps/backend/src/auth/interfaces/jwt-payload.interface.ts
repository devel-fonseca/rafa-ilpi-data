/**
 * Interface para o payload do JWT token
 * Representa o usuário autenticado retornado pela JwtStrategy
 */
export interface JwtPayload {
  /** ID do usuário (mesmo que sub) */
  id: string;

  /** Subject - ID do usuário no padrão JWT */
  sub: string;

  /** Email do usuário */
  email: string;

  /** Nome do usuário */
  name: string;

  /** Role do usuário (admin, user, superadmin) */
  role: string;

  /** ID do tenant (null para superadmin) */
  tenantId: string | null;

  /** Dados do tenant (opcional, pode estar no cache) */
  tenant?: {
    id: string;
    name: string;
    schemaName: string;
    isActive: boolean;
  } | null;
}
