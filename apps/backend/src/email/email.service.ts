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
}
