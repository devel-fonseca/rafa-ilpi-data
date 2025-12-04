import { Module } from '@nestjs/common'
import { ClinicalNotesService } from './clinical-notes.service'
import { ClinicalNotesController } from './clinical-notes.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { PermissionsModule } from '../permissions/permissions.module'

/**
 * Módulo de Evoluções Clínicas Multiprofissionais (SOAP)
 *
 * Fornece funcionalidades para:
 * - Criação de evoluções clínicas usando metodologia SOAP
 * - Versionamento automático de alterações
 * - Histórico completo de audit trail
 * - Filtros por profissão, período e tags
 * - Soft delete com motivo obrigatório
 * - Janela de edição de 12 horas (apenas autor pode editar)
 *
 * Permissões necessárias:
 * - VIEW_CLINICAL_NOTES - Visualizar evoluções
 * - CREATE_CLINICAL_NOTES - Criar evoluções
 * - UPDATE_CLINICAL_NOTES - Atualizar evoluções (+ restrições de autoria)
 * - DELETE_CLINICAL_NOTES - Excluir evoluções (soft delete)
 */
@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [ClinicalNotesController],
  providers: [ClinicalNotesService],
  exports: [ClinicalNotesService],
})
export class ClinicalNotesModule {}
