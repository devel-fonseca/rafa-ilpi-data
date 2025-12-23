# Documentação Técnica - Rafa ILPI Data

**Versão do Projeto:** 1.0.0
**Última atualização:** 23/12/2025

Bem-vindo à documentação técnica completa do sistema Rafa ILPI Data - plataforma de gestão para Instituições de Longa Permanência para Idosos (ILPIs).

---

## 📚 Índice Geral

### 📋 Módulos Funcionais

Documentação detalhada de cada módulo do sistema:

| Módulo | Status | Versão | Descrição |
|--------|--------|--------|-----------|
| [Registros Diários](modules/daily-records.md) | ✅ | 1.0.0 | Sistema completo com 10 tipos de registros, versionamento e auditoria |
| [Agenda do Residente](modules/resident-schedule.md) | ✅ | 1.0.0 | Registros obrigatórios recorrentes e agendamentos pontuais |
| [POPs](modules/pops.md) | ✅ | 1.1.0 | Procedimentos Operacionais Padrão com categorias editáveis |
| [Documentos Institucionais](modules/documents.md) | ✅ | 2.0.0 | Upload S3, versionamento e alertas configuráveis |
| [Evoluções Clínicas](modules/clinical-notes.md) | ✅ | 1.1.0 | SOAP + Documentos Tiptap com PDF |
| [Notificações](modules/notifications.md) | ✅ | 1.0.0 | Sistema completo com cron job automático |
| [Permissões RBAC](modules/permissions.md) | ✅ | 1.0.0 | 45 permissões por cargo |
| [Prescrições Médicas](modules/prescriptions.md) | ✅ | 1.0.0 | Gerenciamento de prescrições |
| [Vacinação](modules/vaccinations.md) | ✅ | 1.0.0 | Registro com upload de comprovantes |
| [Residentes](modules/residents.md) | ✅ | 1.0.0 | Cadastro completo com prontuário |
| [Sinais Vitais](modules/vital-signs.md) | ✅ | 1.0.0 | PA, FC, Temp, SpO2, Glicemia |
| [Portal SuperAdmin](modules/portal-superadmin.md) | ✅ | 1.0.0 | Gestão de tenants, planos, faturas e analytics |
| [Mapeamento de Features](modules/features-mapping.md) | ✅ | 1.0.0 | Sistema centralizado de features com mapeamento bidirecional |

### 🏗️ Arquitetura

Documentação de arquitetura e infraestrutura:

| Tópico | Arquivo |
|--------|---------|
| **Multi-Tenancy** | [multi-tenancy.md](architecture/multi-tenancy.md) |
| **Storage de Arquivos** | [file-storage.md](architecture/file-storage.md) |
| **Schema do Banco** | [database-schema.md](architecture/database-schema.md) |
| **Autenticação** | [authentication.md](architecture/authentication.md) |

### 📝 Outros Documentos

| Documento | Descrição |
|-----------|-----------|
| [CHANGELOG.md](../CHANGELOG.md) | Histórico cronológico de todas as mudanças |
| [TODO.md](../TODO.md) | Tarefas ativas e pendentes |
| [CLINICAL-NOTE-DOCUMENTS.md](CLINICAL-NOTE-DOCUMENTS.md) | Documentação detalhada dos documentos Tiptap |

---

## 🚀 Início Rápido

### Para Desenvolvedores

1. **Explorar a arquitetura:**
   - Comece por [Multi-Tenancy](architecture/multi-tenancy.md)
   - Depois [Schema do Banco](architecture/database-schema.md)
   - Por fim [Autenticação](architecture/authentication.md)

2. **Entender um módulo específico:**
   - Escolha o módulo na tabela acima
   - Leia a documentação completa
   - Veja exemplos no [CHANGELOG](../CHANGELOG.md)

3. **Implementar nova feature:**
   - Consulte módulos similares
   - Siga os padrões estabelecidos
   - Atualize o CHANGELOG ao finalizar

### Para Product Owners

- **Visão geral das features:** Veja a tabela de módulos acima
- **Roadmap:** Consulte [TODO.md](../TODO.md)
- **Histórico de entregas:** Veja [CHANGELOG.md](../CHANGELOG.md)

---

## 🔍 Busca Rápida

### Por Funcionalidade

- **Registros de Cuidados Diários:** [daily-records.md](modules/daily-records.md)
- **Documentos PDF:** [documents.md](modules/documents.md) | [clinical-notes.md](modules/clinical-notes.md)
- **Prontuário Médico:** [residents.md](modules/residents.md) | [vital-signs.md](modules/vital-signs.md)
- **Gestão Institucional:** [pops.md](modules/pops.md) | [documents.md](modules/documents.md)
- **Alertas e Notificações:** [notifications.md](modules/notifications.md)

### Por Tecnologia

- **Prisma/PostgreSQL:** [database-schema.md](architecture/database-schema.md)
- **MinIO/S3:** [file-storage.md](architecture/file-storage.md)
- **JWT/Auth:** [authentication.md](architecture/authentication.md)
- **Tiptap/PDF:** [clinical-notes.md](modules/clinical-notes.md)

---

## 📊 Estatísticas do Projeto

### Módulos Implementados

- ✅ **13 módulos** principais completamente funcionais
- ✅ **25+ features** documentadas no CHANGELOG
- ✅ **3.048 linhas** de histórico de implementação (agora organizado)
- ✅ **50+ arquivos** de documentação técnica

### Stack Tecnológico

**Backend:**
- NestJS 10
- Prisma ORM 5.22
- PostgreSQL 14+
- MinIO (S3-compatible)

**Frontend:**
- React 18
- TanStack Query
- Tailwind CSS
- shadcn/ui

---

## 🤝 Contribuindo

### Fluxo de Documentação

1. **Durante desenvolvimento:**
   - Use `TodoWrite` para tracking
   - Não edite Markdown durante implementação

2. **Ao completar feature:**
   - Adicione entrada no [CHANGELOG.md](../CHANGELOG.md)
   - Se feature grande: crie/atualize doc em `docs/modules/`
   - Atualize `docs/README.md` se necessário

3. **Ao final da sessão:**
   - Limpe [TODO.md](../TODO.md) (remova concluídos)
   - Adicione novos TODOs identificados

### Padrão de Documentação

Cada módulo deve seguir a estrutura:

```markdown
# Módulo: [Nome]

## Visão Geral
## Funcionalidades Principais
## Arquitetura
## Modelos de Dados
## Endpoints da API
## Regras de Negócio
## Referências
```

---

## 📞 Suporte

- **Issues:** [GitHub Issues](https://github.com/rafa-labs/rafa-ilpi-data/issues)
- **Documentação:** Este diretório (`docs/`)
- **Histórico:** [CHANGELOG.md](../CHANGELOG.md)

---

## 📜 Licença

Propriedade de Rafa Labs Desenvolvimento e Tecnologia.

---

**Desenvolvedor:** Emanuel (Dr. E.) + Claude Sonnet 4.5
**Última revisão:** 23/12/2025
