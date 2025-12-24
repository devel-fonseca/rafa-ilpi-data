import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class PrivacyPolicyService {
  /**
   * Retorna a Política de Privacidade atual do arquivo Markdown
   */
  async getCurrentPolicy() {
    const policyPath = join(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      'docs',
      'POLITICA-DE-PRIVACIDADE.md',
    );

    const content = readFileSync(policyPath, 'utf8');

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
