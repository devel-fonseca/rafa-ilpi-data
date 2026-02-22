# Documentação Técnica - Rafa ILPI Data

**Versão do Projeto:** 1.0.0  
**Última atualização:** 22/02/2026

Documentação técnica central do sistema Rafa ILPI Data (ILPI), com foco em backend modular, multi-tenant e padrões operacionais.

## Índice Rápido

### Catálogo de módulos

- Catálogo técnico completo dos módulos backend: [modules/README.md](modules/README.md)

Cobertura atual (sincronização 22/02/2026):

- **59 módulos NestJS** detectados em `apps/backend/src` (diretórios com `*module.ts`)
- **59 documentos de módulo** correspondentes em `docs/modules`
- **14 documentos extras** em `docs/modules` para fluxos transversais, port plans e aliases históricos
  - sendo **13 documentos temáticos** + `docs/modules/README.md` (índice)
  - classificação e referência canônica em `docs/modules/README.md` (seção "Documentos extras")

### Arquitetura

- Multi-tenancy: [architecture/multi-tenancy.md](architecture/multi-tenancy.md)
- Storage de arquivos: [architecture/file-storage.md](architecture/file-storage.md)
- Schema do banco: [architecture/database-schema.md](architecture/database-schema.md)
- Autenticação: [architecture/authentication.md](architecture/authentication.md)

### Padrões e normas

- Padrão de data/hora: [standards/DATETIME_STANDARD.md](standards/DATETIME_STANDARD.md)

### Operação e fluxos

- Runbook backup/restore superadmin: [flows/SUPERADMIN-BACKUP-RESTORE-RUNBOOK.md](flows/SUPERADMIN-BACKUP-RESTORE-RUNBOOK.md)
- Changelog: [../CHANGELOG.md](../CHANGELOG.md)
- TODO técnico: [../TODO.md](../TODO.md)

## Como navegar

1. Para entender o sistema por domínio, comece por `docs/modules/README.md`.
2. Para decisões estruturais, use primeiro `docs/architecture/*`.
3. Para regras sensíveis (tempo, multi-tenant, auditoria), siga os padrões em `docs/standards/*`.
4. Para comportamento detalhado, prevalece sempre o código fonte em `apps/backend/src`.

## Regras de manutenção da documentação

- Ao alterar módulo backend, atualizar o arquivo correspondente em `docs/modules/<modulo>.md`.
- Ao criar módulo novo (`*module.ts`), criar documentação de módulo no mesmo ciclo.
- Quando houver divergência entre documento antigo e implementação atual, considerar o código como fonte de verdade e ajustar a documentação.

## Licença

Propriedade de Rafa Labs Desenvolvimento e Tecnologia.
