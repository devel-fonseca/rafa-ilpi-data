-- CreateIndex
CREATE INDEX "daily_records_date_deletedAt_time_idx" ON "daily_records"("date", "deletedAt", "time");

-- CreateIndex
CREATE INDEX "prescriptions_isActive_deletedAt_idx" ON "prescriptions"("isActive", "deletedAt");

-- CreateIndex
CREATE INDEX "medications_deletedAt_startDate_endDate_idx" ON "medications"("deletedAt", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "medication_administrations_date_scheduledTime_idx" ON "medication_administrations"("date", "scheduledTime");
