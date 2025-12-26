import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly emailFrom: string;
  private readonly emailFromName: string;
  private readonly emailReplyTo: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');

    if (!apiKey) {
      this.logger.warn(
        'RESEND_API_KEY não configurada - serviço de email desabilitado',
      );
      this.resend = null;
    } else {
      this.resend = new Resend(apiKey);
      this.logger.log('Resend Email Service inicializado com sucesso');
    }

    this.emailFrom =
      this.configService.get<string>('EMAIL_FROM') ||
      'Rafa ILPI <noreply@mail.rafalabs.com.br>';
    this.emailFromName =
      this.configService.get<string>('EMAIL_FROM_NAME') || 'Rafa ILPI';
    this.emailReplyTo =
      this.configService.get<string>('EMAIL_REPLY_TO') ||
      'suporte@rafalabs.com.br';
  }

  /**
   * Enviar email de convite para novo usuário
   */
  async sendUserInvite(
    to: string,
    userData: {
      name: string;
      email: string;
      temporaryPassword: string;
      tenantName: string;
    },
  ): Promise<boolean> {
    if (!this.resend) {
      this.logger.warn('Tentativa de envio de email sem API Key configurada');
      return false;
    }

    try {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';

      const htmlContent = this.getUserInviteTemplate(userData, frontendUrl);

      const { data, error } = await this.resend.emails.send({
        from: this.emailFrom,
        to: [to],
        subject: `Acesso liberado ao sistema da ${userData.tenantName}`,
        html: htmlContent,
        replyTo: this.emailReplyTo,
      });

      if (error) {
        this.logger.error(`Erro ao enviar email de convite: ${error.message}`, error);
        return false;
      }

      this.logger.log(`Email de convite enviado com sucesso para ${to} (ID: ${data.id})`);
      return true;
    } catch (error) {
      this.logger.error(`Erro inesperado ao enviar email: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Enviar email de lembrete de pagamento
   */
  async sendPaymentReminder(
    to: string,
    reminderData: {
      tenantName: string;
      invoiceNumber: string;
      amount: number;
      dueDate: Date;
      daysOverdue: number;
    },
  ): Promise<boolean> {
    if (!this.resend) {
      this.logger.warn('Tentativa de envio de email sem API Key configurada');
      return false;
    }

    try {
      const htmlContent = this.getPaymentReminderTemplate(reminderData);

      const { data, error } = await this.resend.emails.send({
        from: this.emailFrom,
        to: [to],
        subject: `⚠️ Lembrete: Fatura ${reminderData.invoiceNumber} vencida há ${reminderData.daysOverdue} ${reminderData.daysOverdue === 1 ? 'dia' : 'dias'}`,
        html: htmlContent,
        replyTo: this.emailReplyTo,
      });

      if (error) {
        this.logger.error(`Erro ao enviar lembrete de pagamento: ${error.message}`, error);
        return false;
      }

      this.logger.log(`Lembrete de pagamento enviado com sucesso para ${to} (ID: ${data.id})`);
      return true;
    } catch (error) {
      this.logger.error(`Erro inesperado ao enviar lembrete: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Enviar relatório de inadimplência para financeiro
   */
  async sendOverdueReport(
    reportData: {
      period: 'daily' | 'weekly';
      startDate: Date;
      endDate: Date;
      totalOverdue: number;
      totalOverdueAmount: number;
      tenants: Array<{
        name: string;
        email: string;
        overdueInvoices: number;
        totalAmount: number;
        maxDaysOverdue: number;
      }>;
    },
  ): Promise<boolean> {
    if (!this.resend) {
      this.logger.warn('Tentativa de envio de email sem API Key configurada');
      return false;
    }

    try {
      const htmlContent = this.getOverdueReportTemplate(reportData);
      const subjectPrefix = reportData.period === 'daily' ? '📊 Relatório Diário' : '📈 Relatório Semanal';

      const { data, error } = await this.resend.emails.send({
        from: this.emailFrom,
        to: ['financeiro@rafalabs.com.br'],
        subject: `${subjectPrefix} de Inadimplência - ${new Date().toLocaleDateString('pt-BR')}`,
        html: htmlContent,
        replyTo: this.emailReplyTo,
      });

      if (error) {
        this.logger.error(`Erro ao enviar relatório de inadimplência: ${error.message}`, error);
        return false;
      }

      this.logger.log(`Relatório de inadimplência ${reportData.period} enviado com sucesso (ID: ${data.id})`);
      return true;
    } catch (error) {
      this.logger.error(`Erro inesperado ao enviar relatório: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Template HTML para email de convite
   */
  private getUserInviteTemplate(
    userData: {
      name: string;
      email: string;
      temporaryPassword: string;
      tenantName: string;
    },
    loginUrl: string,
  ): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite - Rafa ILPI</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                Bem-vindo ao Rafa ILPI
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 20px;">
                Olá, ${userData.name}.
              </h2>

              <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Você recebeu acesso ao sistema da <strong>${userData.tenantName}</strong> na plataforma Rafa ILPI.
              </p>

              <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Para entrar, use as credenciais abaixo:
              </p>

              <!-- Credentials Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 6px; border: 1px solid #e5e7eb; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px; color: #6b7280; font-size: 14px; font-weight: 600; text-transform: uppercase;">
                      Suas credenciais de acesso
                    </p>
                    <p style="margin: 0 0 8px; color: #1f2937; font-size: 16px;">
                      <strong>Email:</strong> ${userData.email}
                    </p>
                    <p style="margin: 0; color: #1f2937; font-size: 16px;">
                      <strong>Senha temporária:</strong> <code style="background-color: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-family: 'Courier New', monospace;">${userData.temporaryPassword}</code>
                    </p>
                  </td>
                </tr>
              </table>

              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                  <strong>⚠️ Importante:</strong> Por segurança, ao realizar o primeiro acesso, altere a senha no painel do usuário.
                </p>
              </div>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${loginUrl}/login" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
                      Acessar o Sistema
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Se você tiver alguma dúvida, entre em contato com o suporte através do email
                <a href="mailto:${this.emailReplyTo}" style="color: #3b82f6; text-decoration: none;">${this.emailReplyTo}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">
                <strong>Rafa ILPI</strong> - Sistema de Gestão para ILPIs
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Rafa Labs Desenvolvimento e Tecnologia
              </p>
            </td>
          </tr>
        </table>

        <!-- Disclaimer -->
        <table width="600" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
          <tr>
            <td style="text-align: center; color: #9ca3af; font-size: 12px; line-height: 1.5;">
              <p style="margin: 0;">
                Este é um email automático, por favor não responda.<br>
                Se você recebeu este email por engano, pode ignorá-lo com segurança.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Template HTML para lembrete de pagamento
   */
  private getPaymentReminderTemplate(reminderData: {
    tenantName: string;
    invoiceNumber: string;
    amount: number;
    dueDate: Date;
    daysOverdue: number;
  }): string {
    const severity = reminderData.daysOverdue >= 30 ? 'critical' : reminderData.daysOverdue >= 7 ? 'warning' : 'info';
    const severityColor = severity === 'critical' ? '#dc2626' : severity === 'warning' ? '#ea580c' : '#3b82f6';
    const severityBg = severity === 'critical' ? '#fef2f2' : severity === 'warning' ? '#fff7ed' : '#eff6ff';

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lembrete de Pagamento</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: ${severityColor}; padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                ⚠️ Lembrete de Pagamento
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 20px;">
                Olá, ${reminderData.tenantName}
              </h2>

              <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Identificamos que a fatura abaixo está vencida há <strong>${reminderData.daysOverdue} ${reminderData.daysOverdue === 1 ? 'dia' : 'dias'}</strong>.
                Solicitamos a regularização do pagamento o quanto antes para evitar a suspensão dos serviços.
              </p>

              <!-- Invoice Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${severityBg}; border-radius: 6px; border: 2px solid ${severityColor}; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 12px; color: #6b7280; font-size: 14px; font-weight: 600; text-transform: uppercase;">
                      Detalhes da Fatura
                    </p>
                    <p style="margin: 0 0 8px; color: #1f2937; font-size: 16px;">
                      <strong>Número:</strong> ${reminderData.invoiceNumber}
                    </p>
                    <p style="margin: 0 0 8px; color: #1f2937; font-size: 16px;">
                      <strong>Valor:</strong> <span style="font-size: 20px; color: ${severityColor};">R$ ${reminderData.amount.toFixed(2)}</span>
                    </p>
                    <p style="margin: 0 0 8px; color: #1f2937; font-size: 16px;">
                      <strong>Vencimento:</strong> ${new Date(reminderData.dueDate).toLocaleDateString('pt-BR')}
                    </p>
                    <p style="margin: 0; color: ${severityColor}; font-size: 16px; font-weight: 600;">
                      <strong>Status:</strong> Vencida há ${reminderData.daysOverdue} ${reminderData.daysOverdue === 1 ? 'dia' : 'dias'}
                    </p>
                  </td>
                </tr>
              </table>

              ${reminderData.daysOverdue >= 30 ? `
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
                <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.5;">
                  <strong>🚨 ATENÇÃO URGENTE:</strong> O atraso já ultrapassa 30 dias. Caso o pagamento não seja regularizado em breve, sua conta pode ser suspensa automaticamente.
                </p>
              </div>
              ` : ''}

              <p style="margin: 24px 0 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
                Em caso de dúvidas ou dificuldades para efetuar o pagamento, entre em contato conosco através do email
                <a href="mailto:${this.emailReplyTo}" style="color: #3b82f6; text-decoration: none;">${this.emailReplyTo}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">
                <strong>Rafa ILPI</strong> - Sistema de Gestão para ILPIs
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Rafa Labs Desenvolvimento e Tecnologia
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Template HTML para relatório de inadimplência
   */
  private getOverdueReportTemplate(reportData: {
    period: 'daily' | 'weekly';
    startDate: Date;
    endDate: Date;
    totalOverdue: number;
    totalOverdueAmount: number;
    tenants: Array<{
      name: string;
      email: string;
      overdueInvoices: number;
      totalAmount: number;
      maxDaysOverdue: number;
    }>;
  }): string {
    const periodLabel = reportData.period === 'daily' ? 'Diário' : 'Semanal';
    const dateRange = `${reportData.startDate.toLocaleDateString('pt-BR')} - ${reportData.endDate.toLocaleDateString('pt-BR')}`;

    // Ordenar tenants por maior atraso
    const sortedTenants = [...reportData.tenants].sort((a, b) => b.maxDaysOverdue - a.maxDaysOverdue);

    const tenantsRows = sortedTenants.map(tenant => {
      const severity = tenant.maxDaysOverdue >= 30 ? 'critical' : tenant.maxDaysOverdue >= 7 ? 'warning' : 'info';
      const severityColor = severity === 'critical' ? '#dc2626' : severity === 'warning' ? '#ea580c' : '#3b82f6';

      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 16px; color: #1f2937; font-size: 14px;">
            <div style="font-weight: 600;">${tenant.name}</div>
            <div style="color: #6b7280; font-size: 12px;">${tenant.email}</div>
          </td>
          <td style="padding: 12px 16px; color: #1f2937; font-size: 14px; text-align: center;">
            ${tenant.overdueInvoices}
          </td>
          <td style="padding: 12px 16px; color: #1f2937; font-size: 14px; text-align: right; font-weight: 600;">
            R$ ${tenant.totalAmount.toFixed(2)}
          </td>
          <td style="padding: 12px 16px; text-align: center;">
            <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; background-color: ${severity === 'critical' ? '#fef2f2' : severity === 'warning' ? '#fff7ed' : '#eff6ff'}; color: ${severityColor}; font-size: 12px; font-weight: 600;">
              ${tenant.maxDaysOverdue} ${tenant.maxDaysOverdue === 1 ? 'dia' : 'dias'}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório de Inadimplência</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="800" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 40px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0 0 8px; color: #ffffff; font-size: 28px; font-weight: 600;">
                ${reportData.period === 'daily' ? '📊' : '📈'} Relatório ${periodLabel} de Inadimplência
              </h1>
              <p style="margin: 0; color: #fecaca; font-size: 14px;">
                Período: ${dateRange}
              </p>
            </td>
          </tr>

          <!-- Summary Cards -->
          <tr>
            <td style="padding: 40px 40px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding-right: 10px;">
                    <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 24px; border-radius: 8px; text-align: center;">
                      <p style="margin: 0 0 8px; color: #fecaca; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                        Total em Atraso
                      </p>
                      <p style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">
                        R$ ${reportData.totalOverdueAmount.toFixed(2)}
                      </p>
                    </div>
                  </td>
                  <td width="50%" style="padding-left: 10px;">
                    <div style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); padding: 24px; border-radius: 8px; text-align: center;">
                      <p style="margin: 0 0 8px; color: #fed7aa; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                        Faturas Vencidas
                      </p>
                      <p style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">
                        ${reportData.totalOverdue}
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Tenants Table -->
          <tr>
            <td style="padding: 20px 40px 40px;">
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 18px; font-weight: 600;">
                Detalhamento por Tenant (${reportData.tenants.length} ${reportData.tenants.length === 1 ? 'tenant inadimplente' : 'tenants inadimplentes'})
              </h2>

              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <!-- Table Header -->
                <tr style="background-color: #f9fafb;">
                  <th style="padding: 12px 16px; text-align: left; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; border-bottom: 2px solid #e5e7eb;">
                    Tenant
                  </th>
                  <th style="padding: 12px 16px; text-align: center; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; border-bottom: 2px solid #e5e7eb;">
                    Faturas
                  </th>
                  <th style="padding: 12px 16px; text-align: right; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; border-bottom: 2px solid #e5e7eb;">
                    Valor Total
                  </th>
                  <th style="padding: 12px 16px; text-align: center; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; border-bottom: 2px solid #e5e7eb;">
                    Maior Atraso
                  </th>
                </tr>

                <!-- Table Rows -->
                ${tenantsRows}

                <!-- Total Row -->
                <tr style="background-color: #fef2f2; font-weight: 600;">
                  <td style="padding: 16px; color: #991b1b; font-size: 14px;">
                    TOTAL
                  </td>
                  <td style="padding: 16px; color: #991b1b; font-size: 14px; text-align: center;">
                    ${reportData.totalOverdue}
                  </td>
                  <td style="padding: 16px; color: #991b1b; font-size: 16px; text-align: right;">
                    R$ ${reportData.totalOverdueAmount.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </table>

              ${reportData.tenants.length === 0 ? `
              <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 24px; margin-top: 20px; text-align: center;">
                <p style="margin: 0; color: #166534; font-size: 16px; font-weight: 600;">
                  🎉 Excelente! Nenhuma inadimplência no período.
                </p>
              </div>
              ` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">
                <strong>Rafa ILPI</strong> - Sistema de Gestão para ILPIs
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Rafa Labs Desenvolvimento e Tecnologia
              </p>
              <p style="margin: 8px 0 0; color: #9ca3af; font-size: 12px;">
                Relatório gerado automaticamente em ${new Date().toLocaleString('pt-BR')}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }
}
