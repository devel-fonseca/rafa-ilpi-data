import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed para template de email de Evento Sentinela
 * Template MJML responsivo para alertas críticos conforme RDC 502/2021
 */
export async function seedSentinelEventAlertTemplate() {
  const key = 'sentinel-event-alert';

  // Verificar se já existe
  const existing = await prisma.emailTemplate.findUnique({
    where: { key },
  });

  if (existing) {
    console.log(`✓ Template ${key} já existe`);
    return;
  }

  const htmlContent = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>🚨 Evento Sentinela - Notificação Obrigatória</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:'Helvetica Neue',Arial,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;background:#F3F4F6;">
    <tr>
      <td align="center">
        <!-- Header Urgente -->
        <table width="640" cellpadding="0" cellspacing="0" style="background:#DC2626;border-radius:14px 14px 0 0;padding:20px;">
          <tr>
            <td align="center">
              <h1 style="margin:0;color:#FFFFFF;font-size:24px;font-weight:bold;">🚨 EVENTO SENTINELA</h1>
              <p style="margin:8px 0 0 0;color:#FEE2E2;font-size:14px;">Notificação Obrigatória - RDC 502/2021 Art. 55</p>
            </td>
          </tr>
        </table>

        <!-- Corpo Principal -->
        <table width="640" cellpadding="0" cellspacing="0" style="background:#FFFFFF;padding:40px 20px;">
          <tr>
            <td>
              <!-- Saudação -->
              <p style="margin:0 0 16px 0;font-size:16px;">Olá, <strong>{{rtName}}</strong></p>

              <!-- Alert Box -->
              <div style="background:#FEF2F2;border-left:4px solid #DC2626;padding:16px;margin:16px 0;border-radius:4px;">
                <p style="margin:0;color:#991B1B;font-weight:bold;">⚠️ ATENÇÃO URGENTE</p>
                <p style="margin:8px 0 0 0;color:#7C2D12;">
                  Foi registrado um <strong>Evento Sentinela</strong> que requer <strong>notificação imediata</strong> à Autoridade Sanitária Local conforme RDC 502/2021 Art. 55.
                </p>
              </div>

              <!-- Informações do Evento -->
              <h2 style="margin:24px 0 12px 0;font-size:18px;color:#111827;">Informações do Evento</h2>

              <table width="100%" style="border-collapse:collapse;margin:16px 0;">
                <tr>
                  <td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:bold;width:150px;color:#6B7280;">Instituição:</td>
                  <td style="padding:8px;border-bottom:1px solid #E5E7EB;">{{tenantName}}</td>
                </tr>
                <tr>
                  <td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:bold;color:#6B7280;">Residente:</td>
                  <td style="padding:8px;border-bottom:1px solid #E5E7EB;"><strong>{{residentName}}</strong></td>
                </tr>
                <tr>
                  <td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:bold;color:#6B7280;">Tipo de Evento:</td>
                  <td style="padding:8px;border-bottom:1px solid #E5E7EB;"><strong style="color:#DC2626;">{{eventType}}</strong></td>
                </tr>
                <tr>
                  <td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:bold;color:#6B7280;">Data:</td>
                  <td style="padding:8px;border-bottom:1px solid #E5E7EB;">{{date}}</td>
                </tr>
                <tr>
                  <td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:bold;color:#6B7280;">Horário:</td>
                  <td style="padding:8px;border-bottom:1px solid #E5E7EB;">{{time}}</td>
                </tr>
                <tr>
                  <td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:bold;color:#6B7280;">Registrado por:</td>
                  <td style="padding:8px;border-bottom:1px solid #E5E7EB;">{{recordedBy}}</td>
                </tr>
              </table>

              <!-- Descrição -->
              <h3 style="margin:24px 0 8px 0;font-size:16px;color:#111827;">Descrição</h3>
              <p style="margin:0;color:#4B5563;line-height:1.6;">{{description}}</p>

              <!-- Ação Tomada -->
              <h3 style="margin:24px 0 8px 0;font-size:16px;color:#111827;">Ação Tomada</h3>
              <p style="margin:0;color:#4B5563;line-height:1.6;">{{actionTaken}}</p>

              <!-- Ação Obrigatória -->
              <h2 style="margin:32px 0 12px 0;font-size:18px;color:#DC2626;">📋 Ação Obrigatória</h2>

              <div style="background:#FEF2F2;padding:16px;border-radius:8px;margin:16px 0;">
                <p style="margin:0;color:#7C2D12;line-height:1.6;">
                  <strong>Notificar a Vigilância Epidemiológica em até {{deadline}}</strong><br/><br/>
                  Conforme {{legalReference}}, Eventos Sentinela devem ser notificados imediatamente à autoridade sanitária local. O protocolo de notificação deve ser registrado no sistema.
                </p>
              </div>

              <!-- Botão de Ação -->
              <div style="text-align:center;margin:24px 0;">
                <a href="{{systemUrl}}" style="display:inline-block;background:#DC2626;color:#FFFFFF;padding:16px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">
                  Acessar Sistema e Registrar Protocolo
                </a>
              </div>

              <!-- Informações Legais -->
              <hr style="border:none;border-top:1px solid #E5E7EB;margin:32px 0 16px 0;">

              <p style="margin:0;font-size:12px;color:#6B7280;line-height:1.8;">
                <strong>Base Legal:</strong> {{legalReference}}<br/>
                <strong>ID de Rastreamento:</strong> {{trackingId}}<br/>
                <strong>Data/Hora do Alerta:</strong> {{alertTimestamp}}
              </p>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table width="640" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border-radius:0 0 14px 14px;padding:20px;">
          <tr>
            <td align="center">
              <p style="margin:0;font-size:12px;color:#6B7280;line-height:1.6;">
                Este é um email automático gerado pelo sistema Rafa ILPI<br/>
                <strong>Não responda</strong> a este email. Para suporte, entre em contato através do sistema.
              </p>
              <p style="margin:10px 0 0 0;font-size:11px;color:#9CA3AF;">
                © {{year}} Rafa Labs - Tecnologia para Instituições de Longa Permanência
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await prisma.emailTemplate.create({
    data: {
      key,
      name: 'Alerta de Evento Sentinela',
      subject: '🚨 EVENTO SENTINELA - Notificação Obrigatória',
      category: 'INCIDENT',
      description:
        'Template para notificação de Eventos Sentinela (quedas com lesão, tentativas de suicídio) conforme RDC 502/2021. Enviado automaticamente para o Responsável Técnico.',
      jsonContent: {
        content: htmlContent,
      },
      isActive: true,
      variables: [
        { name: 'rtName', type: 'string', required: true, description: 'Nome do Responsável Técnico' },
        { name: 'tenantName', type: 'string', required: true, description: 'Nome da ILPI' },
        { name: 'residentName', type: 'string', required: true, description: 'Nome do residente' },
        { name: 'eventType', type: 'string', required: true, description: 'Tipo de Evento Sentinela' },
        { name: 'date', type: 'string', required: true, description: 'Data do evento' },
        { name: 'time', type: 'string', required: true, description: 'Horário do evento' },
        { name: 'description', type: 'string', required: true, description: 'Descrição do evento' },
        { name: 'actionTaken', type: 'string', required: true, description: 'Ação tomada' },
        { name: 'recordedBy', type: 'string', required: true, description: 'Profissional que registrou' },
        { name: 'legalReference', type: 'string', required: true, description: 'Referência legal' },
        { name: 'deadline', type: 'string', required: true, description: 'Prazo para notificação' },
        { name: 'trackingId', type: 'string', required: true, description: 'ID de rastreamento' },
        { name: 'systemUrl', type: 'string', required: true, description: 'URL do sistema' },
        { name: 'alertTimestamp', type: 'string', required: true, description: 'Data/hora do alerta' },
        { name: 'year', type: 'string', required: true, description: 'Ano atual' },
      ],
    },
  });

  console.log(`✓ Template ${key} criado com sucesso`);
}

// Executar se for chamado diretamente
if (require.main === module) {
  seedSentinelEventAlertTemplate()
    .then(() => {
      console.log('Seed concluído');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erro no seed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
