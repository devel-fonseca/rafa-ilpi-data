import { PrismaClient, EmailTemplateCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log('\n🌱 SEED: Criando templates de email padrão\n');
  console.log('━'.repeat(60));

  const templates = [
    // 1. TENANT ONBOARDING
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
      jsonContent: {
        content: `<!doctype html>
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

              <p style="margin:0 0 12px 0;">
                Olá, <strong>{{adminName}}</strong>.
              </p>

              <p style="margin:0 0 12px 0;">
                A ILPI <strong>{{tenantName}}</strong> já pode usar o sistema.
              </p>

              <table width="100%" style="background:#f8fafc;border-radius:10px;padding:14px;margin:16px 0;">
                <tr>
                  <td style="padding:4px 0;"><strong>Administrador:</strong> {{adminName}}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;"><strong>Email:</strong> {{adminEmail}}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;"><strong>Plano:</strong> {{planName}}</td>
                </tr>
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

              <p style="margin:10px 0 0 0;font-size:11px;color:#9ca3af;">
                Se você não reconhece esta criação de conta, avise o suporte imediatamente.
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
    },

    // 2. USER INVITE
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
      jsonContent: {
        content: `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Acesso liberado</title>
</head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;padding:26px;">
          <tr>
            <td>
              <h2 style="margin:0 0 12px 0;">Acesso liberado</h2>
              <p>Olá, <strong>{{name}}</strong>.</p>

              <p>
                Seu acesso ao sistema da ILPI <strong>{{tenantName}}</strong> foi criado.
              </p>

              <table width="100%" style="background:#f8fafc;border-radius:10px;padding:14px;margin:16px 0;">
                <tr><td><strong>Email:</strong> {{email}}</td></tr>
                <tr><td><strong>Senha temporária:</strong> {{temporaryPassword}}</td></tr>
              </table>

              <p>
                Por segurança, altere sua senha no primeiro acesso.
              </p>

              <a href="{{loginUrl}}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">
                Acessar o sistema
              </a>

              <p style="margin-top:18px;font-size:12px;color:#6b7280;">
                Se você não reconhece este convite, ignore este e-mail.
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
    },

    // 2. PAYMENT REMINDER
    {
      key: 'payment-reminder',
      name: 'Lembrete de Pagamento',
      subject: 'Lembrete: Fatura {{invoiceNumber}} vencida',
      description: 'Email enviado para lembrar sobre pagamentos vencidos',
      category: EmailTemplateCategory.BILLING,
      variables: [
        { name: 'tenantName', type: 'string', required: true, description: 'Nome da ILPI' },
        { name: 'invoiceNumber', type: 'string', required: true, description: 'Número da fatura' },
        { name: 'amount', type: 'number', required: true, description: 'Valor da fatura' },
        { name: 'dueDate', type: 'date', required: true, description: 'Data de vencimento' },
        { name: 'daysOverdue', type: 'number', required: true, description: 'Dias de atraso' },
      ],
      jsonContent: {
        content: `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Lembrete de pagamento</title>
</head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;padding:26px;">
          <tr>
            <td>
              <h2 style="margin:0 0 12px 0;">Pagamento pendente</h2>

              <p>
                Identificamos uma fatura vencida da ILPI <strong>{{tenantName}}</strong>.
              </p>

              <table width="100%" style="background:#fff7ed;border-radius:10px;padding:14px;margin:16px 0;">
                <tr><td><strong>Fatura:</strong> {{invoiceNumber}}</td></tr>
                <tr><td><strong>Valor:</strong> R$ {{amount}}</td></tr>
                <tr><td><strong>Vencimento:</strong> {{dueDate}}</td></tr>
                <tr><td><strong>Dias em atraso:</strong> {{daysOverdue}}</td></tr>
              </table>

              <p>
                Caso o pagamento já tenha sido realizado, desconsidere este aviso.
              </p>

              <p style="font-size:12px;color:#6b7280;">
                Este lembrete é enviado automaticamente conforme o status financeiro da conta.
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
    },

    // 3. OVERDUE REPORT
    {
      key: 'overdue-report',
      name: 'Relatório de Inadimplência',
      subject: 'Relatório {{period}} de Inadimplência',
      description: 'Relatório periódico (diário/semanal) de tenants inadimplentes enviado ao superadmin',
      category: EmailTemplateCategory.BILLING,
      variables: [
        { name: 'period', type: 'string', required: true, description: 'Período do relatório (Diário, Semanal)' },
        { name: 'startDate', type: 'date', required: true, description: 'Data inicial do período' },
        { name: 'endDate', type: 'date', required: true, description: 'Data final do período' },
        { name: 'totalOverdue', type: 'number', required: true, description: 'Total de inadimplentes' },
        { name: 'totalOverdueAmount', type: 'number', required: true, description: 'Valor total em atraso' },
        {
          name: 'tenants',
          type: 'array',
          required: true,
          description: 'Lista de tenants inadimplentes [{name, amount, daysOverdue}]',
        },
      ],
      jsonContent: {
        content: `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Relatório de Inadimplência</title>
</head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
    <tr>
      <td align="center">
        <table width="740" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;padding:26px;">
          <tr>
            <td>
              <h2>Relatório {{period}} de Inadimplência</h2>

              <p>
                Período: <strong>{{startDate}}</strong> a <strong>{{endDate}}</strong>
              </p>

              <p>
                <strong>Total de inadimplentes:</strong> {{totalOverdue}}<br>
                <strong>Valor total em atraso:</strong> R$ {{totalOverdueAmount}}
              </p>

              <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse;margin-top:16px;">
                <tr style="background:#f3f4f6;">
                  <th align="left">ILPI</th>
                  <th align="right">Valor</th>
                  <th align="right">Dias em atraso</th>
                </tr>

                {{#each tenants}}
                <tr>
                  <td>{{name}}</td>
                  <td align="right">R$ {{amount}}</td>
                  <td align="right">{{daysOverdue}}</td>
                </tr>
                {{/each}}
              </table>

              <p style="margin-top:16px;font-size:12px;color:#6b7280;">
                Relatório gerado automaticamente para uso interno (SuperAdmin).
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
    },

    // 4. TRIAL EXPIRING
    {
      key: 'trial-expiring',
      name: 'Trial Expirando',
      subject: 'Seu período de teste expira em {{daysRemaining}} dia(s)',
      description: 'Alertas enviados nos dias D-7, D-3 e D-1 antes do trial expirar',
      category: EmailTemplateCategory.LIFECYCLE,
      variables: [
        { name: 'tenantName', type: 'string', required: true, description: 'Nome da ILPI' },
        { name: 'planName', type: 'string', required: true, description: 'Nome do plano' },
        { name: 'expiresAt', type: 'date', required: true, description: 'Data de expiração' },
        { name: 'daysRemaining', type: 'number', required: true, description: 'Dias restantes (7, 3 ou 1)' },
        { name: 'alertLevel', type: 'string', required: true, description: 'Nível do alerta (info, warning, critical)' },
        { name: 'billingType', type: 'string', required: false, description: 'Método de pagamento preferido (BOLETO, CREDIT_CARD)' },
        { name: 'cancelUrl', type: 'string', required: false, description: 'URL para cancelar assinatura' },
      ],
      jsonContent: {
        content: `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Trial expirando</title>
</head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;padding:26px;">
          <tr>
            <td>
              <h2>Período de teste chegando ao fim</h2>

              <p>
                Olá, <strong>{{tenantName}}</strong>.
              </p>

              <p>
                Seu período de teste do plano <strong>{{planName}}</strong> expira em
                <strong>{{expiresAt}}</strong>.
              </p>

              <table width="100%" style="background:#f8fafc;border-radius:10px;padding:14px;margin:16px 0;">
                <tr><td><strong>Dias restantes:</strong> {{daysRemaining}}</td></tr>
                <tr><td><strong>Método de pagamento:</strong> {{billingType}}</td></tr>
                <tr><td><strong>Ativação automática:</strong> Sim</td></tr>
              </table>

              <p>
                Caso não deseje a ativação automática, você pode cancelar até a data final do trial.
              </p>

              <a href="{{cancelUrl}}" style="display:inline-block;background:#dc2626;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">
                Cancelar trial
              </a>

              <p style="margin-top:18px;font-size:12px;color:#6b7280;">
                Este aviso é enviado automaticamente para garantir transparência.
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
    },

    // 5. TRIAL CONVERTED
    {
      key: 'trial-converted',
      name: 'Trial Convertido para Ativo',
      subject: '🎉 Bem-vindo ao plano ativo!',
      description: 'Email enviado quando um trial é convertido para assinatura ativa',
      category: EmailTemplateCategory.LIFECYCLE,
      variables: [
        { name: 'tenantName', type: 'string', required: true, description: 'Nome da ILPI' },
        { name: 'planName', type: 'string', required: true, description: 'Nome do plano' },
        { name: 'invoiceAmount', type: 'number', required: true, description: 'Valor da primeira fatura' },
        { name: 'dueDate', type: 'date', required: true, description: 'Data de vencimento da fatura' },
        { name: 'paymentUrl', type: 'string', required: true, description: 'URL de pagamento' },
        { name: 'billingType', type: 'string', required: false, description: 'Método de pagamento (BOLETO, CREDIT_CARD)' },
      ],
      jsonContent: {
        content: `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Plano ativado</title>
</head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;padding:26px;">
          <tr>
            <td>
              <h2>Plano ativado com sucesso 🎉</h2>

              <p>
                Olá, <strong>{{tenantName}}</strong>.
              </p>

              <p>
                Seu plano <strong>{{planName}}</strong> foi ativado após o término do período de teste.
              </p>

              <table width="100%" style="background:#ecfeff;border-radius:10px;padding:14px;margin:16px 0;">
                <tr><td><strong>Valor da fatura:</strong> R$ {{invoiceAmount}}</td></tr>
                <tr><td><strong>Vencimento:</strong> {{dueDate}}</td></tr>
                <tr><td><strong>Método de pagamento:</strong> {{billingType}}</td></tr>
              </table>

              <a href="{{paymentUrl}}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">
                Ver cobrança / pagar
              </a>

              <p style="margin-top:18px;font-size:12px;color:#6b7280;">
                Obrigado por confiar no sistema. Em caso de dúvidas, nosso time está à disposição.
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
    },
  ];

  for (const template of templates) {
    console.log(`\n📝 Processando template: ${template.name} (${template.key})`);

    try {
      // Verificar se já existe
      const existing = await prisma.emailTemplate.findUnique({
        where: { key: template.key },
      });

      if (existing) {
        // Atualizar template existente com novo HTML
        await prisma.emailTemplate.update({
          where: { key: template.key },
          data: {
            jsonContent: template.jsonContent,
            subject: template.subject,
            description: template.description,
            name: template.name,
            category: template.category,
            variables: template.variables,
            version: existing.version + 1, // Incrementar versão
          },
        });
        console.log(`   ✅ Template atualizado (versão ${existing.version} → ${existing.version + 1})`);
      } else {
        // Criar template novo
        await prisma.emailTemplate.create({
          data: {
            key: template.key,
            name: template.name,
            subject: template.subject,
            description: template.description,
            category: template.category,
            jsonContent: template.jsonContent,
            variables: template.variables,
            version: 1,
            isActive: true,
          },
        });
        console.log(`   ✅ Template criado (versão 1)`);
      }
    } catch (error: any) {
      console.error(`   ❌ Erro ao processar template ${template.key}:`, error.message);
    }
  }

  console.log('\n' + '━'.repeat(60));
  console.log('\n✅ SEED CONCLUÍDO!\n');
  console.log(`📊 Total de templates: ${templates.length}`);
  console.log('');
}

seed()
  .catch((error) => {
    console.error('Erro ao executar seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
