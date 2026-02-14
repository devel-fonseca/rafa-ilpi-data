/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ReauthenticationGuard
 *
 * Guard que exige reautenticação para permissões de alto risco.
 * Valida token de reautenticação no header X-Reauth-Token.
 *
 * @module ReauthenticationGuard
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

/**
 * Metadata key para marcar rotas que precisam de reautenticação
 */
export const REQUIRES_REAUTHENTICATION = 'requires_reauthentication';

/**
 * Interface do payload do token de reautenticação
 */
export interface ReauthTokenPayload {
  sub: string; // userId
  type: 'reauthentication';
  iat: number;
  exp: number;
}

/**
 * Guard que valida token de reautenticação para operações de alto risco
 *
 * **Funcionamento:**
 * 1. Verifica se a rota requer reautenticação via decorator @RequiresReauthentication()
 * 2. Se não requer, permite acesso
 * 3. Se requer, valida presença e validade do token no header X-Reauth-Token
 * 4. Verifica se o userId do token corresponde ao usuário logado
 * 5. Rejeita com 403 se token ausente/inválido
 *
 * **Headers esperados:**
 * - Authorization: Bearer <access_token> (autenticação normal)
 * - X-Reauth-Token: <reauth_token> (token de reautenticação)
 *
 * **Uso:**
 * ```typescript
 * @Delete(':id')
 * @RequiresReauthentication() // Decorator customizado
 * @UseGuards(JwtAuthGuard, PermissionsGuard, ReauthenticationGuard)
 * async deleteResident(@Param('id') id: string) {
 *   // Só executa se token de reautenticação válido
 * }
 * ```
 *
 * @example
 * // Fluxo completo:
 * // 1. Frontend tenta DELETE /residents/123
 * // 2. ReauthenticationGuard detecta permissão DELETE_RESIDENTS
 * // 3. Se X-Reauth-Token ausente → 403 Forbidden
 * // 4. Frontend abre modal de reautenticação
 * // 5. Usuário digita senha
 * // 6. POST /auth/reauthenticate retorna reauth_token
 * // 7. Frontend retenta DELETE com header X-Reauth-Token
 * // 8. ReauthenticationGuard valida e permite execução
 */
@Injectable()
export class ReauthenticationGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Verifica se a rota requer reautenticação
    const requiresReauth = this.reflector.getAllAndOverride<boolean>(
      REQUIRES_REAUTHENTICATION,
      [context.getHandler(), context.getClass()],
    );

    // Se não requer, permite acesso
    if (!requiresReauth) {
      return true;
    }

    // 2. Obtém request e usuário logado
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new UnauthorizedException(
        'Usuário não autenticado. Faça login primeiro.',
      );
    }

    // 3. Extrai token de reautenticação do header
    const reauthToken = this.extractReauthToken(request);

    if (!reauthToken) {
      throw new ForbiddenException({
        message:
          'Esta ação requer reautenticação. Por favor, confirme sua senha.',
        code: 'REAUTHENTICATION_REQUIRED',
        requiresReauth: true,
      });
    }

    // 4. Valida token de reautenticação
    try {
      const payload = await this.jwtService.verifyAsync<ReauthTokenPayload>(
        reauthToken,
        {
          secret: process.env.JWT_SECRET,
        },
      );

      // 5. Verifica tipo do token
      if (payload.type !== 'reauthentication') {
        throw new ForbiddenException({
          message: 'Token de reautenticação inválido.',
          code: 'INVALID_REAUTH_TOKEN',
        });
      }

      // 6. Verifica se o token pertence ao usuário logado
      if (payload.sub !== user.id) {
        throw new ForbiddenException({
          message:
            'Token de reautenticação não corresponde ao usuário logado.',
          code: 'REAUTH_TOKEN_MISMATCH',
        });
      }

      // 7. Token válido - permite execução
      return true;
    } catch (error) {
      // Token expirado ou inválido
      if (error instanceof ForbiddenException) {
        throw error;
      }

      throw new ForbiddenException({
        message:
          'Token de reautenticação expirado ou inválido. Por favor, reautentique.',
        code: 'REAUTH_TOKEN_EXPIRED',
        requiresReauth: true,
      });
    }
  }

  /**
   * Extrai token de reautenticação do header X-Reauth-Token
   */
  private extractReauthToken(request: any): string | undefined {
    const reauthToken = request.headers['x-reauth-token'];
    return reauthToken;
  }
}
