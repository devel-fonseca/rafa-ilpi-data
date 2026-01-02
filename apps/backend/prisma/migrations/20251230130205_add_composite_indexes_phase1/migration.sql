-- CreateIndex
CREATE INDEX "daily_records_tenantId_type_date_idx" ON "daily_records"("tenantId", "type", "date" DESC);

-- CreateIndex
CREATE INDEX "daily_records_residentId_type_date_idx" ON "daily_records"("residentId", "type", "date" DESC);

-- CreateIndex
CREATE INDEX "daily_records_tenantId_date_deletedAt_idx" ON "daily_records"("tenantId", "date", "deletedAt");

-- CreateIndex
CREATE INDEX "medication_administrations_tenantId_date_wasAdministered_idx" ON "medication_administrations"("tenantId", "date", "wasAdministered");

-- CreateIndex
CREATE INDEX "medication_administrations_residentId_date_wasAdministered_idx" ON "medication_administrations"("residentId", "date", "wasAdministered");

-- CreateIndex
CREATE INDEX "medications_prescriptionId_deletedAt_idx" ON "medications"("prescriptionId", "deletedAt");

-- CreateIndex
CREATE INDEX "medications_prescriptionId_startDate_endDate_idx" ON "medications"("prescriptionId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "notifications_userId_read_createdAt_idx" ON "notifications"("userId", "read", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notifications_tenantId_type_read_idx" ON "notifications"("tenantId", "type", "read");

-- CreateIndex
CREATE INDEX "notifications_entityType_entityId_idx" ON "notifications"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "prescriptions_tenantId_residentId_isActive_idx" ON "prescriptions"("tenantId", "residentId", "isActive");

-- CreateIndex
CREATE INDEX "prescriptions_tenantId_isActive_validUntil_idx" ON "prescriptions"("tenantId", "isActive", "validUntil");

-- CreateIndex
CREATE INDEX "resident_schedule_configs_residentId_recordType_isActive_idx" ON "resident_schedule_configs"("residentId", "recordType", "isActive");

-- CreateIndex
CREATE INDEX "resident_schedule_configs_tenantId_recordType_isActive_idx" ON "resident_schedule_configs"("tenantId", "recordType", "isActive");

-- CreateIndex
CREATE INDEX "resident_scheduled_events_tenantId_status_scheduledDate_idx" ON "resident_scheduled_events"("tenantId", "status", "scheduledDate");

-- CreateIndex
CREATE INDEX "resident_scheduled_events_residentId_status_scheduledDate_idx" ON "resident_scheduled_events"("residentId", "status", "scheduledDate");

-- CreateIndex
CREATE INDEX "resident_scheduled_events_tenantId_eventType_scheduledDate_idx" ON "resident_scheduled_events"("tenantId", "eventType", "scheduledDate");

-- CreateIndex
CREATE INDEX "system_alerts_tenantId_read_createdAt_idx" ON "system_alerts"("tenantId", "read", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "system_alerts_type_read_createdAt_idx" ON "system_alerts"("type", "read", "createdAt" DESC);
