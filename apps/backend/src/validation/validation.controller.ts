import {
  Controller,
  Get,
  Param,
  Res,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ValidationService } from './validation.service';
import { Public } from '../auth/decorators/public.decorator';
import { PublicDocumentValidationDto } from './dto/public-document-validation.dto';

@ApiTags('validation')
@Controller('validar')
export class ValidationController {
  constructor(private readonly validationService: ValidationService) {}

  /**
   * GET /validar/:token
   * Endpoint público de validação de documentos
   * Retorna HTML renderizado com logo e cores do Rafa ILPI
   */
  @Public()
  @Get(':token')
  @ApiOperation({
    summary: 'Validar documento público por token',
    description:
      'Endpoint público (sem autenticação) que valida qualquer documento do Rafa ILPI e retorna página HTML estilizada',
  })
  @ApiParam({
    name: 'token',
    description: 'Token público de validação (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Documento válido - retorna HTML renderizado',
  })
  @ApiResponse({
    status: 404,
    description: 'Documento não encontrado ou token inválido',
  })
  async validateDocument(@Param('token') token: string, @Res() res: Response) {
    try {
      const validation = await this.validationService.validateDocument(token);

      // Renderizar HTML com cores do design system Rafa ILPI
      const html = this.renderValidationPage(validation);

      res.status(HttpStatus.OK).contentType('text/html').send(html);
    } catch (error) {
      if (error instanceof NotFoundException) {
        // Renderizar página de erro 404
        const errorHtml = this.renderErrorPage(token);
        res.status(HttpStatus.NOT_FOUND).contentType('text/html').send(errorHtml);
      } else {
        throw error;
      }
    }
  }

  /**
   * Renderizar página HTML de validação bem-sucedida
   */
  private renderValidationPage(
    validation: PublicDocumentValidationDto,
  ): string {
    const docTypeMap: Record<string, string> = {
      vaccination: 'Comprovante de Vacinação',
      contract: 'Contrato de Residência',
      institutional_document: 'Documento Institucional',
    };

    const docType = docTypeMap[validation.documentType] || 'Documento';

    // Se for documento institucional, mostrar tipo específico
    const docTypeLine = validation.documentType === 'institutional_document'
      ? `${docType} - ${validation.documentInfo.metadata?.documentType || 'Não especificado'}`
      : docType;

    const professionalRegistryHtml = validation.documentInfo.professionalRegistry
      ? `<p class="registry">${validation.documentInfo.professionalRegistry}</p>`
      : '';

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Validação de Documento - Rafa ILPI</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    /* Rafa Labs Brand Kit - Design System Oficial */
    :root {
      /* Cores Primárias */
      --primary: #0f172a;           /* Azul Marinho */
      --primary-foreground: #ffffff;
      --secondary: #059669;         /* Verde */
      --accent: #06b6d4;            /* Ciano */

      /* Cores de Feedback */
      --success: #059669;           /* Verde */
      --danger: hsl(0, 72%, 48%);
      --warning: hsl(38, 92%, 45%);

      /* Cores Neutras */
      --gray-50: #f8fafc;           /* Cinza Claro */
      --gray-500: #64748b;          /* Cinza Médio */
      --gray-700: #334155;          /* Cinza Escuro */
      --muted: #f8fafc;
      --muted-foreground: #64748b;
      --border: #e2e8f0;
      --background: #ffffff;
      --foreground: #0f172a;

      /* Tipografia */
      --font-heading: 'Playfair Display', serif;
      --font-body: 'DM Sans', sans-serif;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--font-body);
      background: linear-gradient(135deg, var(--gray-50) 0%, #e2e8f0 100%);
      color: var(--foreground);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .container {
      max-width: 800px;
      width: 100%;
      background: white;
      border-radius: 1rem;
      box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
      overflow: hidden;
    }

    .header {
      background: var(--primary);
      color: var(--primary-foreground);
      padding: 2.5rem 2rem;
      text-align: center;
      position: relative;
    }

    .brand-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }

    .brand-logo-text {
      font-family: var(--font-heading);
      font-size: 1rem;
      font-weight: 600;
      opacity: 0.85;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .logo {
      font-family: var(--font-heading);
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      letter-spacing: -0.02em;
    }

    .logo-subtitle {
      font-family: var(--font-body);
      font-size: 0.875rem;
      opacity: 0.9;
      font-weight: 500;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .content {
      padding: 2.5rem 2rem;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--success);
      color: white;
      padding: 0.75rem 1.25rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 2rem;
    }

    .badge svg {
      width: 20px;
      height: 20px;
    }

    h1 {
      font-family: var(--font-heading);
      font-size: 1.875rem;
      font-weight: 700;
      color: var(--foreground);
      margin-bottom: 0.5rem;
      line-height: 1.2;
    }

    h2 {
      font-family: var(--font-heading);
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--muted-foreground);
      margin-bottom: 2rem;
    }

    .info-grid {
      display: grid;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .info-item {
      border-left: 3px solid var(--primary);
      padding-left: 1rem;
    }

    .info-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--muted-foreground);
      font-weight: 600;
      margin-bottom: 0.25rem;
    }

