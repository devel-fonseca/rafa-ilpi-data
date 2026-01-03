import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { VitalSignAlertsService } from './vital-sign-alerts.service'
import {
  CreateVitalSignAlertDto,
  UpdateVitalSignAlertDto,
  QueryVitalSignAlertsDto,
} from './dto'

@Controller('vital-sign-alerts')
@UseGuards(JwtAuthGuard)
export class VitalSignAlertsController {
  constructor(
    private readonly vitalSignAlertsService: VitalSignAlertsService,
  ) {}

  /**
   * POST /vital-sign-alerts
   * Criar novo alerta médico
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req: any, @Body() dto: CreateVitalSignAlertDto) {
    const tenantId = req.user.tenantId
    const userId = req.user.sub

    return this.vitalSignAlertsService.create(tenantId, dto, userId)
  }

  /**
   * GET /vital-sign-alerts
   * Listar alertas com filtros e paginação
   */
  @Get()
  async findAll(@Request() req: any, @Query() query: QueryVitalSignAlertsDto) {
    const tenantId = req.user.tenantId
    return this.vitalSignAlertsService.findAll(tenantId, query)
  }

  /**
   * GET /vital-sign-alerts/stats
   * Estatísticas de alertas por status
   */
  @Get('stats')
  async getStats(@Request() req: any) {
    const tenantId = req.user.tenantId
    return this.vitalSignAlertsService.countByStatus(tenantId)
  }

  /**
   * GET /vital-sign-alerts/resident/:residentId/active
   * Buscar alertas ativos de um residente específico
   */
  @Get('resident/:residentId/active')
  async findActiveByResident(
    @Request() req: any,
    @Param('residentId') residentId: string,
  ) {
    const tenantId = req.user.tenantId
    return this.vitalSignAlertsService.findActiveByResident(
      tenantId,
      residentId,
    )
  }

  /**
   * GET /vital-sign-alerts/:id
   * Buscar alerta por ID
   */
  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId
    return this.vitalSignAlertsService.findOne(tenantId, id)
  }

  /**
   * PATCH /vital-sign-alerts/:id
   * Atualizar alerta (status, atribuição, notas médicas)
   */
  @Patch(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateVitalSignAlertDto,
  ) {
    const tenantId = req.user.tenantId
    const userId = req.user.sub

    return this.vitalSignAlertsService.update(tenantId, id, dto, userId)
  }
}
