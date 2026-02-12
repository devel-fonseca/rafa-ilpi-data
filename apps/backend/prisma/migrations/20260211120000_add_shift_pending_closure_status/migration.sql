-- AlterEnum: Adicionar novos status ao ShiftStatus
-- PENDING_CLOSURE: Encerramento pendente (horário terminou, aguardando passagem)
-- ADMIN_CLOSED: Encerrado administrativamente (pelo RT)

ALTER TYPE "ShiftStatus" ADD VALUE IF NOT EXISTS 'PENDING_CLOSURE';
ALTER TYPE "ShiftStatus" ADD VALUE IF NOT EXISTS 'ADMIN_CLOSED';
