import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { createHash } from 'crypto';
import {
  StampMetadata,
  ProcessedFileResult,
} from './interfaces/stamp-metadata.interface';

/**
 * Serviço responsável pelo processamento de arquivos de contrato
 *
 * Funcionalidades:
 * - Converter imagens (JPEG, PNG, WEBP) para PDF A4
 * - Adicionar carimbo institucional em PDFs
 * - Calcular hashes SHA-256 para verificação de integridade
 * - Fallback para PDFs corrompidos
 */
@Injectable()
export class FileProcessingService {
  private readonly logger = new Logger(FileProcessingService.name);

  /**
   * Processar arquivo de imagem: converter para PDF A4 + carimbo institucional
   *
   * Fluxo:
   * 1. Calcular hash SHA-256 do arquivo original
   * 2. Converter para PNG (qualidade máxima, SEM redimensionar)
   * 3. Criar PDF A4 (595x842 pontos)
   * 4. Incorporar imagem na resolução original
   * 5. Escalar SOMENTE se necessário para caber na área útil: 515x712pt
   *    - Margens: 40pt topo, 40pt laterais, 90pt rodapé (para carimbo)
   * 6. Alinhar ao topo com margens seguras
   * 7. Salvar PDF temporário para calcular hash final
   * 8. RECARREGAR PDF (pdf-lib não permite modificar após save)
   * 9. Adicionar carimbo no rodapé (não sobrepõe conteúdo)
   * 10. Retornar PDF final + hashes
   *
   * @param buffer Buffer da imagem original
   * @param metadata Metadados para o carimbo institucional
   * @returns Buffer do PDF processado + hashes (original e final)
   */
  async processImage(
    buffer: Buffer,
    metadata: StampMetadata,
  ): Promise<ProcessedFileResult> {
    this.logger.log(
      `🔥 [NOVO CÓDIGO] Processando imagem para contrato ${metadata.publicToken}`,
    );

    try {
      // 1. Calcular hash do arquivo original
      const hashOriginal = this.calculateHash(buffer);
      this.logger.debug(`Hash original calculado: ${hashOriginal}`);

      // 2. Processar imagem para PNG (melhor compatibilidade com pdf-lib)
      // Apenas converter formato, SEM redimensionar - preserva qualidade original
      // Se a imagem for muito grande, o escalonamento será feito no PDF (passo 5)
      const imageMetadata = await sharp(buffer).metadata();
      this.logger.debug(
        `Imagem original: ${imageMetadata.width}x${imageMetadata.height}px, formato: ${imageMetadata.format}`,
      );

      const processed = await sharp(buffer)
        .png({
          compressionLevel: 6, // Compressão balanceada (0-9, default 6)
          quality: 100,        // Qualidade máxima para preservar texto
        })
        .toBuffer();

      this.logger.debug(
        `Imagem convertida para PNG: ${buffer.length} bytes → ${processed.length} bytes`,
      );

      // 3. Criar PDF A4 (595x842 pontos = 210x297mm em 72 DPI)
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]);

      // 4. Incorporar imagem no PDF
      const image = await pdfDoc.embedPng(processed);

      // 5. Calcular dimensões de exibição respeitando margens
      // Área útil: 515pt largura × 712pt altura
      // Margens: 40pt topo, 40pt laterais, 90pt rodapé (para carimbo)
      const maxWidth = 515;   // 595 - 80 (margens laterais)
      const maxHeight = 712;  // 842 - 40 (topo) - 90 (rodapé)

      // Calcular escala para caber na área útil mantendo aspect ratio
      const imgDimensions = image.scale(1);
      const scaleWidth = maxWidth / imgDimensions.width;
      const scaleHeight = maxHeight / imgDimensions.height;
      const scale = Math.min(scaleWidth, scaleHeight); // Usar a menor escala para caber

      const displayWidth = imgDimensions.width * scale;
      const displayHeight = imgDimensions.height * scale;

      // 6. Posicionar imagem com margens seguras
      const marginTop = 40;
      const x = (595 - displayWidth) / 2;  // Centralizar horizontalmente
      const y = 842 - marginTop - displayHeight; // Alinhar ao topo com margem

