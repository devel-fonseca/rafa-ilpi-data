-- Fix defensivo: garantir valor RESCINDIDO no enum ContractDocumentStatus
-- em qualquer schema alvo (public ou tenant) onde a migration antiga possa ter
-- sido aplicada sem incluir o valor no enum local.
DO $$
DECLARE
  target_schema TEXT := current_schema();
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'ContractDocumentStatus'
      AND n.nspname = target_schema
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'ContractDocumentStatus'
      AND n.nspname = target_schema
      AND e.enumlabel = 'RESCINDIDO'
  ) THEN
    EXECUTE format(
      'ALTER TYPE %I.%I ADD VALUE %L',
      target_schema,
      'ContractDocumentStatus',
      'RESCINDIDO'
    );
  END IF;
END $$;
