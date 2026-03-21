import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailTemplate, EmailTemplateVersion, Prisma } from '@prisma/client';
import {
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
  PreviewEmailTemplateDto,
} from './dto';
import { format } from 'date-fns';
import { Resend } from 'resend';

@Injectable()
export class EmailTemplatesService {
  private resend: Resend;
  private static readonly MJML_TAG_PATTERN = /<\s*mj[a-z-]*\b/i;
  private static readonly HTML_TAG_PATTERN = /<\/?[a-z][^>]*>/i;

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
    const jsonContent = this.normalizeHtmlTemplatePayload(dto.jsonContent);

    return this.prisma.emailTemplate.create({
      data: {
        key: dto.key,
        name: dto.name,
        subject: dto.subject,
        description: dto.description,
        jsonContent: jsonContent as Prisma.InputJsonValue,
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

      const normalizedJsonContent =
        dto.jsonContent === undefined
          ? undefined
          : this.normalizeHtmlTemplatePayload(dto.jsonContent);

      // 2. Salvar versão anterior
      await tx.emailTemplateVersion.create({
        data: {
          templateId: id,
          versionNumber: current.version,
          jsonContent: current.jsonContent as Prisma.InputJsonValue,
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
          jsonContent: normalizedJsonContent as Prisma.InputJsonValue | undefined,
          variables: dto.variables as Prisma.InputJsonValue | undefined,
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
      jsonContent: version.jsonContent as Record<string, unknown> | undefined,
      subject: version.subject,
      changeNote: `Rollback para versão ${version.versionNumber}`,
    });
  }

  /**
   * Renderização
   */

  async renderTemplate(key: string, variables: Record<string, unknown>): Promise<string> {
    // 1. Buscar template do DB
    const template = await this.findByKey(key);

    // 2. Extrair HTML salvo no template
    const html = this.renderStoredTemplateHtml(template.jsonContent);

    // 3. Substituir variáveis {{tenantName}} → "ILPI X"
    const finalHtml = this.replaceVariables(html, variables);

    return finalHtml;
  }

  async previewTemplate(dto: PreviewEmailTemplateDto): Promise<string> {
    // Renderizar HTML salvo no payload
    const html = this.renderStoredTemplateHtml(dto.jsonContent);

    // Substituir variáveis
    const finalHtml = this.replaceVariables(html, dto.variables);

    return finalHtml;
  }

  /**
   * Helpers
   */

  /**
   * Extrai HTML salvo no template.
   */
  private renderStoredTemplateHtml(jsonContent: unknown): string {
    try {
      const json = this.normalizeHtmlTemplatePayload(jsonContent);
      return json.content;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Erro ao renderizar template HTML:', error);
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

  private normalizeHtmlTemplatePayload(
    jsonContent: unknown,
  ): Record<string, unknown> & { content: string } {
    if (!jsonContent || typeof jsonContent !== 'object' || Array.isArray(jsonContent)) {
      throw new BadRequestException(
        'jsonContent deve ser um objeto com o campo content contendo HTML.',
      );
    }

    const payload = jsonContent as Record<string, unknown>;
    const rawContent = payload.content;

    if (typeof rawContent !== 'string' || rawContent.trim().length === 0) {
      throw new BadRequestException(
        'jsonContent.content deve ser uma string HTML não vazia.',
      );
    }

    const content = rawContent.trim();

    if (EmailTemplatesService.MJML_TAG_PATTERN.test(content)) {
      throw new BadRequestException(
        'Templates MJML não são mais suportados. Use HTML no editor visual.',
      );
    }

    if (!EmailTemplatesService.HTML_TAG_PATTERN.test(content)) {
      throw new BadRequestException(
        'jsonContent.content deve conter HTML válido.',
      );
    }

    return {
      ...payload,
      content,
    };
  }

  private replaceVariables(html: string, variables: Record<string, unknown>): string {
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

  /**
   * Envio de Email de Teste
   */

  async sendTestEmail(
    id: string,
    to: string,
    variables: Record<string, unknown>,
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
