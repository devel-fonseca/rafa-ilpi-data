-- Add PIX payment fields to invoices table
-- These fields store PIX QR Code ID and copy-paste code from Asaas

ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "asaas_pix_qr_code_id" TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "asaas_pix_payload" TEXT;

-- Add comments for documentation
COMMENT ON COLUMN "invoices"."asaas_pix_qr_code_id" IS 'ID do QR Code PIX no Asaas para buscar imagem Base64';
COMMENT ON COLUMN "invoices"."asaas_pix_payload" IS 'Código PIX copia-e-cola (payload) para pagamento';