    .info-value {
      font-size: 1rem;
      color: var(--foreground);
      font-weight: 500;
      word-break: break-all;
    }

    .registry {
      font-size: 0.875rem;
      color: var(--accent);
      font-weight: 600;
      margin-top: 0.25rem;
    }

    .hash-section {
      background: var(--muted);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      padding: 1.5rem;
      margin-top: 2rem;
    }

    .hash-title {
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--foreground);
      margin-bottom: 1rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .hash-item {
      margin-bottom: 1rem;
    }

    .hash-item:last-child {
      margin-bottom: 0;
    }

    .hash-label {
      font-size: 0.75rem;
      color: var(--muted-foreground);
      font-weight: 600;
      margin-bottom: 0.25rem;
    }

    .hash-value {
      font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
      font-size: 0.75rem;
      background: white;
      padding: 0.75rem;
      border-radius: 0.5rem;
      border: 1px solid var(--border);
      word-break: break-all;
      color: var(--foreground);
    }

    .footer {
      background: var(--muted);
      border-top: 1px solid var(--border);
      padding: 1.5rem 2rem;
      text-align: center;
      font-size: 0.75rem;
      color: var(--muted-foreground);
    }

    .footer p {
      margin-bottom: 0.25rem;
    }

    .footer strong {
      color: var(--foreground);
      font-weight: 600;
    }

