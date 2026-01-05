-- AlterEnum: Adicionar novos tipos de notificação para eventos institucionais
ALTER TYPE "SystemNotificationType" ADD VALUE 'INSTITUTIONAL_EVENT_CREATED';
ALTER TYPE "SystemNotificationType" ADD VALUE 'INSTITUTIONAL_EVENT_UPDATED';
ALTER TYPE "SystemNotificationType" ADD VALUE 'INSTITUTIONAL_EVENT_DUE';

-- AlterEnum: Adicionar categoria de notificação para eventos institucionais
ALTER TYPE "NotificationCategory" ADD VALUE 'INSTITUTIONAL_EVENT';
