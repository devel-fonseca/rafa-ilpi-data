import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TermsOfServiceService } from './terms-of-service.service';
import { CreateTermsOfServiceDto } from './dto/create-terms-of-service.dto';
import { UpdateTermsOfServiceDto } from './dto/update-terms-of-service.dto';
import { PublishTermsOfServiceDto } from './dto/publish-terms-of-service.dto';
import { PrepareTermsAcceptanceDto, RenderTermsOfServiceDto } from './dto/accept-terms-of-service.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../superadmin/guards/superadmin.guard';
import { ReauthenticationGuard } from '../auth/guards/reauthentication.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { RequiresReauthentication } from '../auth/decorators/requires-reauthentication.decorator';
import { ContractStatus } from '@prisma/client';

@ApiTags('Terms of Service')
@Controller('terms-of-service')
export class TermsOfServiceController {
  constructor(private readonly termsOfServiceService: TermsOfServiceService) {}

  // ──────────────────────────────────────────────────────────────────────────
  // ROTAS PÚBLICAS (sem autenticação) - Usadas no registro
  // ──────────────────────────────────────────────────────────────────────────

  @Public()
  @Get('active')
  @ApiOperation({ summary: 'Buscar termo de uso ACTIVE para um plano (público)' })
  @ApiResponse({ status: 200, description: 'Termo de uso encontrado' })
  @ApiResponse({ status: 404, description: 'Nenhum termo de uso ativo disponível' })
  async getActiveTerms(@Query('planId') planId?: string) {
    return this.termsOfServiceService.getActiveTermsForPlan(planId);
  }

  @Public()
  @Post('render')
  @ApiOperation({ summary: 'Renderizar termo de uso com variáveis (público)' })
  @ApiResponse({ status: 200, description: 'Termo de uso renderizado' })
  async renderTerms(@Body() dto: RenderTermsOfServiceDto) {
    return this.termsOfServiceService.renderTerms(dto.termsId, dto.variables);
  }

  @Public()
  @Post('accept/prepare')
  @ApiOperation({
    summary:
      'Preparar token de aceite do termo de uso (usado no step 4 do registro)',
  })
  @ApiResponse({ status: 200, description: 'Token gerado com sucesso' })
  async prepareAcceptance(@Body() dto: PrepareTermsAcceptanceDto) {
    return this.termsOfServiceService.prepareAcceptance(dto);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ROTAS SUPERADMIN - Gestão de Termos de Uso
  // ──────────────────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Criar termo de uso DRAFT (SuperAdmin)' })
  @ApiResponse({ status: 201, description: 'Termo de uso criado' })
  async create(
    @Body() dto: CreateTermsOfServiceDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.termsOfServiceService.create(dto, user.sub);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Listar termos de uso com filtros (SuperAdmin)' })
  @ApiResponse({ status: 200, description: 'Lista de termos de uso' })
  async findAll(
    @Query('status') status?: ContractStatus,
    @Query('planId') planId?: string,
  ) {
    return this.termsOfServiceService.findAll({ status, planId });
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @Get('next-version')
  @ApiOperation({ summary: 'Gerar próxima versão para um plano (SuperAdmin)' })
  @ApiResponse({ status: 200, description: 'Próxima versão gerada' })
  async getNextVersion(
    @Query('planId') planId?: string,
    @Query('isMajor') isMajor?: string,
  ) {
    const version = await this.termsOfServiceService.getNextVersion(
      planId,
      isMajor === 'true',
    );
    return { version };
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Buscar termo de uso por ID (SuperAdmin)' })
  @ApiResponse({ status: 200, description: 'Termo de uso encontrado' })
  async findOne(@Param('id') id: string) {
    return this.termsOfServiceService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar termo de uso DRAFT (SuperAdmin)' })
  @ApiResponse({ status: 200, description: 'Termo de uso atualizado' })
  async update(@Param('id') id: string, @Body() dto: UpdateTermsOfServiceDto) {
    return this.termsOfServiceService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @Post(':id/publish')
  @ApiOperation({
    summary: 'Publicar termo de uso (DRAFT → ACTIVE) (SuperAdmin)',
  })
  @ApiResponse({ status: 200, description: 'Termo de uso publicado' })
  async publish(
    @Param('id') id: string,
    @Body() dto: PublishTermsOfServiceDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.termsOfServiceService.publish(id, dto, user.sub);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard, ReauthenticationGuard)
  @RequiresReauthentication()
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Deletar termo de uso DRAFT (SuperAdmin) - Requer reautenticação' })
  @ApiResponse({ status: 200, description: 'Termo de uso deletado' })
  @ApiResponse({ status: 403, description: 'Reautenticação necessária' })
  async delete(@Param('id') id: string) {
    return this.termsOfServiceService.delete(id);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @Get(':id/acceptances')
  @ApiOperation({ summary: 'Listar aceites de um termo de uso (SuperAdmin)' })
  @ApiResponse({ status: 200, description: 'Lista de aceites' })
  async getAcceptances(@Param('id') id: string) {
    return this.termsOfServiceService.getAcceptances(id);
  }
}
