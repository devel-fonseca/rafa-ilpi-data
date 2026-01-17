import { Socket } from 'socket.io';

/**
 * Socket autenticado com dados do usuário injetados
 * Populado pelo WsAuthMiddleware após validação do JWT
 */
export interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    tenantId: string | null;
    userName: string;
    userRole: string;
    email: string;
  };
}
