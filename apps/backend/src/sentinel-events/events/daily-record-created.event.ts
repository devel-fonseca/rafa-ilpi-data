import { DailyRecord } from '@prisma/client';

/**
 * Evento disparado quando um Daily Record é criado
 * Permite que outros módulos reajam à criação sem acoplamento direto
 */
export class DailyRecordCreatedEvent {
  constructor(
    public readonly record: DailyRecord,
    public readonly tenantId: string,
    public readonly userId: string,
  ) {}
}
