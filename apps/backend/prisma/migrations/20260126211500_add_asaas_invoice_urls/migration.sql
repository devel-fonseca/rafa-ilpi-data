-- AlterTable: Adicionar campos de URLs do Asaas na tabela invoices
ALTER TABLE "public"."invoices"
  ADD COLUMN IF NOT EXISTS "asaas_invoice_url" TEXT,
  ADD COLUMN IF NOT EXISTS "asaas_bank_slip_url" TEXT;

-- Add comments for documentation
COMMENT ON COLUMN "public"."invoices"."asaas_invoice_url" IS 'URL para visualizar fatura no dashboard do Asaas';
COMMENT ON COLUMN "public"."invoices"."asaas_bank_slip_url" IS 'URL do boleto PDF gerado pelo Asaas';