      page.drawImage(image, {
        x,
        y,
        width: displayWidth,
        height: displayHeight,
      });

      this.logger.debug(
        `Imagem incorporada no PDF: ${displayWidth.toFixed(1)}x${displayHeight.toFixed(1)}pt em posição (${x.toFixed(1)}, ${y.toFixed(1)})`,
      );

      // 7. Salvar PDF temporário para calcular hash final
      let pdfBytes = await pdfDoc.save();
      const hashFinal = this.calculateHash(Buffer.from(pdfBytes));
      this.logger.debug(`Hash final calculado: ${hashFinal}`);

      // 8. RECARREGAR PDF para poder adicionar carimbo
      // (pdf-lib não permite modificar documento após save())
      this.logger.log(
        `[PROCESSAMENTO IMAGEM] Recarregando PDF para adicionar carimbo...`,
      );
      const reloadedPdfDoc = await PDFDocument.load(pdfBytes);
      this.logger.log(
        `[PROCESSAMENTO IMAGEM] PDF recarregado, adicionando carimbo institucional...`,
      );

      // 9. Adicionar carimbo institucional com hash final
      await this.addStampToPdf(reloadedPdfDoc, { ...metadata, hashFinal });
      this.logger.log(
        `[PROCESSAMENTO IMAGEM] Carimbo adicionado, salvando PDF final...`,
      );

      // 10. Salvar PDF final
      pdfBytes = await reloadedPdfDoc.save();
      this.logger.log(
        `[PROCESSAMENTO IMAGEM] PDF final salvo: ${pdfBytes.length} bytes`,
      );

      this.logger.log(
        `Imagem processada com sucesso: ${pdfBytes.length} bytes`,
      );

