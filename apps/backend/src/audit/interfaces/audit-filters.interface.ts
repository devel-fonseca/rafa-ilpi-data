export interface AuditLogFilters {
  page: number;
  limit: number;
  entityType?: string;
  userId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
}
