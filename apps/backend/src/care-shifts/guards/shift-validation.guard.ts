/**
 * ShiftValidationGuard
 *
 * Guard para validar se o usuário pode criar registros diários baseado
 * em seu plantão ativo.
 *
 * Regras:
 * - Cargos com bypass (NURSE, NURSING_COORDINATOR, TECHNICAL_MANAGER): podem registrar sempre
 * - Cargos que precisam de plantão (CAREGIVER, NURSING_TECHNICIAN, NURSING_ASSISTANT):
 *   só podem registrar durante plantão IN_PROGRESS em que estão escalados
 * - Tolerância: 0 minutos antes do início, 30 minutos após o fim
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  Scope,
} from '@nestjs/common';
import { CareShiftsService } from '../care-shifts.service';

@Injectable({ scope: Scope.REQUEST })
export class ShiftValidationGuard implements CanActivate {
  private readonly logger = new Logger(ShiftValidationGuard.name);

  constructor(private readonly careShiftsService: CareShiftsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const body = request.body;

    if (!user) {
      this.logger.warn('ShiftValidationGuard chamado sem usuário autenticado');
      throw new ForbiddenException('Usuário não autenticado');
    }

    const userId = user.id || user.sub;

    const permissionContext =
      await this.careShiftsService.getRegistrationContext(userId, {
        date: body?.date,
        time: body?.time,
      });

    if (!permissionContext.canRegister) {
      this.logger.warn(
        `Usuário ${userId} bloqueado no guard de plantão: ${permissionContext.reason}`,
      );
      throw new ForbiddenException(
        permissionContext.reason ||
          'Você não está autorizado a registrar fora de um plantão ativo.',
      );
    }

    if (permissionContext.activeShift) {
      this.logger.debug(
        `Usuário ${userId} autorizado a registrar durante plantão ${permissionContext.activeShift.id}`,
      );
    }

    return true;
  }
}
