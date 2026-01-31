import { Request } from 'express';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

/**
 * Request padrão do NestJS com usuário autenticado
 * Usado em todos os controllers protegidos com JwtAuthGuard
 */
export interface RequestWithUser extends Request {
  user: JwtPayload;
  requestId: string; // UUID único gerado pelo RequestIdMiddleware
}
