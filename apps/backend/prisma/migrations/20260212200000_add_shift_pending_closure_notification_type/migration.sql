-- Adiciona tipo de notificação para plantão com encerramento pendente
ALTER TYPE "SystemNotificationType" ADD VALUE IF NOT EXISTS 'SHIFT_PENDING_CLOSURE';
