import { PrismaClient, EmailTemplateCategory } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed centralizado para Templates de Email
 *
 * Este seed cria/atualiza TODOS os templates de email do sistema:
 * - 7 templates gerais (onboarding, billing, lifecycle, system)
 * - 1 template crítico (evento sentinela)
 *
 * Executar: npx tsx prisma/seed-template-emails.ts
 */

async function seedEmailTemplates() {
  console.log('\n🌱 SEED: Templates de Email\n');
  console.log('━'.repeat(60));
  console.log('\n📧 Criando/atualizando templates de email...\n');

  const templates = [
    // ════════════════════════════════════════════════════════════════
    // 1. TENANT ONBOARDING
    // ════════════════════════════════════════════════════════════════
    {
      key: 'tenant-onboarding',
      name: 'Boas-vindas ao Tenant',
      subject: '🎉 Bem-vindo ao Rafa ILPI, {{tenantName}}!',
      description: 'Email de boas-vindas enviado quando um novo tenant cria uma conta',
      category: EmailTemplateCategory.ONBOARDING,
      variables: [
        { name: 'tenantName', type: 'string', required: true, description: 'Nome da ILPI' },
        { name: 'adminName', type: 'string', required: true, description: 'Nome do administrador' },
        { name: 'adminEmail', type: 'string', required: true, description: 'Email do administrador' },
        { name: 'planName', type: 'string', required: true, description: 'Nome do plano contratado' },
        { name: 'trialEndsAt', type: 'date', required: false, description: 'Data de término do trial (se aplicável)' },
        { name: 'loginUrl', type: 'string', required: true, description: 'URL de acesso ao sistema' },
        { name: 'supportEmail', type: 'string', required: true, description: 'Email de suporte' },
      ],
      htmlContent: `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Bem-vindo</title>
</head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;padding:26px;">
          <tr>
            <td>
              <h2 style="margin:0 0 12px 0;">Conta criada com sucesso</h2>
              <p style="margin:0 0 12px 0;">Olá, <strong>{{adminName}}</strong>.</p>
              <p style="margin:0 0 12px 0;">A ILPI <strong>{{tenantName}}</strong> já pode usar o sistema.</p>
              <table width="100%" style="background:#f8fafc;border-radius:10px;padding:14px;margin:16px 0;">
                <tr><td style="padding:4px 0;"><strong>Administrador:</strong> {{adminName}}</td></tr>
                <tr><td style="padding:4px 0;"><strong>Email:</strong> {{adminEmail}}</td></tr>
                <tr><td style="padding:4px 0;"><strong>Plano:</strong> {{planName}}</td></tr>
              </table>
              <a href="{{loginUrl}}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">
                Acessar o sistema
              </a>
              <p style="margin:16px 0 0 0;font-size:12px;color:#6b7280;line-height:1.6;">
                Dica: compartilhe o acesso apenas com a equipe autorizada. O sistema registra eventos relevantes para rastreabilidade.
              </p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:18px 0;">
              <p style="margin:0;font-size:12px;color:#6b7280;">
                Suporte: <a href="mailto:{{supportEmail}}" style="color:#111827;text-decoration:underline;">{{supportEmail}}</a>
              </p>
              <p style="text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;">
                Rafa ILPI é desenvolvido por <a href="https://rafalabs.com.br" style="color:#2563eb;text-decoration:none;">Rafa Labs</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    },

    // ════════════════════════════════════════════════════════════════
    // 2. USER INVITE
    // ════════════════════════════════════════════════════════════════
    {
      key: 'user-invite',
      name: 'Convite de Usuário',
      subject: 'Acesso liberado ao sistema da {{tenantName}}',
      description: 'Email enviado quando um novo usuário é convidado para acessar o sistema',
      category: EmailTemplateCategory.ONBOARDING,
      variables: [
        { name: 'name', type: 'string', required: true, description: 'Nome do usuário' },
        { name: 'email', type: 'string', required: true, description: 'Email do usuário' },
        { name: 'temporaryPassword', type: 'string', required: true, description: 'Senha temporária' },
        { name: 'tenantName', type: 'string', required: true, description: 'Nome da ILPI' },
        { name: 'loginUrl', type: 'string', required: true, description: 'URL de login' },
      ],
      htmlContent: `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Acesso Liberado</title>
</head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;padding:26px;">
          <tr>
            <td>
              <h2 style="margin:0 0 12px 0;">Seu acesso foi liberado!</h2>
              <p style="margin:0 0 12px 0;">Olá, <strong>{{name}}</strong>.</p>
              <p style="margin:0 0 12px 0;">Você foi convidado para acessar o sistema da <strong>{{tenantName}}</strong>.</p>
              <table width="100%" style="background:#f8fafc;border-radius:10px;padding:14px;margin:16px 0;">
                <tr><td style="padding:4px 0;"><strong>Email:</strong> {{email}}</td></tr>
                <tr><td style="padding:4px 0;"><strong>Senha temporária:</strong> {{temporaryPassword}}</td></tr>
              </table>
              <p style="margin:0 0 12px 0;font-size:14px;color:#dc2626;">
                ⚠️ <strong>Importante:</strong> Troque sua senha no primeiro acesso.
              </p>
              <a href="{{loginUrl}}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">
                Fazer login
              </a>
              <p style="text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;">
                Rafa ILPI é desenvolvido por <a href="https://rafalabs.com.br" style="color:#2563eb;text-decoration:none;">Rafa Labs</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    },

    // ════════════════════════════════════════════════════════════════
    // 3. PASSWORD RESET
    // ════════════════════════════════════════════════════════════════
    {
      key: 'password-reset',
      name: 'Recuperação de Senha',
      subject: 'Recuperação de senha - {{tenantName}}',
      description: 'Email com link para redefinir senha',
      category: EmailTemplateCategory.SYSTEM,
      variables: [
        { name: 'name', type: 'string', required: true, description: 'Nome do usuário' },
        { name: 'resetUrl', type: 'string', required: true, description: 'URL de recuperação' },
        { name: 'expiresAt', type: 'string', required: true, description: 'Horário de expiração' },
        { name: 'tenantName', type: 'string', required: true, description: 'Nome da ILPI' },
      ],
      htmlContent: `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Recuperação de Senha</title>
</head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;padding:26px;">
          <tr>
            <td>
              <h2 style="margin:0 0 12px 0;">Recuperação de senha</h2>
              <p style="margin:0 0 12px 0;">Olá, <strong>{{name}}</strong>.</p>
              <p style="margin:0 0 12px 0;">Recebemos uma solicitação de recuperação de senha para sua conta na <strong>{{tenantName}}</strong>.</p>
              <a href="{{resetUrl}}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">
                Redefinir senha
              </a>
              <p style="margin:12px 0 0 0;font-size:14px;color:#6b7280;">
                Este link expira em <strong>{{expiresAt}}</strong>.
              </p>
              <p style="margin:12px 0 0 0;font-size:14px;color:#dc2626;">
                ⚠️ Se você não solicitou esta recuperação, ignore este email.
              </p>
              <p style="text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;">
                Rafa ILPI é desenvolvido por <a href="https://rafalabs.com.br" style="color:#2563eb;text-decoration:none;">Rafa Labs</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    },

    // ════════════════════════════════════════════════════════════════
    // 4. PAYMENT REMINDER
    // ════════════════════════════════════════════════════════════════
    {
      key: 'payment-reminder',
      name: 'Lembrete de Pagamento',
      subject: 'Lembrete: Fatura {{invoiceNumber}} vencida',
      description: 'Lembrete de pagamento atrasado',
      category: EmailTemplateCategory.BILLING,
      variables: [
        { name: 'tenantName', type: 'string', required: true, description: 'Nome da ILPI' },
        { name: 'invoiceNumber', type: 'string', required: true, description: 'Número da fatura' },
        { name: 'amount', type: 'string', required: true, description: 'Valor' },
        { name: 'dueDate', type: 'string', required: true, description: 'Data de vencimento' },
        { name: 'daysOverdue', type: 'number', required: true, description: 'Dias em atraso' },
      ],
      htmlContent: `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Lembrete de Pagamento</title>
</head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;padding:26px;">
          <tr>
            <td>
              <h2 style="margin:0 0 12px 0;color:#dc2626;">Fatura Vencida</h2>
              <p style="margin:0 0 12px 0;">Olá, <strong>{{tenantName}}</strong>.</p>
              <p style="margin:0 0 12px 0;">A fatura <strong>{{invoiceNumber}}</strong> está vencida há <strong>{{daysOverdue}} dias</strong>.</p>
              <table width="100%" style="background:#fef2f2;border-radius:10px;padding:14px;margin:16px 0;border:1px solid #fecaca;">
                <tr><td style="padding:4px 0;"><strong>Valor:</strong> {{amount}}</td></tr>
                <tr><td style="padding:4px 0;"><strong>Vencimento:</strong> {{dueDate}}</td></tr>
              </table>
              <p style="margin:12px 0 0 0;font-size:14px;color:#6b7280;">
                Por favor, regularize o pagamento para manter o acesso ao sistema.
              </p>
              <p style="text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;">
                Rafa ILPI é desenvolvido por <a href="https://rafalabs.com.br" style="color:#2563eb;text-decoration:none;">Rafa Labs</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    },

    // ════════════════════════════════════════════════════════════════
    // 5. OVERDUE REPORT
    // ════════════════════════════════════════════════════════════════
    {
      key: 'overdue-report',
      name: 'Relatório de Inadimplência',
      subject: 'Relatório {{period}} de Inadimplência',
      description: 'Relatório periódico de inadimplência para SuperAdmin',
      category: EmailTemplateCategory.BILLING,
      variables: [
        { name: 'period', type: 'string', required: true, description: 'Período (Mensal/Semanal)' },
        { name: 'startDate', type: 'string', required: true, description: 'Data inicial' },
        { name: 'endDate', type: 'string', required: true, description: 'Data final' },
        { name: 'totalOverdue', type: 'number', required: true, description: 'Total de inadimplentes' },
        { name: 'totalOverdueAmount', type: 'string', required: true, description: 'Valor total em atraso' },
        { name: 'tenants', type: 'array', required: true, description: 'Lista de tenants inadimplentes' },
      ],
      htmlContent: `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Relatório de Inadimplência</title>
</head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;padding:26px;">
          <tr>
            <td>
              <h2 style="margin:0 0 12px 0;">Relatório {{period}} de Inadimplência</h2>
              <p style="margin:0 0 12px 0;">Período: <strong>{{startDate}}</strong> a <strong>{{endDate}}</strong></p>
              <table width="100%" style="background:#fef2f2;border-radius:10px;padding:14px;margin:16px 0;">
                <tr><td style="padding:4px 0;"><strong>Total de inadimplentes:</strong> {{totalOverdue}}</td></tr>
                <tr><td style="padding:4px 0;"><strong>Valor total em atraso:</strong> {{totalOverdueAmount}}</td></tr>
              </table>
              <p style="margin:12px 0 0 0;font-size:14px;color:#6b7280;">
                Detalhes no dashboard de faturamento.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    },

    // ════════════════════════════════════════════════════════════════
    // 6. TRIAL EXPIRING
    // ════════════════════════════════════════════════════════════════
    {
      key: 'trial-expiring',
      name: 'Trial Expirando',
      subject: 'Seu período de teste expira em {{daysRemaining}} dia(s)',
      description: 'Alerta de trial próximo do fim',
      category: EmailTemplateCategory.LIFECYCLE,
      variables: [
        { name: 'tenantName', type: 'string', required: true, description: 'Nome da ILPI' },
        { name: 'planName', type: 'string', required: true, description: 'Nome do plano' },
        { name: 'expiresAt', type: 'string', required: true, description: 'Data de expiração' },
        { name: 'daysRemaining', type: 'number', required: true, description: 'Dias restantes' },
        { name: 'alertLevel', type: 'string', required: true, description: 'Nível de alerta (7d/3d/1d)' },
        { name: 'billingType', type: 'string', required: true, description: 'Tipo de cobrança' },
        { name: 'cancelUrl', type: 'string', required: false, description: 'URL para cancelar' },
      ],
      htmlContent: `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Trial Expirando</title>
</head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;padding:26px;">
          <tr>
            <td>
              <h2 style="margin:0 0 12px 0;color:#f59e0b;">Trial expirando em {{daysRemaining}} dia(s)</h2>
              <p style="margin:0 0 12px 0;">Olá, <strong>{{tenantName}}</strong>.</p>
              <p style="margin:0 0 12px 0;">Seu período de teste do plano <strong>{{planName}}</strong> expira em <strong>{{expiresAt}}</strong>.</p>
              <p style="margin:12px 0 0 0;font-size:14px;color:#6b7280;">
                Após o término, o acesso será mantido automaticamente conforme o plano contratado.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    },

    // ════════════════════════════════════════════════════════════════
    // 7. TRIAL CONVERTED
    // ════════════════════════════════════════════════════════════════
    {
      key: 'trial-converted',
      name: 'Trial Convertido para Ativo',
      subject: '🎉 Bem-vindo ao plano ativo!',
      description: 'Confirmação de conversão de trial para plano ativo',
      category: EmailTemplateCategory.LIFECYCLE,
      variables: [
        { name: 'tenantName', type: 'string', required: true, description: 'Nome da ILPI' },
        { name: 'planName', type: 'string', required: true, description: 'Nome do plano' },
        { name: 'invoiceAmount', type: 'string', required: true, description: 'Valor da primeira fatura' },
        { name: 'dueDate', type: 'string', required: true, description: 'Data de vencimento' },
        { name: 'paymentUrl', type: 'string', required: false, description: 'URL de pagamento' },
        { name: 'billingType', type: 'string', required: true, description: 'Tipo de cobrança' },
      ],
      htmlContent: `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Plano Ativo</title>
</head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;padding:26px;">
          <tr>
            <td>
              <h2 style="margin:0 0 12px 0;color:#10b981;">Plano ativo!</h2>
              <p style="margin:0 0 12px 0;">Olá, <strong>{{tenantName}}</strong>.</p>
              <p style="margin:0 0 12px 0;">Seu período de teste foi convertido para o plano <strong>{{planName}}</strong>.</p>
              <table width="100%" style="background:#f0fdf4;border-radius:10px;padding:14px;margin:16px 0;">
                <tr><td style="padding:4px 0;"><strong>Primeira fatura:</strong> {{invoiceAmount}}</td></tr>
                <tr><td style="padding:4px 0;"><strong>Vencimento:</strong> {{dueDate}}</td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    },

    // ════════════════════════════════════════════════════════════════
    // 8. SENTINEL EVENT ALERT (CRÍTICO)
    // ════════════════════════════════════════════════════════════════
    {
      key: 'sentinel-event-alert',
      name: 'Alerta de Evento Sentinela',
      subject: '🚨 EVENTO SENTINELA - Notificação Obrigatória',
      description: 'Template para notificação de Eventos Sentinela (quedas com lesão, tentativas de suicídio) conforme RDC 502/2021. Enviado automaticamente para o Responsável Técnico.',
      category: EmailTemplateCategory.INCIDENT,
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
      htmlContent: `<!doctype html>
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
</html>`,
    },
  ];

  // Processar cada template
  for (const template of templates) {
    const existing = await prisma.emailTemplate.findUnique({
      where: { key: template.key },
    });

    if (existing) {
      // Atualizar template existente (incrementa versão se conteúdo mudou)
      const contentChanged = JSON.stringify(existing.jsonContent) !== JSON.stringify({ content: template.htmlContent });

      await prisma.emailTemplate.update({
        where: { key: template.key },
        data: {
          name: template.name,
          subject: template.subject,
          description: template.description,
          category: template.category,
          jsonContent: { content: template.htmlContent },
          variables: template.variables,
          version: contentChanged ? existing.version + 1 : existing.version,
          updatedAt: new Date(),
        },
      });

      console.log(`   ✅ Template atualizado: ${template.name} (${contentChanged ? `versão ${existing.version + 1}` : `mantido v${existing.version}`})`);
    } else {
      // Criar novo template
      await prisma.emailTemplate.create({
        data: {
          key: template.key,
          name: template.name,
          subject: template.subject,
          description: template.description,
          category: template.category,
          jsonContent: { content: template.htmlContent },
          variables: template.variables,
          version: 1,
          isActive: true,
        },
      });

      console.log(`   ✅ Template criado: ${template.name} (versão 1)`);
    }
  }

  console.log('\n━'.repeat(60));
  console.log(`\n✅ SEED CONCLUÍDO!\n`);
  console.log(`📊 Total de templates processados: ${templates.length}\n`);
}

// Executar seed
seedEmailTemplates()
  .then(() => {
    console.log('✨ Seed finalizado com sucesso!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro no seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
