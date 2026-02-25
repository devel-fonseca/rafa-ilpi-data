import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

@Injectable()
export class PrivacyPolicyService {
  private readonly policyFileName = 'POLITICA-DE-PRIVACIDADE.md';

  private resolvePolicyPath(): string {
    const candidatePaths = [
      resolve(__dirname, '..', 'assets', 'legal', this.policyFileName),
      resolve(process.cwd(), 'assets', 'legal', this.policyFileName),
      resolve(process.cwd(), 'dist', 'assets', 'legal', this.policyFileName),
      resolve(process.cwd(), 'src', 'assets', 'legal', this.policyFileName),
      resolve(
        process.cwd(),
        'apps',
        'backend',
        'src',
        'assets',
        'legal',
        this.policyFileName,
      ),
    ];

    const policyPath = candidatePaths.find((path) => existsSync(path));
    if (!policyPath) {
      throw new InternalServerErrorException(
        `Arquivo de política de privacidade não encontrado. Caminhos verificados: ${candidatePaths.join(', ')}`,
      );
    }

    return policyPath;
  }

  /**
   * Retorna a Política de Privacidade atual do arquivo Markdown
   */
  async getCurrentPolicy() {
    const content = readFileSync(this.resolvePolicyPath(), 'utf8');

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
