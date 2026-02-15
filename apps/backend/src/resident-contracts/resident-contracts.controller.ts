import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AuditAction, AuditEntity } from '../audit/audit.decorator';
import { ResidentContractsService } from './resident-contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { ReplaceContractFileDto } from './dto/replace-contract-file.dto';
import { ContractDocumentStatus, PermissionType } from '@prisma/client';
import { parseISO } from 'date-fns';
import { FeatureGuard } from '../common/guards/feature.guard';
import { RequireFeatures } from '../common/decorators/require-features.decorator';

/**
 * Controlador geral de contratos (multi-residente)
 *
 * Endpoints para listagem agregada de todos os contratos do tenant
 */
@ApiTags('Resident Contracts')
@ApiBearerAuth()
@Controller('resident-contracts')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeatures('contratos')
@AuditEntity('RESIDENT_CONTRACT')
export class ResidentContractsGeneralController {
  constructor(private readonly contractsService: ResidentContractsService) {}

  /**
   * Listar todos os contratos do tenant com filtros
   *
   * Suporta filtros:
   * - residentId: filtrar por residente específico
   * - status: VIGENTE, VENCENDO_EM_30_DIAS, VENCIDO
   * - search: busca por nome do residente ou número do contrato
   */
  @Get()
  @RequirePermissions(PermissionType.VIEW_CONTRACTS)
  @ApiOperation({
    summary: 'Listar todos os contratos do tenant',
    description: 'Retorna todos os contratos com filtros opcionais (residente, status, busca)',
  })
  @ApiQuery({
    name: 'residentId',
    required: false,
    type: String,
    description: 'Filtrar por residente específico',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ContractDocumentStatus,
    description: 'Filtrar por status do contrato',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Buscar por nome do residente ou número do contrato',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de contratos retornada com sucesso',
  })
  async listAll(
    @Query('residentId') residentId?: string,
    @Query('status') status?: ContractDocumentStatus,
    @Query('search') search?: string,
  ) {
    return this.contractsService.listAllContracts({
      residentId,
      status,
      search,
    });
  }
}

/**
 * Controlador de contratos de prestação de serviços (por residente)
 *
 * Endpoints protegidos (requerem autenticação e permissões):
 * - POST   /residents/:residentId/contracts - Upload de contrato
 * - GET    /residents/:residentId/contracts - Listar contratos
 * - GET    /residents/:residentId/contracts/:id - Buscar contrato
 * - GET    /residents/:residentId/contracts/:id/history - Histórico
 * - PATCH  /residents/:residentId/contracts/:id - Atualizar metadados
 * - POST   /residents/:residentId/contracts/:id/file - Substituir arquivo
 * - DELETE /residents/:residentId/contracts/:id - Deletar
 */
@ApiTags('Resident Contracts')
@ApiBearerAuth()
@Controller('residents/:residentId/contracts')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeatures('contratos')
@AuditEntity('RESIDENT_CONTRACT')
export class ResidentContractsController {
  constructor(private readonly contractsService: ResidentContractsService) {}

