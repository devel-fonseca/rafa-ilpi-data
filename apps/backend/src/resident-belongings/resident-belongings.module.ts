import { Module } from '@nestjs/common';
import { ResidentBelongingsController } from './resident-belongings.controller';
import { ResidentBelongingsService } from './resident-belongings.service';
import { BelongingTermsController } from './belonging-terms.controller';
import { BelongingTermsService } from './belonging-terms.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FilesModule } from '../files/files.module';
import { PermissionsModule } from '../permissions/permissions.module';

/**
 * Módulo de Gestão de Pertences de Residentes
 *
 * Funcionalidades:
 * - CRUD de pertences individuais
 * - Geração de termos (recebimento, atualização, devolução)
 * - Upload de fotos de itens
 * - Upload de termos assinados
 * - Auditoria completa de alterações
 */
@Module({
  imports: [PrismaModule, FilesModule, PermissionsModule],
  controllers: [ResidentBelongingsController, BelongingTermsController],
  providers: [ResidentBelongingsService, BelongingTermsService],
  exports: [ResidentBelongingsService, BelongingTermsService],
})
export class ResidentBelongingsModule {}