      return {
        pdfBuffer: Buffer.from(pdfBytes),
        hashOriginal,
        hashFinal,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao processar imagem: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Falha ao processar imagem: ${error.message}`,
      );
    }
  }

  /**
   * Processar PDF existente: adicionar carimbo institucional em todas as páginas
   *
   * Fluxo:
   * 1. Calcular hash SHA-256 do arquivo original
   * 2. Tentar carregar PDF
   * 3. Salvar temporário para calcular hash final
   * 4. Adicionar carimbo em todas as páginas
   * 5. Retornar PDF final + hashes
   * 6. Se PDF corrompido → fallback: reconstruir
   *
   * @param buffer Buffer do PDF original
   * @param metadata Metadados para o carimbo institucional
   * @returns Buffer do PDF processado + hashes (original e final)
   */
  async processPdf(
    buffer: Buffer,
    metadata: StampMetadata,
  ): Promise<ProcessedFileResult> {
    this.logger.log(`Processando PDF para contrato ${metadata.publicToken}`);

    try {
      // 1. Calcular hash do arquivo original
      const hashOriginal = this.calculateHash(buffer);
      this.logger.debug(`Hash original calculado: ${hashOriginal}`);

      try {
        // 2. Tentar carregar PDF
        const pdfDoc = await PDFDocument.load(buffer);
        const pageCount = pdfDoc.getPageCount();
        this.logger.debug(`PDF carregado: ${pageCount} página(s)`);

        // 3. Salvar temporário para calcular hash final
        // (antes de adicionar carimbo)
        let pdfBytes = await pdfDoc.save();
        const hashFinal = this.calculateHash(Buffer.from(pdfBytes));
        this.logger.debug(`Hash final calculado: ${hashFinal}`);

        // 4. Adicionar carimbo institucional em todas as páginas
        await this.addStampToPdf(pdfDoc, { ...metadata, hashFinal });

        // 5. Salvar PDF final
        pdfBytes = await pdfDoc.save();

        this.logger.log(
          `PDF processado com sucesso: ${pageCount} página(s), ${pdfBytes.length} bytes`,
        );

        return {
          pdfBuffer: Buffer.from(pdfBytes),
          hashOriginal,
          hashFinal,
        };
      } catch (error) {
        // 6. Se PDF corrompido, tentar reconstruir
        this.logger.warn(
          `PDF corrompido ou inválido, tentando reconstruir: ${error.message}`,
        );
        return this.rebuildPdfFromImages(buffer, metadata);
      }
    } catch (error) {
      this.logger.error(`Erro ao processar PDF: ${error.message}`, error.stack);
      throw new BadRequestException(
        `Falha ao processar PDF: ${error.message}`,
      );
    }
  }

  /**
   * Adicionar carimbo institucional no rodapé de todas as páginas do PDF
   *
   * O carimbo contém:
   * - Nome e CNPJ da ILPI
   * - Nome e cargo do usuário que fez upload
   * - Data e hora do upload
   * - Hash SHA-256 truncado (preview 16+...+16)
   * - Token público para validação
   * - URL de validação pública
   *
   * @param pdfDoc Documento PDF (pdf-lib)
   * @param metadata Metadados para o carimbo
   */
  private async addStampToPdf(
    pdfDoc: PDFDocument,
    metadata: StampMetadata,
  ): Promise<void> {
    try {
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const stampText = this.generateStamp(metadata);

      this.logger.debug(
        `Adicionando carimbo em ${pages.length} página(s)`,
      );
      this.logger.debug(`Texto do carimbo: ${stampText.substring(0, 100)}...`);

      // Adicionar carimbo em todas as páginas
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { height } = page.getSize();

        this.logger.debug(
          `Página ${i + 1}: altura=${height}, posição y do carimbo=50`,
        );

        // Desenhar texto no rodapé (50 pontos do fundo)
        page.drawText(stampText, {
          x: 50,
          y: 50,
          size: 7,
          font,
          color: rgb(0.3, 0.3, 0.3), // Cinza escuro
          lineHeight: 9,
          maxWidth: 495, // Largura máxima (595 - 100 margens)
        });

        this.logger.debug(`Carimbo adicionado na página ${i + 1}`);
      }

      this.logger.log(
        `Carimbo institucional adicionado com sucesso em ${pages.length} página(s)`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao adicionar carimbo institucional: ${error.message}`,
        error.stack,
      );
      // Re-lançar erro para não gerar PDF sem carimbo
      throw new BadRequestException(
        `Falha ao adicionar carimbo institucional: ${error.message}`,
      );
    }
  }

  /**
   * Reconstruir PDF: converter páginas em imagens + recriar PDF
   * (fallback para PDFs corrompidos que não podem ser carregados)
   *
   * NOTA: Implementação simplificada - cria PDF novo indicando reconstrução
   * Em produção, pode usar bibliotecas como pdf-poppler para extrair páginas
   *
   * @param buffer Buffer do PDF original (corrompido)
   * @param metadata Metadados para o carimbo
   * @returns Buffer do PDF reconstruído + hashes
   */
  private async rebuildPdfFromImages(
    buffer: Buffer,
    metadata: StampMetadata,
  ): Promise<ProcessedFileResult> {
    this.logger.warn(
      `Reconstruindo PDF corrompido para contrato ${metadata.publicToken}`,
    );

    try {
      const hashOriginal = this.calculateHash(buffer);

      // Criar PDF novo vazio
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]);

      // Adicionar texto indicando reconstrução
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const warningText = [
        'DOCUMENTO RECONSTRUÍDO',
        '',
        'O arquivo original não pôde ser processado devido a corrupção ou formato inválido.',
        'Este PDF foi reconstruído para preservar a integridade do sistema.',
        '',
        `Hash SHA-256 do arquivo original: ${hashOriginal}`,
        '',
        'Para verificar a autenticidade, entre em contato com a ILPI.',
      ].join('\n');

      page.drawText(warningText, {
        x: 50,
        y: 700,
        size: 12,
        font,
        color: rgb(0.2, 0.2, 0.2),
        lineHeight: 16,
      });

      // Calcular hash do PDF reconstruído
      let pdfBytes = await pdfDoc.save();
      const hashFinal = this.calculateHash(Buffer.from(pdfBytes));

      // Recarregar PDF para adicionar carimbo (pdf-lib não permite modificar após save)
      const reloadedPdfDoc = await PDFDocument.load(pdfBytes);
      await this.addStampToPdf(reloadedPdfDoc, { ...metadata, hashFinal });

      // Salvar PDF final
      pdfBytes = await reloadedPdfDoc.save();

      this.logger.warn(
        `PDF reconstruído: ${pdfBytes.length} bytes`,
      );

      return {
        pdfBuffer: Buffer.from(pdfBytes),
        hashOriginal,
        hashFinal,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao reconstruir PDF: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Impossível processar arquivo: ${error.message}`,
      );
    }
  }

  /**
   * Remover acentos e caracteres especiais para compatibilidade com Helvetica (WinAnsi)
   * pdf-lib com Helvetica suporta apenas ASCII básico
   */
  private sanitizeText(text: string): string {
    return text
      .normalize('NFD') // Decompor caracteres acentuados
      .replace(/[\u0300-\u036f]/g, '') // Remover marcas diacríticas
      .replace(/[^\x00-\x7F]/g, '?'); // Substituir caracteres não-ASCII por '?'
  }

  /**
   * Gerar texto do carimbo institucional
   *
   * Formato ultra-compacto (4 linhas):
   * ────────────────────────────────────────────────────────────────────
   * ILPI: [Nome] | CNPJ: [CNPJ]
   * Validado por: [Nome] - [Cargo] ([Registro]) | [dd/mm/yyyy hh:mm:ss] (UTC-3)
   * SHA-256: [16 chars iniciais]...[16 chars finais]
   * Validar: https://rafa-ilpi.rafalabs.com.br/validar/{token}
   * ────────────────────────────────────────────────────────────────────
   *
   * IMPORTANTE: Texto sanitizado para compatibilidade com fonte Helvetica (apenas ASCII)
   *
   * @param metadata Metadados do contrato
   * @returns String formatada do carimbo (4 linhas, apenas ASCII)
   */
  private generateStamp(metadata: StampMetadata): string {
    const dateStr = metadata.uploadDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const timeStr = metadata.uploadDate.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/Sao_Paulo',
    });

    // Sanitizar textos para remover acentos (Helvetica = apenas ASCII)
    const tenantName = this.sanitizeText(metadata.tenantName);
    const tenantCnpj = this.sanitizeText(metadata.tenantCnpj);
    const userName = this.sanitizeText(metadata.userName);
    const userRole = this.sanitizeText(metadata.userRole);
    const userRegistry = metadata.userProfessionalRegistry
      ? this.sanitizeText(metadata.userProfessionalRegistry)
      : '';

    // Linha 1: ILPI
    const line1 = `ILPI: ${tenantName} | CNPJ: ${tenantCnpj}`;

    // Linha 2: Validado por (com registro profissional se houver)
    const registryPart = userRegistry ? ` (${userRegistry})` : '';
    const line2 = `Validado por: ${userName} - ${userRole}${registryPart} | ${dateStr} ${timeStr} (UTC-3)`;

    // Linha 3: Hash SHA-256 truncado (16 primeiros + ... + 16 últimos)
    const hash = metadata.hashFinal || 'CALCULANDO...';
    const hashPreview = hash.length === 64
      ? `${hash.substring(0, 16)}...${hash.substring(48)}`
      : hash;
    const line3 = `SHA-256: ${hashPreview}`;

    // Linha 4: URL de validação
    const line4 = `Validar: https://rafa-ilpi.rafalabs.com.br/validar/${metadata.publicToken}`;

    return `${line1}\n${line2}\n${line3}\n${line4}`;
  }

  /**
   * Calcular hash SHA-256 de um buffer
   *
   * Usado para:
   * - Verificar integridade do arquivo original
   * - Gerar fingerprint do PDF processado
   * - Validação pública de documentos
   *
   * @param buffer Buffer do arquivo
   * @returns Hash SHA-256 em hexadecimal (64 caracteres)
   */
  calculateHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }
}
