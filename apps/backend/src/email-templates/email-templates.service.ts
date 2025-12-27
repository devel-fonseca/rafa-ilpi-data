import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailTemplate, EmailTemplateVersion, Prisma } from '@prisma/client';
import {
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
  PreviewEmailTemplateDto,
} from './dto';
import { format } from 'date-fns';
import { Resend } from 'resend';
import mjml2html from 'mjml';

@Injectable()
export class EmailTemplatesService {
  private resend: Resend;

  constructor(private prisma: PrismaService) {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  /**
   * CRUD Básico
   */

  async findAll(): Promise<EmailTemplate[]> {
    return this.prisma.emailTemplate.findMany({
      orderBy: { category: 'asc' },
    });
  }

  async findOne(id: string): Promise<EmailTemplate> {
    const template = await this.prisma.emailTemplate.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 10, // Últimas 10 versões
        },
      },
    });

    if (!template) {
      throw new NotFoundException(`Template ${id} não encontrado`);
    }

    return template;
  }

  async findByKey(key: string): Promise<EmailTemplate> {
    const template = await this.prisma.emailTemplate.findUnique({
      where: { key },
    });

    if (!template) {
      throw new NotFoundException(`Template com chave "${key}" não encontrado`);
    }

    if (!template.isActive) {
      throw new NotFoundException(`Template "${key}" está inativo`);
    }

    return template;
  }

  async create(dto: CreateEmailTemplateDto): Promise<EmailTemplate> {
    return this.prisma.emailTemplate.create({
      data: {
        key: dto.key,
        name: dto.name,
        subject: dto.subject,
        description: dto.description,
        jsonContent: dto.jsonContent as unknown as Prisma.InputJsonValue,
        variables: dto.variables as unknown as Prisma.InputJsonValue,
        category: dto.category,
        isActive: dto.isActive ?? true,
        version: 1,
      },
    });
  }

  async update(id: string, dto: UpdateEmailTemplateDto): Promise<EmailTemplate> {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Buscar template atual
      const current = await tx.emailTemplate.findUnique({ where: { id } });

      if (!current) {
        throw new NotFoundException(`Template ${id} não encontrado`);
      }

      // 2. Salvar versão anterior
      await tx.emailTemplateVersion.create({
        data: {
          templateId: id,
          versionNumber: current.version,
          jsonContent: current.jsonContent as unknown as Prisma.InputJsonValue,
          subject: current.subject,
          createdBy: dto.userId || '00000000-0000-0000-0000-000000000000', // Default se não informado
          changeNote: dto.changeNote,
        },
      });

      // 3. Atualizar template com nova versão
      const updated = await tx.emailTemplate.update({
        where: { id },
        data: {
          name: dto.name,
          subject: dto.subject,
          description: dto.description,
          jsonContent: dto.jsonContent as unknown as Prisma.InputJsonValue | undefined,
          variables: dto.variables as unknown as Prisma.InputJsonValue | undefined,
          category: dto.category,
          isActive: dto.isActive,
          version: current.version + 1,
        },
      });

      return updated;
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.emailTemplate.delete({ where: { id } });
  }

  /**
   * Versionamento
   */

  async getVersionHistory(id: string): Promise<EmailTemplateVersion[]> {
    const template = await this.prisma.emailTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template ${id} não encontrado`);
    }

    return this.prisma.emailTemplateVersion.findMany({
      where: { templateId: id },
      orderBy: { versionNumber: 'desc' },
    });
  }

  async rollbackToVersion(id: string, versionId: string): Promise<EmailTemplate> {
    const version = await this.prisma.emailTemplateVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      throw new NotFoundException(`Versão ${versionId} não encontrada`);
    }

    return await this.update(id, {
      jsonContent: version.jsonContent,
      subject: version.subject,
      changeNote: `Rollback para versão ${version.versionNumber}`,
    });
  }

  /**
   * Renderização
   */

  async renderTemplate(key: string, variables: Record<string, any>): Promise<string> {
    // 1. Buscar template do DB
    const template = await this.findByKey(key);

    // 2. Renderizar Easy Email JSON para HTML
    const html = this.renderEasyEmailToHtml(template.jsonContent);

    // 3. Substituir variáveis {{tenantName}} → "ILPI X"
    const finalHtml = this.replaceVariables(html, variables);

    return finalHtml;
  }

  async previewTemplate(dto: PreviewEmailTemplateDto): Promise<string> {
    // Renderizar Easy Email JSON para HTML
    const html = this.renderEasyEmailToHtml(dto.jsonContent);

    // Substituir variáveis
    const finalHtml = this.replaceVariables(html, dto.variables);

    return finalHtml;
  }

  /**
   * Helpers
   */

  /**
   * Renderiza Easy Email JSON para HTML usando MJML
   */
  private renderEasyEmailToHtml(jsonContent: any): string {
    try {
      // Se o jsonContent tiver um campo 'content' que é string
      if (jsonContent && typeof jsonContent.content === 'string') {
        const content = jsonContent.content;

        // Detectar se é HTML puro (contém <!doctype html> ou <!DOCTYPE html> ou <html)
        const isHtml = content.trim().toLowerCase().startsWith('<!doctype html') ||
                       content.trim().toLowerCase().startsWith('<!DOCTYPE html') ||
                       content.trim().toLowerCase().startsWith('<html');

        // Se for HTML puro, retornar diretamente
        if (isHtml) {
          return content;
        }

        // Se não for HTML, tentar processar como MJML
        try {
          const result = mjml2html(content);
          return result.html;
        } catch (mjmlError) {
          console.warn('Conteúdo não é MJML válido, retornando como HTML:', mjmlError);
          return content; // Retornar o conteúdo original se MJML falhar
        }
      }

      // Se for um placeholder (Fase 1/2), retornar HTML simples
      if (jsonContent && jsonContent.type === 'placeholder') {
        return `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
              <div style="max-width: 600px; margin: 0 auto;">
                <p>⚠️ Este é um template placeholder.</p>
                <p>O template será editado visualmente com Easy Email Editor na interface.</p>
              </div>
            </body>
          </html>
        `;
      }

      // Fallback: retornar HTML básico
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto;">
              <p>Email template - Easy Email JSON structure</p>
            </div>
          </body>
        </html>
      `;
    } catch (error) {
      console.error('Erro ao renderizar Easy Email:', error);
      // Retornar HTML de fallback em caso de erro
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
          </head>
          <body>
            <p>Erro ao renderizar template</p>
          </body>
        </html>
      `;
    }
  }

  private replaceVariables(html: string, variables: Record<string, any>): string {
    let result = html;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');

      // Formatar valor baseado no tipo
      let formattedValue = value;

      if (value instanceof Date) {
        formattedValue = format(value, "dd/MM/yyyy 'às' HH:mm");
      } else if (typeof value === 'number') {
        formattedValue = value.toLocaleString('pt-BR');
      } else if (typeof value === 'boolean') {
        formattedValue = value ? 'Sim' : 'Não';
      } else if (Array.isArray(value)) {
        // Para arrays, converter para JSON string formatado
        formattedValue = JSON.stringify(value, null, 2);
      } else if (typeof value === 'object' && value !== null) {
        // Para objetos, converter para JSON string formatado
        formattedValue = JSON.stringify(value, null, 2);
      }

      result = result.replace(regex, String(formattedValue));
    });

    return result;
  }

  private generatePlaceholderHtml(
    template: EmailTemplate,
    variables: Record<string, any>,
  ): string {
    // Placeholder simples até implementar Easy Email
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${template.subject}</title>
        </head>
        <body>
          <h1>${template.name}</h1>
          <p>Template: ${template.key}</p>
          <p>Este é um placeholder temporário. A renderização Easy Email será implementada na Fase 3.</p>
          <hr/>
          <h2>Variáveis:</h2>
          <pre>${JSON.stringify(variables, null, 2)}</pre>
        </body>
      </html>
    `;
  }

  /**
   * Envio de Email de Teste
   */

  async sendTestEmail(
    id: string,
    to: string,
    variables: Record<string, any>,
  ): Promise<boolean> {
    const template = await this.findOne(id);
    const html = await this.renderTemplate(template.key, variables);

    // Adicionar marcação de email de teste no subject
    const subject = `[TESTE] ${this.replaceVariables(template.subject, variables)}`;

    try {
      const result = await this.resend.emails.send({
        from: process.env.EMAIL_FROM || 'Rafa ILPI <noreply@mail.rafalabs.com.br>',
        to: [to],
        subject,
        html,
      });

      return !result.error;
    } catch (error) {
      console.error('Erro ao enviar email de teste:', error);
      return false;
    }
  }
}
