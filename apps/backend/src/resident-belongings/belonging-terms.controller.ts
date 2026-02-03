import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AuditAction, AuditEntity } from '../audit/audit.decorator';
import { BelongingTermsService } from './belonging-terms.service';
import { CreateTermDto } from './dto';
import { BelongingTermType, BelongingTermStatus, PermissionType } from '@prisma/client';

/**
 * Controlador de termos de pertences
 *
 * Endpoints protegidos (requerem autenticação e permissões):
 * - POST   /residents/:residentId/belonging-terms/generate - Gerar termo
 * - GET    /residents/:residentId/belonging-terms - Listar termos
 * - GET    /residents/:residentId/belonging-terms/:id - Buscar termo
 * - GET    /residents/:residentId/belonging-terms/:id/print - Dados para impressão
 * - POST   /residents/:residentId/belonging-terms/:id/upload-signed - Upload assinado
 * - POST   /residents/:residentId/belonging-terms/:id/cancel - Cancelar termo
 */
@ApiTags('Belonging Terms')
@ApiBearerAuth()
@Controller('residents/:residentId/belonging-terms')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@AuditEntity('BELONGING_TERM')
export class BelongingTermsController {
  constructor(private readonly termsService: BelongingTermsService) {}

  /**
   * Gerar novo termo
   */
  @Post('generate')
  @RequirePermissions(PermissionType.UPDATE_RESIDENTS)
  @AuditAction('CREATE')
  @ApiOperation({
    summary: 'Gerar novo termo de pertences',
    description: 'Cria termo de recebimento, atualização ou devolução com snapshot dos itens',
  })
  @ApiParam({ name: 'residentId', description: 'ID do residente' })
  @ApiResponse({ status: 201, description: 'Termo gerado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  async generate(
    @Param('residentId') residentId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTermDto,
  ) {
    return this.termsService.generate(residentId, user.id, dto);
  }

  /**
   * Listar termos do residente
   */
  @Get()
  @RequirePermissions(PermissionType.VIEW_RESIDENTS)
  @ApiOperation({
    summary: 'Listar termos do residente',
    description: 'Retorna lista de termos com filtros por tipo e status',
  })
  @ApiParam({ name: 'residentId', description: 'ID do residente' })
  @ApiQuery({ name: 'type', required: false, enum: BelongingTermType })
  @ApiQuery({ name: 'status', required: false, enum: BelongingTermStatus })
  @ApiResponse({ status: 200, description: 'Lista de termos' })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  async findAll(
    @Param('residentId') residentId: string,
    @Query('type') type?: BelongingTermType,
    @Query('status') status?: BelongingTermStatus,
  ) {
    return this.termsService.findAll(residentId, { type, status });
  }

  /**
   * Buscar termo por ID
   */
  @Get(':id')
  @RequirePermissions(PermissionType.VIEW_RESIDENTS)
  @ApiOperation({
    summary: 'Buscar termo por ID',
    description: 'Retorna termo completo com itens e snapshots',
  })
  @ApiParam({ name: 'residentId', description: 'ID do residente' })
  @ApiParam({ name: 'id', description: 'ID do termo' })
  @ApiResponse({ status: 200, description: 'Termo encontrado' })
  @ApiResponse({ status: 404, description: 'Termo não encontrado' })
  async findOne(@Param('id') id: string) {
    return this.termsService.findOne(id);
  }

  /**
   * Dados para impressão/PDF
   */
  @Get(':id/print')
  @RequirePermissions(PermissionType.VIEW_RESIDENTS)
  @ApiOperation({
    summary: 'Dados para impressão do termo',
    description: 'Retorna dados formatados para geração de PDF do termo',
  })
  @ApiParam({ name: 'residentId', description: 'ID do residente' })
  @ApiParam({ name: 'id', description: 'ID do termo' })
  @ApiResponse({ status: 200, description: 'Dados para impressão' })
  @ApiResponse({ status: 404, description: 'Termo não encontrado' })
  async getPrintData(@Param('id') id: string) {
    return this.termsService.getPrintData(id);
  }

  /**
   * Upload de termo assinado
   */
  @Post(':id/upload-signed')
  @RequirePermissions(PermissionType.UPDATE_RESIDENTS)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @AuditAction('SIGN')
  @ApiOperation({
    summary: 'Upload de termo assinado',
    description: 'Faz upload do PDF do termo com assinaturas e marca como assinado',
  })
  @ApiParam({ name: 'residentId', description: 'ID do residente' })
  @ApiParam({ name: 'id', description: 'ID do termo' })
  @ApiResponse({ status: 201, description: 'Termo assinado enviado' })
  @ApiResponse({ status: 404, description: 'Termo não encontrado' })
  async uploadSigned(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /(pdf)$/ })
        .addMaxSizeValidator({ maxSize: 10 * 1024 * 1024 }) // 10MB
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
  ) {
    return this.termsService.uploadSigned(id, user.id, file);
  }

  /**
   * Cancelar termo
   */
  @Post(':id/cancel')
  @RequirePermissions(PermissionType.UPDATE_RESIDENTS)
  @AuditAction('CANCEL')
  @ApiOperation({
    summary: 'Cancelar termo',
    description: 'Cancela termo não assinado (requer motivo)',
  })
  @ApiParam({ name: 'residentId', description: 'ID do residente' })
  @ApiParam({ name: 'id', description: 'ID do termo' })
  @ApiResponse({ status: 200, description: 'Termo cancelado' })
  @ApiResponse({ status: 400, description: 'Termo já assinado' })
  @ApiResponse({ status: 404, description: 'Termo não encontrado' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body('reason') reason: string,
  ) {
    return this.termsService.cancel(id, user.id, reason);
  }
}
