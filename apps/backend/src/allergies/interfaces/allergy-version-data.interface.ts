import { AllergySeverity } from '@prisma/client';

/**
 * Interface para dados versionados de alergia
 * Usada para armazenar snapshots do histórico de alterações
 */
export interface AllergyVersionData {
  substance: string;
  reaction: string;
  severity: AllergySeverity;
  notes: string | null;
  residentId: string;
  versionNumber: number;
  deletedAt?: Date | null;
}
