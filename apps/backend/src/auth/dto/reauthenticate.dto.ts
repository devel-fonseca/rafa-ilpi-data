/**
 * DTO para reautenticação
 *
 * @module ReauthenticateDto
 */

import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para endpoint POST /auth/reauthenticate
 *
 * **Propósito:**
 * Validar senha do usuário logado para gerar token de reautenticação.
 * Usado antes de operações de alto risco (DELETE_*, EXPORT_*, etc.).
 *
 * **Fluxo:**
 * 1. Usuário tenta ação de alto risco (ex: DELETE_RESIDENT)
 * 2. Backend retorna 403 com { requiresReauth: true }
 * 3. Frontend abre modal pedindo senha
 * 4. POST /auth/reauthenticate { password: "senha" }
 * 5. Backend valida senha e retorna { reauthToken: "xxx", expiresIn: 300 }
 * 6. Frontend armazena token em memória (válido por 5min)
 * 7. Próximas requisições high-risk incluem header X-Reauth-Token
 *
 * @example
 * ```json
 * POST /auth/reauthenticate
 * Authorization: Bearer <access_token>
 * {
 *   "password": "senha_do_usuario"
 * }
 * ```
 */
export class ReauthenticateDto {
  @ApiProperty({
    description: 'Senha do usuário para reautenticação',
    example: 'Senha@123',
    minLength: 1,
  })
  @IsString({ message: 'A senha deve ser uma string' })
  @MinLength(1, { message: 'A senha não pode estar vazia' })
  password: string;
}
