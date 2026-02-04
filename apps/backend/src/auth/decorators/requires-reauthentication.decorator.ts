/**
 * Decorator @RequiresReauthentication
 *
 * Marca rotas que exigem reautenticação antes de execução.
 * Usado em conjunto com ReauthenticationGuard.
 *
 * @module RequiresReauthentication
 */

import { SetMetadata } from '@nestjs/common';
import { REQUIRES_REAUTHENTICATION } from '../guards/reauthentication.guard';

/**
 * Decorator para marcar rotas que exigem reautenticação
 *
 * **Uso:**
 * ```typescript
 * @Delete(':id')
 * @RequiresReauthentication()
 * @UseGuards(JwtAuthGuard, PermissionsGuard, ReauthenticationGuard)
 * async deleteResident(@Param('id') id: string) {
 *   // Só executa se usuário reautenticou nos últimos 5 minutos
 * }
 * ```
 *
 * **Fluxo completo:**
 * 1. Frontend chama endpoint marcado com @RequiresReauthentication()
 * 2. ReauthenticationGuard detecta metadata e exige X-Reauth-Token
 * 3. Se ausente, retorna 403 com { requiresReauth: true }
 * 4. Frontend abre modal de reautenticação
 * 5. POST /auth/reauthenticate retorna reauth_token (validade: 5min)
 * 6. Frontend retenta request com header X-Reauth-Token
 * 7. ReauthenticationGuard valida e permite execução
 *
 * **Quando usar:**
 * - Endpoints que executam HIGH_RISK_PERMISSIONS
 * - DELETE_* endpoints (residentes, prescrições, etc.)
 * - EXPORT_DATA sensível
 * - MANAGE_PERMISSIONS e configurações críticas
 * - PUBLISH_POPS e ações regulatórias
 *
 * @example
 * // Exemplo 1: Exclusão de residente
 * @Delete(':id')
 * @RequiresReauthentication()
 * @RequirePermission(PermissionType.DELETE_RESIDENTS)
 * async deleteResident(@Param('id') id: string) {
 *   return this.residentsService.delete(id);
 * }
 *
 * @example
 * // Exemplo 2: Exportação de dados sensíveis
 * @Get('export')
 * @RequiresReauthentication()
 * @RequirePermission(PermissionType.EXPORT_DATA)
 * async exportData(@Query() filters: ExportFiltersDto) {
 *   return this.exportService.exportSensitiveData(filters);
 * }
 *
 * @example
 * // Exemplo 3: Publicação de POP
 * @Patch(':id/publish')
 * @RequiresReauthentication()
 * @RequirePermission(PermissionType.PUBLISH_POPS)
 * async publishPop(@Param('id') id: string) {
 *   return this.popsService.publish(id);
 * }
 */
export const RequiresReauthentication = () =>
  SetMetadata(REQUIRES_REAUTHENTICATION, true);