  /**
   * Upload e digitalização de contrato físico
   *
   * Recebe imagem ou PDF e processa:
   * - Adiciona carimbo institucional
   * - Calcula hashes SHA-256
   * - Armazena original + processado no MinIO
   * - Cria registro com metadados
   */
  @Post()
  @RequirePermissions(PermissionType.CREATE_CONTRACTS)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @AuditAction('CREATE')
  @ApiOperation({
    summary: 'Upload de contrato físico',
    description:
      'Digitaliza contrato físico (imagem ou PDF), adiciona carimbo institucional e armazena com metadados',
  })
  @ApiResponse({
    status: 201,
    description: 'Contrato digitalizado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Arquivo inválido ou dados incompletos',
  })
  @ApiResponse({
    status: 404,
    description: 'Residente não encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'Número de contrato já existe',
  })
  async uploadContract(
    @Param('residentId') residentId: string,
    @CurrentUser() user: JwtPayload,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /(jpg|jpeg|png|webp|pdf)$/ })
        .addMaxSizeValidator({ maxSize: 10 * 1024 * 1024 }) // 10MB
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          fileIsRequired: false,
        }),
    )
    file: Express.Multer.File | undefined,
    @Body() dto: CreateContractDto,
  ) {
    return this.contractsService.uploadContract(
      residentId,
      user.id,
      file,
      dto,
    );
  }

  /**
   * Listar contratos de um residente
   *
   * Suporta filtros:
   * - status: VIGENTE, VENCENDO_EM_30_DIAS, VENCIDO
   * - startDate: data de início (>=)
   * - endDate: data de fim (<=)
   */
  @Get()
  @RequirePermissions(PermissionType.VIEW_CONTRACTS)
  @ApiOperation({
    summary: 'Listar contratos de um residente',
    description: 'Retorna todos os contratos do residente com filtros opcionais',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ContractDocumentStatus,
    description: 'Filtrar por status do contrato',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Filtrar por data de início (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Filtrar por data de fim (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de contratos retornada com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Residente não encontrado',
  })
  async findAll(
    @Param('residentId') residentId: string,
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: ContractDocumentStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: Record<string, unknown> = {};

    if (status) {
      filters.status = status;
    }

    if (startDate) {
      filters.startDate = parseISO(`${startDate}T12:00:00.000`);
    }

    if (endDate) {
      filters.endDate = parseISO(`${endDate}T12:00:00.000`);
    }

    return this.contractsService.findAll(residentId, filters);
  }

  /**
   * Buscar um contrato específico
   *
   * Retorna contrato completo com:
   * - Metadados
   * - URLs assinadas (original + processado)
   * - Dados do residente e uploader
   */
  @Get(':id')
  @RequirePermissions(PermissionType.VIEW_CONTRACTS)
  @ApiOperation({
    summary: 'Buscar contrato por ID',
    description: 'Retorna contrato completo com URLs assinadas para download',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do contrato',
  })
  @ApiResponse({
    status: 200,
    description: 'Contrato retornado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Contrato não encontrado',
  })
  async findOne(
    @Param('id') contractId: string,
  ) {
    return this.contractsService.findOne(contractId);
  }

  /**
   * Buscar histórico de alterações de um contrato
   *
   * Retorna:
   * - Todas as ações (CREATED, UPDATED, REPLACED, DELETED)
   * - Snapshots de previousData e newData
   * - Campos alterados
   * - Usuário responsável
   */
  @Get(':id/history')
  @RequirePermissions(PermissionType.VIEW_CONTRACTS)
  @ApiOperation({
    summary: 'Buscar histórico de alterações',
    description:
      'Retorna todas as ações realizadas no contrato com snapshots completos',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do contrato',
  })
  @ApiResponse({
    status: 200,
    description: 'Histórico retornado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Contrato não encontrado',
  })
  async findHistory(
    @Param('id') contractId: string,
  ) {
    return this.contractsService.findHistory(contractId);
  }

  /**
   * Atualizar metadados do contrato
   *
   * Permite atualizar:
   * - Datas de vigência (startDate, endDate)
   * - Valor da mensalidade (monthlyAmount)
   * - Dia de vencimento (dueDay)
   * - Campos de reajuste (adjustmentIndex, adjustmentRate, lastAdjustmentDate)
   * - Observações (notes)
   *
   * NÃO permite atualizar:
   * - Assinantes (imutável)
   * - Arquivos (usar POST /file)
   */
  @Patch(':id')
  @RequirePermissions(PermissionType.UPDATE_CONTRACTS)
  @AuditAction('UPDATE')
  @ApiOperation({
    summary: 'Atualizar metadados do contrato',
    description:
      'Atualiza datas, valores e observações. Assinantes e arquivos são imutáveis.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do contrato',
  })
  @ApiResponse({
    status: 200,
    description: 'Contrato atualizado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Contrato não encontrado',
  })
  async updateMetadata(
    @Param('id') contractId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateContractDto,
  ) {
    return this.contractsService.updateMetadata(
      contractId,
      user.id,
      dto,
    );
  }

  /**
   * Substituir arquivo do contrato (nova versão)
   *
   * Cria nova versão:
   * - Incrementa campo version
   * - Marca contrato anterior como substituído (replacedById)
   * - Processa novo arquivo com carimbo
   * - Mantém histórico completo
   *
   * Requer motivo da substituição (mínimo 10 caracteres)
   */
  @Post(':id/file')
  @RequirePermissions(PermissionType.REPLACE_CONTRACTS)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @AuditAction('REPLACE')
  @ApiOperation({
    summary: 'Substituir arquivo do contrato',
    description:
      'Cria nova versão do contrato com novo arquivo. Requer motivo da substituição.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do contrato a substituir',
  })
  @ApiResponse({
    status: 201,
    description: 'Nova versão criada com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Contrato já foi substituído ou arquivo inválido',
  })
  @ApiResponse({
    status: 404,
    description: 'Contrato não encontrado',
  })
  async replaceFile(
    @Param('id') contractId: string,
    @CurrentUser() user: JwtPayload,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /(jpg|jpeg|png|webp|pdf)$/ })
        .addMaxSizeValidator({ maxSize: 10 * 1024 * 1024 }) // 10MB
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
    @Body() dto: ReplaceContractFileDto,
  ) {
    return this.contractsService.replaceFile(
      contractId,
      user.id,
      file,
      dto,
    );
  }

  /**
   * Deletar contrato (soft delete)
   *
   * Marca registro como deletado (deletedAt)
   * Arquivos permanecem no MinIO para auditoria
   * Cria registro no histórico (action: DELETED)
   */
  @Delete(':id')
  @RequirePermissions(PermissionType.DELETE_CONTRACTS)
  @HttpCode(HttpStatus.OK)
  @AuditAction('DELETE')
  @ApiOperation({
    summary: 'Deletar contrato',
    description:
      'Soft delete: marca como deletado mas mantém arquivos no MinIO para auditoria',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do contrato',
  })
  @ApiResponse({
    status: 200,
    description: 'Contrato deletado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Contrato não encontrado',
  })
  async deleteContract(
    @Param('id') contractId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.contractsService.deleteContract(contractId, user.id);
  }
}

