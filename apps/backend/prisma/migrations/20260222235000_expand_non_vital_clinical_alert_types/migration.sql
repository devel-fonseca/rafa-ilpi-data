-- Expandir tipos de alerta clínico não-vital persistidos
DO $$
DECLARE
  target_schema TEXT := current_schema();
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'VitalSignAlertType'
      AND n.nspname = target_schema
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE e.enumlabel = 'DESNUTRITION_RISK_MONITORING'
      AND t.typname = 'VitalSignAlertType'
      AND n.nspname = target_schema
  ) THEN
    EXECUTE format(
      'ALTER TYPE %I.%I ADD VALUE %L',
      target_schema,
      'VitalSignAlertType',
      'DESNUTRITION_RISK_MONITORING'
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'VitalSignAlertType'
      AND n.nspname = target_schema
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE e.enumlabel = 'SKIN_LESION_MONITORING'
      AND t.typname = 'VitalSignAlertType'
      AND n.nspname = target_schema
  ) THEN
    EXECUTE format(
      'ALTER TYPE %I.%I ADD VALUE %L',
      target_schema,
      'VitalSignAlertType',
      'SKIN_LESION_MONITORING'
    );
  END IF;
END
$$;
