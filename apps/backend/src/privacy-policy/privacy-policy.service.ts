import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join, resolve } from 'path';

@Injectable()
export class PrivacyPolicyService {
  /**
   * Retorna a Política de Privacidade atual do arquivo Markdown
   */
  async getCurrentPolicy() {
    // Em desenvolvimento, usar caminho do source; em produção, do dist
    // Como usamos Webpack, o arquivo precisa estar no src/assets
    const policyPath = resolve(
      __dirname,
      '..',
      'assets',
      'legal',
      'POLITICA-DE-PRIVACIDADE.md',
    );

    let content: string;
    try {
      content = readFileSync(policyPath, 'utf8');
    } catch (error) {
      // Fallback: tentar caminho do source em desenvolvimento
      const devPath = resolve(
        process.cwd(),
        'src',
        'assets',
        'legal',
        'POLITICA-DE-PRIVACIDADE.md',
      );
      content = readFileSync(devPath, 'utf8');
    }

    // Extrair metadados do cabeçalho
    const versionMatch = content.match(/\*\*Versão:\*\* (.+)/);
    const effectiveDateMatch = content.match(
      /\*\*Data de Vigência:\*\* (.+)/,
    );
    const lastUpdatedMatch = content.match(
      /\*\*Última Atualização:\*\* (.+)/,
    );

    return {
      version: versionMatch ? versionMatch[1] : '2.1',
      effectiveDate: effectiveDateMatch ? effectiveDateMatch[1] : '24/12/2025',
      lastUpdated: lastUpdatedMatch ? lastUpdatedMatch[1] : '24/12/2025',
      content,
    };
  }
}
