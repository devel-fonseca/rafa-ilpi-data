-- Permitir alertas clínicos persistidos sem vínculo obrigatório com sinal vital
ALTER TABLE "vital_sign_alerts"
  ALTER COLUMN "vitalSignId" DROP NOT NULL;

-- Estender enum para alertas clínicos não-vitais (ex.: episódio diarreico em monitoramento)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'DIARRHEA_EPISODE_MONITORING'
      AND enumtypid = 'VitalSignAlertType'::regtype
  ) THEN
    ALTER TYPE "VitalSignAlertType" ADD VALUE 'DIARRHEA_EPISODE_MONITORING';
  END IF;
END
$$;
