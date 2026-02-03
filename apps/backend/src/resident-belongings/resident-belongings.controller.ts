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
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AuditAction, AuditEntity } from '../audit/audit.decorator';
import { ResidentBelongingsService } from './resident-belongings.service';
import {
  CreateBelongingDto,
  UpdateBelongingDto,
  QueryBelongingDto,
  ChangeStatusDto,
} from './dto';
import { PermissionType } from '@prisma/client';

/**
 * Controlador de pertences de residentes
 *
 * Endpoints protegidos (requerem autenticação e permissões):
 * - POST   /residents/:residentId/belongings - Criar pertence
 * - GET    /residents/:residentId/belongings - Listar pertences
 * - GET    /residents/:residentId/belongings/stats - Estatísticas
 * - GET    /residents/:residentId/belongings/:id - Buscar pertence
 * - GET    /residents/:residentId/belongings/:id/history - Histórico
 * - PATCH  /residents/:residentId/belongings/:id - Atualizar pertence
 * - PATCH  /residents/:residentId/belongings/:id/status - Alterar status
 * - POST   /residents/:residentId/belongings/:id/photo - Upload de foto
 * - DELETE /residents/:residentId/belongings/:id - Deletar pertence
 */
@ApiTags('Resident Belongings')
@ApiBearerAuth()
@Controller('residents/:residentId/belongings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@AuditEntity('RESIDENT_BELONGING')
export class ResidentBelongingsController {
  constructor(private readonly belongingsService: ResidentBelongingsService) {}

  /**
   * Criar novo pertence
   */
  @Post()
  @RequirePermissions(PermissionType.UPDATE_RESIDENTS)
  @AuditAction('CREATE')
  @ApiOperation({
    summary: 'Criar novo pertence',
    description: 'Registra um novo item de pertence para o residente',
  })
  @ApiParam({ name: 'residentId', description: 'ID do residente' })
  @ApiResponse({ status: 201, description: 'Pertence criado com sucesso' })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  async create(
    @Param('residentId') residentId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateBelongingDto,
  ) {
    return this.belongingsService.create(residentId, user.id, dto);
  }

  /**
   * Listar pertences do residente
   */
  @Get()
  @RequirePermissions(PermissionType.VIEW_RESIDENTS)
  @ApiOperation({
    summary: 'Listar pertences do residente',
    description: 'Retorna lista paginada de pertences com filtros',
  })
  @ApiParam({ name: 'residentId', description: 'ID do residente' })
  @ApiResponse({ status: 200, description: 'Lista de pertences' })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  async findAll(
    @Param('residentId') residentId: string,
    @Query() query: QueryBelongingDto,
  ) {
    return this.belongingsService.findAll(residentId, query);
  }

  /**
   * Estatísticas de pertences
   */
  @Get('stats')
  @RequirePermissions(PermissionType.VIEW_RESIDENTS)
  @ApiOperation({
    summary: 'Estatísticas de pertences',
    description: 'Retorna contagem por categoria, status e totais',
  })
  @ApiParam({ name: 'residentId', description: 'ID do residente' })
  @ApiResponse({ status: 200, description: 'Estatísticas retornadas' })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  async getStats(@Param('residentId') residentId: string) {
    return this.belongingsService.getStats(residentId);
  }

  /**
   * Buscar pertence por ID
   */
  @Get(':id')
  @RequirePermissions(PermissionType.VIEW_RESIDENTS)
  @ApiOperation({
    summary: 'Buscar pertence por ID',
    description: 'Retorna detalhes completos do pertence',
  })
  @ApiParam({ name: 'residentId', description: 'ID do residente' })
  @ApiParam({ name: 'id', description: 'ID do pertence' })
  @ApiResponse({ status: 200, description: 'Pertence encontrado' })
  @ApiResponse({ status: 404, description: 'Pertence não encontrado' })
  async findOne(@Param('id') id: string) {
    return this.belongingsService.findOne(id);
  }

  /**
   * Histórico de alterações do pertence
   */
  @Get(':id/history')
  @RequirePermissions(PermissionType.VIEW_RESIDENTS)
  @ApiOperation({
    summary: 'Histórico do pertence',
    description: 'Retorna todas as alterações realizadas no pertence',
  })
  @ApiParam({ name: 'residentId', description: 'ID do residente' })
  @ApiParam({ name: 'id', description: 'ID do pertence' })
  @ApiResponse({ status: 200, description: 'Histórico retornado' })
  @ApiResponse({ status: 404, description: 'Pertence não encontrado' })
  async findHistory(@Param('id') id: string) {
    return this.belongingsService.findHistory(id);
  }

  /**
   * Atualizar pertence
   */
  @Patch(':id')
  @RequirePermissions(PermissionType.UPDATE_RESIDENTS)
  @AuditAction('UPDATE')
  @ApiOperation({
    summary: 'Atualizar pertence',
    description: 'Atualiza dados do pertence (requer motivo da alteração)',
  })
  @ApiParam({ name: 'residentId', description: 'ID do residente' })
  @ApiParam({ name: 'id', description: 'ID do pertence' })
  @ApiResponse({ status: 200, description: 'Pertence atualizado' })
  @ApiResponse({ status: 400, description: 'Pertence não está em guarda' })
  @ApiResponse({ status: 404, description: 'Pertence não encontrado' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateBelongingDto,
  ) {
    return this.belongingsService.update(id, user.id, dto);
  }

  /**
   * Alterar status do pertence
   */
  @Patch(':id/status')
  @RequirePermissions(PermissionType.UPDATE_RESIDENTS)
  @AuditAction('STATUS_CHANGE')
  @ApiOperation({
    summary: 'Alterar status do pertence',
    description: 'Muda status para DEVOLVIDO, EXTRAVIADO ou DESCARTADO',
  })
  @ApiParam({ name: 'residentId', description: 'ID do residente' })
  @ApiParam({ name: 'id', description: 'ID do pertence' })
  @ApiResponse({ status: 200, description: 'Status alterado' })
  @ApiResponse({ status: 400, description: 'Alteração de status inválida' })
  @ApiResponse({ status: 404, description: 'Pertence não encontrado' })
  async changeStatus(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangeStatusDto,
  ) {
    return this.belongingsService.changeStatus(id, user.id, dto);
  }

  /**
   * Upload de foto do pertence
   */
  @Post(':id/photo')
  @RequirePermissions(PermissionType.UPDATE_RESIDENTS)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @AuditAction('PHOTO_UPLOAD')
  @ApiOperation({
    summary: 'Upload de foto do pertence',
    description: 'Faz upload de uma foto do item (substitui anterior se existir)',
  })
  @ApiParam({ name: 'residentId', description: 'ID do residente' })
  @ApiParam({ name: 'id', description: 'ID do pertence' })
  @ApiResponse({ status: 201, description: 'Foto enviada com sucesso' })
  @ApiResponse({ status: 404, description: 'Pertence não encontrado' })
  async uploadPhoto(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ })
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 }) // 5MB
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
  ) {
    return this.belongingsService.uploadPhoto(id, user.id, file);
  }

  /**
   * Deletar pertence (soft delete)
   */
  @Delete(':id')
  @RequirePermissions(PermissionType.UPDATE_RESIDENTS)
  @HttpCode(HttpStatus.OK)
  @AuditAction('DELETE')
  @ApiOperation({
    summary: 'Deletar pertence',
    description: 'Soft delete: marca como deletado mantendo histórico',
  })
  @ApiParam({ name: 'residentId', description: 'ID do residente' })
  @ApiParam({ name: 'id', description: 'ID do pertence' })
  @ApiResponse({ status: 200, description: 'Pertence deletado' })
  @ApiResponse({ status: 404, description: 'Pertence não encontrado' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.belongingsService.delete(id, user.id);
  }
}