/**
 * Controlador público para validação de contratos
 *
 * Endpoint público (sem autenticação):
 * - GET /contracts/validate/:publicToken?hash=... - Validar autenticidade por hash
 *
 * IMPORTANTE: Usa publicToken ao invés de ID interno para segurança
 */
@ApiTags('Contracts Validation')
@Controller('contracts')
export class ResidentContractsPublicController {
  constructor(private readonly contractsService: ResidentContractsService) {}

  /**
   * Validar autenticidade de contrato por hash SHA-256
   *
   * Endpoint público para validar PDFs baixados
   * Compara hash fornecido com hash armazenado no banco
   *
   * Retorna:
   * - valid: true/false
   * - message: descrição do resultado
   * - data: metadados públicos (se válido)
   *
   * NÃO retorna dados sensíveis (valores, observações, etc.)
   */
  @Get('validate/:publicToken')
  @ApiOperation({
    summary: 'Validar autenticidade de contrato',
    description:
      'Endpoint público para validar PDFs baixados comparando hash SHA-256. Usa token público (não expõe IDs internos).',
  })
  @ApiParam({
    name: 'publicToken',
    description: 'Token público do contrato (encontrado no carimbo institucional)',
    example: '3b6f4e5d-079b-4f46-aac1-e15a480a9891',
  })
  @ApiQuery({
    name: 'hash',
    description: 'Hash SHA-256 do PDF processado (64 caracteres hexadecimais)',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Validação realizada',
    schema: {
      oneOf: [
        {
          type: 'object',
          properties: {
            valid: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Documento autêntico' },
            data: {
              type: 'object',
              properties: {
                contractNumber: { type: 'string' },
                tenantName: { type: 'string' },
                tenantCnpj: { type: 'string' },
                residentName: { type: 'string' },
                startDate: { type: 'string', format: 'date' },
                endDate: { type: 'string', format: 'date' },
                status: { type: 'string' },
                version: { type: 'number' },
                issuedAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        {
          type: 'object',
          properties: {
            valid: { type: 'boolean', example: false },
            message: {
              type: 'string',
              example: 'Hash não corresponde. Documento pode ter sido alterado.',
            },
          },
        },
      ],
    },
  })
  async validateContract(
    @Param('publicToken') publicToken: string,
    @Query('hash') hash: string,
  ) {
    return this.contractsService.validateContract(publicToken, hash);
  }
}
