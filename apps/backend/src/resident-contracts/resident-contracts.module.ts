import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FilesModule } from '../files/files.module';
import { PermissionsModule } from '../permissions/permissions.module';
import {
  ResidentContractsGeneralController,
  ResidentContractsController,
  ResidentContractsPublicController,
} from './resident-contracts.controller';
import { ResidentContractsService } from './resident-contracts.service';

/**
 * Módulo de digitalização de contratos de prestação de serviços
 *
 * Funcionalidades:
 * - Upload e processamento de contratos físicos (imagem → PDF)
 * - Adição de carimbo institucional para autenticação digital
 * - Armazenamento criptografado no MinIO (SSE-C)
 * - Versionamento completo com histórico de alterações
 * - Validação pública de documentos por hash SHA-256
 * - Gestão de metadados (vigência, valores, assinantes)
 *
 * Dependências:
 * - PrismaModule: Acesso ao banco de dados
 * - FilesModule: Upload/download de arquivos no MinIO
 * - PermissionsModule: Sistema de permissões granulares
 *
 * Providers:
 * - ResidentContractsService: Lógica de negócio
 * - FileProcessingService: Processamento de imagens/PDFs
 *
 * Controllers:
 * - ResidentContractsGeneralController: Listagem geral de todos os contratos
 * - ResidentContractsController: Endpoints por residente (auth + permissions)
 * - ResidentContractsPublicController: Endpoint público de validação
 */
@Module({
  imports: [
    PrismaModule,       // Acesso ao banco de dados
    FilesModule,        // Upload/download MinIO
    PermissionsModule,  // Sistema de permissões
  ],
  controllers: [
    ResidentContractsGeneralController, // Listagem geral (GET /resident-contracts)
    ResidentContractsController,        // Endpoints por residente
    ResidentContractsPublicController,  // Endpoint público
  ],
  providers: [
    ResidentContractsService,           // Lógica de negócio
  ],
  exports: [
    ResidentContractsService,           // Exportar para uso em outros módulos (se necessário)
  ],
})
export class ResidentContractsModule {}
