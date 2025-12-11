import { Module } from '@nestjs/common'
import { PopsController } from './pops.controller'
import { PopsService } from './pops.service'
import { PrismaModule } from '../prisma/prisma.module'
import { FilesModule } from '../files/files.module'
import { PermissionsModule } from '../permissions/permissions.module'

/**
 * Módulo de POPs (Procedimentos Operacionais Padrão)
 *
 * Funcionalidades:
 * - Gestão completa de POPs com versionamento
 * - Workflow: DRAFT → PUBLISHED → OBSOLETE
 * - Sistema de revisão periódica
 * - Anexos e histórico auditável
 * - 28 templates baseados em RDC 502/2021
 */
@Module({
  imports: [PrismaModule, FilesModule, PermissionsModule],
  controllers: [PopsController],
  providers: [PopsService],
  exports: [PopsService],
})
export class PopsModule {}
