# Catálogo de Módulos (Backend)

Este diretório contém documentação técnica dos módulos do backend em `apps/backend/src`.

## Cobertura

- Módulos backend detectados: **59**
- Documentos de módulo (1:1 com diretórios que possuem `*module.ts`): **59**
- Arquivos Markdown em `docs/modules`: **73** (inclui este índice)
- Lacunas de documentação de módulo: **0**
- Data de sincronização: **22/02/2026**

### Documentos extras (não são módulos Nest diretos)

Estes arquivos complementam fluxos transversais, históricos de implementação ou aliases.

| Documento extra | Classificação | Referência canônica recomendada |
|---|---|---|
| `care-shifts-multi-tenant-compliance` | Deep-dive de arquitetura | `care-shifts` |
| `compliance` | Visão macro/legado | `rdc-indicators`, `sentinel-events`, `compliance-assessments` |
| `compliance-assessment` | Alias legado | `compliance-assessments` |
| `contracts-financial-integration` | Nota de integração | `contracts`, `financial-operations` |
| `documents` | Alias legado | `institutional-profile` |
| `feature-gating` | Transversal (frontend + permissão) | `plans`, `permissions` |
| `features-mapping` | Transversal (frontend) | `plans` |
| `financial-operations-port-plan` | Plano histórico de entrega | `financial-operations` |
| `portal-superadmin` | Alias legado | `superadmin` |
| `schedule` | Alias legado | `resident-schedule`, `care-shifts` |
| `tenant-billing` | Nota de produto/self-service | `plans`, `payments`, `tenant-profile` |
| `tenant-schema-cache` | Alias técnico | `cache`, `prisma` |
| `user-management` | Alias legado | `admin`, `user-profiles`, `permissions` |

## Documentos

- [`admin-dashboard`](./admin-dashboard.md)
- [`admin`](./admin.md)
- [`allergies`](./allergies.md)
- [`audit`](./audit.md)
- [`auth`](./auth.md)
- [`beds`](./beds.md)
- [`buildings`](./buildings.md)
- [`cache`](./cache.md)
- [`care-shifts-multi-tenant-compliance`](./care-shifts-multi-tenant-compliance.md)
- [`care-shifts`](./care-shifts.md)
- [`clinical-notes`](./clinical-notes.md)
- [`clinical-profiles`](./clinical-profiles.md)
- [`compliance-assessment`](./compliance-assessment.md)
- [`compliance-assessments`](./compliance-assessments.md)
- [`compliance`](./compliance.md)
- [`conditions`](./conditions.md)
- [`contracts-financial-integration`](./contracts-financial-integration.md)
- [`contracts`](./contracts.md)
- [`daily-records`](./daily-records.md)
- [`dietary-restrictions`](./dietary-restrictions.md)
- [`documents`](./documents.md)
- [`email-logs`](./email-logs.md)
- [`email-templates`](./email-templates.md)
- [`email`](./email.md)
- [`events`](./events.md)
- [`feature-gating`](./feature-gating.md)
- [`features-mapping`](./features-mapping.md)
- [`files`](./files.md)
- [`financial-operations-port-plan`](./financial-operations-port-plan.md)
- [`financial-operations`](./financial-operations.md)
- [`floors`](./floors.md)
- [`health`](./health.md)
- [`institutional-events`](./institutional-events.md)
- [`institutional-profile`](./institutional-profile.md)
- [`medications`](./medications.md)
- [`messages`](./messages.md)
- [`notifications`](./notifications.md)
- [`payments`](./payments.md)
- [`permissions`](./permissions.md)
- [`plans`](./plans.md)
- [`pops`](./pops.md)
- [`portal-superadmin`](./portal-superadmin.md)
- [`prescriptions`](./prescriptions.md)
- [`prisma`](./prisma.md)
- [`privacy-policy`](./privacy-policy.md)
- [`rdc-indicators`](./rdc-indicators.md)
- [`reports`](./reports.md)
- [`resident-belongings`](./resident-belongings.md)
- [`resident-contracts`](./resident-contracts.md)
- [`resident-documents`](./resident-documents.md)
- [`resident-health`](./resident-health.md)
- [`resident-schedule`](./resident-schedule.md)
- [`residents`](./residents.md)
- [`rooms`](./rooms.md)
- [`schedule`](./schedule.md)
- [`sentinel-events`](./sentinel-events.md)
- [`shift-templates`](./shift-templates.md)
- [`sos-medications`](./sos-medications.md)
- [`superadmin`](./superadmin.md)
- [`teams`](./teams.md)
- [`tenant-billing`](./tenant-billing.md)
- [`tenant-messages`](./tenant-messages.md)
- [`tenant-profile`](./tenant-profile.md)
- [`tenant-schema-cache`](./tenant-schema-cache.md)
- [`tenants`](./tenants.md)
- [`terms-of-service`](./terms-of-service.md)
- [`user-management`](./user-management.md)
- [`user-profiles`](./user-profiles.md)
- [`vaccinations`](./vaccinations.md)
- [`validation`](./validation.md)
- [`vital-sign-alerts`](./vital-sign-alerts.md)
- [`vital-signs`](./vital-signs.md)

## Observações

- A fonte de verdade da implementação é o código em `apps/backend/src/<module>`.
- Quando houver divergência entre texto antigo e implementação atual, prevalece o comportamento do código.
