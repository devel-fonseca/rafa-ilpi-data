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
import { AuditEntity, AuditAction } from '../audit/audit.decorator'

@Controller('vital-sign-alerts')
@UseGuards(JwtAuthGuard)
@AuditEntity('VITAL_SIGN_ALERT')
export class VitalSignAlertsController {
  constructor(
    private readonly vitalSignAlertsService: VitalSignAlertsService,
  ) {}

  /**
   * POST /vital-sign-alerts
   * Criar novo alerta médico
   */
  @Post()
  @AuditAction('CREATE')
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req: any, @Body() dto: CreateVitalSignAlertDto) {
    const userId = req.user.sub

    return this.vitalSignAlertsService.create(dto, userId)
  }

  /**
   * GET /vital-sign-alerts
   * Listar alertas com filtros e paginação
   */
  @Get()
  async findAll(@Query() query: QueryVitalSignAlertsDto) {
    return this.vitalSignAlertsService.findAll(query)
  }

  /**
   * GET /vital-sign-alerts/stats
   * Estatísticas de alertas por status
   */
  @Get('stats')
  async getStats() {
    return this.vitalSignAlertsService.countByStatus()
  }

  /**
   * GET /vital-sign-alerts/resident/:residentId/active
   * Buscar alertas ativos de um residente específico
   */
  @Get('resident/:residentId/active')
  async findActiveByResident(
    @Param('residentId') residentId: string,
  ) {
    return this.vitalSignAlertsService.findActiveByResident(residentId)
  }

  /**
   * GET /vital-sign-alerts/:id
   * Buscar alerta por ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.vitalSignAlertsService.findOne(id)
  }

  /**
   * PATCH /vital-sign-alerts/:id
   * Atualizar alerta (status, atribuição, notas médicas)
   */
  @Patch(':id')
  @AuditAction('UPDATE')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateVitalSignAlertDto,
  ) {
    const userId = req.user.sub

    return this.vitalSignAlertsService.update(id, dto, userId)
  }

  /**
   * GET /vital-sign-alerts/:id/history
   * Buscar histórico de alterações de um alerta
   */
  @Get(':id/history')
  async getHistory(@Param('id') id: string) {
    return this.vitalSignAlertsService.getHistory(id)
  }
}
