-- AlterTable (aplicar em todos os schemas tenant)
DO $$
DECLARE
    schema_name TEXT;
BEGIN
    FOR schema_name IN
        SELECT nspname FROM pg_namespace WHERE nspname LIKE 'tenant_%'
    LOOP
        EXECUTE format('ALTER TABLE %I.bed_transfer_history ALTER COLUMN "fromBedId" DROP NOT NULL', schema_name);
    END LOOP;
END $$;
