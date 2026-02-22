-- Expandir tipos de alerta clínico não-vital persistidos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'DESNUTRITION_RISK_MONITORING'
      AND enumtypid = 'VitalSignAlertType'::regtype
  ) THEN
    ALTER TYPE "VitalSignAlertType" ADD VALUE 'DESNUTRITION_RISK_MONITORING';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'SKIN_LESION_MONITORING'
      AND enumtypid = 'VitalSignAlertType'::regtype
  ) THEN
    ALTER TYPE "VitalSignAlertType" ADD VALUE 'SKIN_LESION_MONITORING';
  END IF;
END
$$;
