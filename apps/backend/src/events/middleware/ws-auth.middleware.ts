import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { AuthenticatedSocket } from '../types/authenticated-socket.type';

/**
 * Middleware de autenticação para WebSocket
 *
 * Valida JWT enviado no handshake e popula socket.data com informações do usuário
 * Se token inválido/ausente, desconecta o cliente
 */
@Injectable()
export class WsAuthMiddleware {
  private readonly logger = new Logger(WsAuthMiddleware.name);

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Middleware function para validar autenticação no handshake
   */
  use(socket: Socket, next: (err?: Error) => void) {
    try {
      // Extrair token do header de autorização ou query param
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
        socket.handshake.query?.token;

      if (!token) {
        this.logger.warn(`[WS] Connection rejected: No token provided`);
        return next(new UnauthorizedException('Token não fornecido'));
      }

      // Validar e decodificar JWT
      const payload = this.jwtService.verify(token);

      // Popular socket.data com informações do usuário
      (socket as AuthenticatedSocket).data = {
        userId: payload.sub,
        tenantId: payload.tenantId || null,
        userName: payload.name,
        userRole: payload.role,
        email: payload.email,
      };

      this.logger.log(
        `[WS] User authenticated: ${payload.name} (${payload.email}) - Tenant: ${payload.tenantId || 'SUPERADMIN'}`,
      );

      next();
    } catch (error) {
      this.logger.error(`[WS] Authentication failed: ${error.message}`);
      next(new UnauthorizedException('Token inválido ou expirado'));
    }
  }
}
