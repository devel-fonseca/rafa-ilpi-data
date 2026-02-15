import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface'
import { VitalSignAlertsService } from './vital-sign-alerts.service'
import {
  CreateVitalSignAlertDto,
  UpdateVitalSignAlertDto,
  QueryVitalSignAlertsDto,
} from './dto'
import { AuditEntity, AuditAction } from '../audit/audit.decorator'
import { FeatureGuard } from '../common/guards/feature.guard'
import { RequireFeatures } from '../common/decorators/require-features.decorator'

@Controller('vital-sign-alerts')
@UseGuards(JwtAuthGuard, FeatureGuard)
@RequireFeatures('sinais_vitais')
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
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateVitalSignAlertDto) {
    return this.vitalSignAlertsService.create(dto, user.id)
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
    @Param('id') id: string,
    @Body() dto: UpdateVitalSignAlertDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.vitalSignAlertsService.update(id, dto, user.id)
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