    @media (max-width: 640px) {
      body {
        padding: 1rem;
      }

      .header {
        padding: 2rem 1.5rem;
      }

      .logo {
        font-size: 2rem;
      }

      .content {
        padding: 2rem 1.5rem;
      }

      h1 {
        font-size: 1.5rem;
      }

      h2 {
        font-size: 1.125rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand-container">
        <div class="brand-logo-text">Rafa Labs</div>
        <div class="logo">RAFA ILPI</div>
        <div class="logo-subtitle">Sistema de Gestão para Instituições de Longa Permanência</div>
      </div>
    </div>

    <div class="content">
      <div class="badge">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        Documento Válido
      </div>

      <h1>Validação Bem-Sucedida</h1>
      <h2>${docTypeLine}</h2>

      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Instituição</div>
          <div class="info-value">${validation.documentInfo.institutionName}</div>
          <div class="info-value" style="font-size: 0.875rem; opacity: 0.8;">CNPJ: ${validation.documentInfo.institutionCnpj}</div>
        </div>

        <div class="info-item">
          <div class="info-label">Validado Por</div>
          <div class="info-value">${validation.documentInfo.validatedBy}</div>
          <div class="info-value" style="font-size: 0.875rem; opacity: 0.8;">${validation.documentInfo.validatorRole}</div>
          ${professionalRegistryHtml}
        </div>

        <div class="info-item">
          <div class="info-label">Data de Processamento</div>
          <div class="info-value">${new Date(validation.documentInfo.processedAt).toLocaleString('pt-BR', {
            dateStyle: 'long',
            timeStyle: 'short',
            timeZone: 'America/Sao_Paulo',
          })}</div>
        </div>

        <div class="info-item">
          <div class="info-label">Data da Consulta</div>
          <div class="info-value">${new Date(validation.consultedAt).toLocaleString('pt-BR', {
            dateStyle: 'long',
            timeStyle: 'short',
            timeZone: 'America/Sao_Paulo',
          })}</div>
        </div>
      </div>

      <div class="hash-section">
        <div class="hash-title">🔒 Integridade Criptográfica (SHA-256)</div>

        <div class="hash-item">
          <div class="hash-label">Hash do Arquivo Original</div>
          <div class="hash-value">${validation.documentInfo.hashOriginal}</div>
        </div>

        <div class="hash-item">
          <div class="hash-label">Hash do Documento Processado</div>
          <div class="hash-value">${validation.documentInfo.hashFinal}</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <p><strong>Token de Validação:</strong> ${validation.publicToken}</p>
      <p style="margin-top: 0.75rem;">Este documento foi processado e carimbado digitalmente pelo sistema <strong>Rafa ILPI</strong></p>
      <p>Powered by <strong>Rafa Labs Desenvolvimento e Tecnologia</strong></p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Renderizar página HTML de erro 404
   */
  private renderErrorPage(token: string): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documento Não Encontrado - Rafa ILPI</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: hsl(210, 90%, 45%);
      --primary-foreground: hsl(210, 40%, 98%);
      --danger: hsl(0, 72%, 48%);
      --muted: hsl(210, 40%, 96%);
      --muted-foreground: hsl(215, 16%, 47%);
      --border: hsl(214, 32%, 91%);
      --background: hsl(0, 0%, 100%);
      --foreground: hsl(222, 47%, 11%);
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--font-body);
      background: linear-gradient(135deg, var(--gray-50) 0%, #e2e8f0 100%);
      color: var(--foreground);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .container {
      max-width: 600px;
      width: 100%;
      background: white;
      border-radius: 1rem;
      box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
      overflow: hidden;
    }

    .header {
      background: var(--primary);
      color: var(--primary-foreground);
      padding: 2.5rem 2rem;
      text-align: center;
      position: relative;
    }

    .brand-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }

    .brand-logo-text {
      font-family: var(--font-heading);
      font-size: 1rem;
      font-weight: 600;
      opacity: 0.85;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .logo {
      font-family: var(--font-heading);
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      letter-spacing: -0.02em;
    }

    .logo-subtitle {
      font-family: var(--font-body);
      font-size: 0.875rem;
      opacity: 0.9;
      font-weight: 500;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .content {
      padding: 2.5rem 2rem;
      text-align: center;
    }

    .badge-error {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--danger);
      color: white;
      padding: 0.75rem 1.25rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 2rem;
    }

    .badge-error svg {
      width: 20px;
      height: 20px;
    }

    h1 {
      font-size: 1.875rem;
      font-weight: 700;
      color: var(--foreground);
      margin-bottom: 1rem;
    }

    p {
      font-size: 1rem;
      color: var(--muted-foreground);
      line-height: 1.6;
      margin-bottom: 1rem;
    }

    .token-display {
      background: var(--muted);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      padding: 1rem;
      font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
      font-size: 0.875rem;
      word-break: break-all;
      margin-top: 1.5rem;
      color: var(--foreground);
    }

    .footer {
      background: var(--muted);
      border-top: 1px solid var(--border);
      padding: 1.5rem 2rem;
      text-align: center;
      font-size: 0.75rem;
      color: var(--muted-foreground);
    }

    @media (max-width: 640px) {
      body {
        padding: 1rem;
      }

      .header {
        padding: 2rem 1.5rem;
      }

      .logo {
        font-size: 2rem;
      }

      .content {
        padding: 2rem 1.5rem;
      }

      h1 {
        font-size: 1.5rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand-container">
        <div class="brand-logo-text">Rafa Labs</div>
        <div class="logo">RAFA ILPI</div>
        <div class="logo-subtitle">Sistema de Gestão para Instituições de Longa Permanência</div>
      </div>
    </div>

    <div class="content">
      <div class="badge-error">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
        Documento Não Encontrado
      </div>

      <h1>Token Inválido ou Expirado</h1>

      <p>O token de validação fornecido não foi encontrado em nossa base de dados.</p>
      <p>Verifique se o token está correto ou entre em contato com a instituição que forneceu o documento.</p>

      <div class="token-display">${token}</div>
    </div>

    <div class="footer">
      <p>Powered by <strong>Rafa Labs Desenvolvimento e Tecnologia</strong></p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}
