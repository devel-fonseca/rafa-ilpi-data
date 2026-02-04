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
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { PublishContractDto } from './dto/publish-contract.dto';
import { PrepareAcceptanceDto, RenderContractDto } from './dto/accept-contract.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../superadmin/guards/superadmin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ContractStatus } from '@prisma/client';
import { RequiresReauthentication } from '../auth/decorators/requires-reauthentication.decorator';
import { ReauthenticationGuard } from '../auth/guards/reauthentication.guard';

@ApiTags('Contracts')
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  // ──────────────────────────────────────────────────────────────────────────
  // ROTAS PÚBLICAS (sem autenticação) - Usadas no registro
  // ──────────────────────────────────────────────────────────────────────────

  @Public()
  @Get('active')
  @ApiOperation({ summary: 'Buscar contrato ACTIVE para um plano (público)' })
  @ApiResponse({ status: 200, description: 'Contrato encontrado' })
  @ApiResponse({ status: 404, description: 'Nenhum contrato ativo disponível' })
  async getActiveContract(@Query('planId') planId?: string) {
    return this.contractsService.getActiveContractForPlan(planId);
  }

  @Public()
  @Post('render')
  @ApiOperation({ summary: 'Renderizar contrato com variáveis (público)' })
  @ApiResponse({ status: 200, description: 'Contrato renderizado' })
  async renderContract(@Body() dto: RenderContractDto) {
    return this.contractsService.renderContract(dto.contractId, dto.variables);
  }

  @Public()
  @Post('accept/prepare')
  @ApiOperation({
    summary:
      'Preparar token de aceite do contrato (usado no step 4 do registro)',
  })
  @ApiResponse({ status: 200, description: 'Token gerado com sucesso' })
  async prepareAcceptance(@Body() dto: PrepareAcceptanceDto) {
    return this.contractsService.prepareAcceptance(dto);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ROTAS SUPERADMIN - Gestão de Contratos
  // ──────────────────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Criar contrato DRAFT (SuperAdmin)' })
  @ApiResponse({ status: 201, description: 'Contrato criado' })
  async create(
    @Body() dto: CreateContractDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.contractsService.create(dto, user.sub);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Listar contratos com filtros (SuperAdmin)' })
  @ApiResponse({ status: 200, description: 'Lista de contratos' })
  async findAll(
    @Query('status') status?: ContractStatus,
    @Query('planId') planId?: string,
  ) {
    return this.contractsService.findAll({ status, planId });
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
    const version = await this.contractsService.getNextVersion(
      planId,
      isMajor === 'true',
    );
    return { version };
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Buscar contrato por ID (SuperAdmin)' })
  @ApiResponse({ status: 200, description: 'Contrato encontrado' })
  async findOne(@Param('id') id: string) {
    return this.contractsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar contrato DRAFT (SuperAdmin)' })
  @ApiResponse({ status: 200, description: 'Contrato atualizado' })
  async update(@Param('id') id: string, @Body() dto: UpdateContractDto) {
    return this.contractsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @Post(':id/publish')
  @ApiOperation({
    summary: 'Publicar contrato (DRAFT → ACTIVE) (SuperAdmin)',
  })
  @ApiResponse({ status: 200, description: 'Contrato publicado' })
  async publish(
    @Param('id') id: string,
    @Body() dto: PublishContractDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.contractsService.publish(id, dto, user.sub);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard, ReauthenticationGuard)
  @ApiBearerAuth()
  @RequiresReauthentication()
  @Delete(':id')
  @ApiOperation({ summary: 'Deletar contrato DRAFT (SuperAdmin). Requer reautenticação.' })
  @ApiResponse({ status: 200, description: 'Contrato deletado' })
  @ApiResponse({ status: 403, description: 'Reautenticação necessária' })
  async delete(@Param('id') id: string) {
    return this.contractsService.delete(id);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @Get(':id/acceptances')
  @ApiOperation({ summary: 'Listar aceites de um contrato (SuperAdmin)' })
  @ApiResponse({ status: 200, description: 'Lista de aceites' })
  async getAcceptances(@Param('id') id: string) {
    return this.contractsService.getAcceptances(id);
  }
}
