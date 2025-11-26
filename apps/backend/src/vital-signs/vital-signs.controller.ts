import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { User } from '@prisma/client'
import * as vitalSignsService from '../services/vitalSigns.service'

@ApiTags('vital-signs')
@Controller('vital-signs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VitalSignsController {
  @Get('resident/:residentId')
  @ApiOperation({ summary: 'Buscar sinais vitais de um residente' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Sinais vitais encontrados' })
  @ApiResponse({ status: 404, description: 'Residente não encontrado' })
  async getVitalSignsByResident(
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: User,
  ) {
    const start = startDate ? new Date(startDate) : undefined
    const end = endDate ? new Date(endDate) : undefined

    const vitalSigns = await vitalSignsService.getVitalSignsByResident(
      residentId,
      user.tenantId,
      start,
      end,
    )

    // Transformar os dados para o formato esperado pelo frontend
    return vitalSigns.map((vs) => ({
      id: vs.id,
      timestamp: vs.timestamp,
      systolicBloodPressure: vs.systolicBloodPressure,
      diastolicBloodPressure: vs.diastolicBloodPressure,
      temperature: vs.temperature,
      heartRate: vs.heartRate,
      oxygenSaturation: vs.oxygenSaturation,
      bloodGlucose: vs.bloodGlucose,
      recordedBy: vs.user?.name || 'Sistema',
      notes: '', // Podemos adicionar um campo notes na tabela futuramente
    }))
  }

  @Get('resident/:residentId/last')
  @ApiOperation({ summary: 'Buscar último registro de sinais vitais' })
  @ApiResponse({ status: 200, description: 'Último registro encontrado' })
  @ApiResponse({ status: 404, description: 'Nenhum registro encontrado' })
  async getLastVitalSign(
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @CurrentUser() user: User,
  ) {
    const lastSign = await vitalSignsService.getLastVitalSign(
      residentId,
      user.tenantId,
    )

    if (!lastSign) {
      return null
    }

    return {
      id: lastSign.id,
      timestamp: lastSign.timestamp,
      systolicBloodPressure: lastSign.systolicBloodPressure,
      diastolicBloodPressure: lastSign.diastolicBloodPressure,
      temperature: lastSign.temperature,
      heartRate: lastSign.heartRate,
      oxygenSaturation: lastSign.oxygenSaturation,
      bloodGlucose: lastSign.bloodGlucose,
    }
  }

  @Get('resident/:residentId/statistics')
  @ApiOperation({ summary: 'Buscar estatísticas de sinais vitais' })
  @ApiQuery({ name: 'days', required: false, type: Number, default: 30 })
  @ApiResponse({ status: 200, description: 'Estatísticas calculadas' })
  async getVitalSignsStatistics(
    @Param('residentId', ParseUUIDPipe) residentId: string,
    @Query('days') days: string = '30',
    @CurrentUser() user: User,
  ) {
    const daysNumber = parseInt(days)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysNumber)

    const vitalSigns = await vitalSignsService.getVitalSignsByResident(
      residentId,
      user.tenantId,
      startDate,
      endDate,
    )

    if (vitalSigns.length === 0) {
      return {
        avgSystolic: 0,
        avgDiastolic: 0,
        avgGlucose: 0,
        avgTemperature: 0,
        avgHeartRate: 0,
        avgOxygenSaturation: 0,
        criticalAlerts: 0,
        totalRecords: 0,
      }
    }

    // Calcular médias
    const validSystolic = vitalSigns.filter((v) => v.systolicBloodPressure)
    const validDiastolic = vitalSigns.filter((v) => v.diastolicBloodPressure)
    const validGlucose = vitalSigns.filter((v) => v.bloodGlucose)
    const validTemp = vitalSigns.filter((v) => v.temperature)
    const validHR = vitalSigns.filter((v) => v.heartRate)
    const validSpO2 = vitalSigns.filter((v) => v.oxygenSaturation)

    // Contar alertas críticos
    let criticalAlerts = 0
    vitalSigns.forEach((v) => {
      if (v.systolicBloodPressure && (v.systolicBloodPressure >= 140 || v.systolicBloodPressure < 90)) {
        criticalAlerts++
      }
      if (v.bloodGlucose && (v.bloodGlucose >= 180 || v.bloodGlucose < 70)) {
        criticalAlerts++
      }
      if (v.temperature && (v.temperature >= 38 || v.temperature < 35)) {
        criticalAlerts++
      }
      if (v.oxygenSaturation && v.oxygenSaturation < 92) {
        criticalAlerts++
      }
    })

    return {
      avgSystolic: validSystolic.length > 0
        ? Math.round(validSystolic.reduce((a, b) => a + b.systolicBloodPressure!, 0) / validSystolic.length)
        : 0,
      avgDiastolic: validDiastolic.length > 0
        ? Math.round(validDiastolic.reduce((a, b) => a + b.diastolicBloodPressure!, 0) / validDiastolic.length)
        : 0,
      avgGlucose: validGlucose.length > 0
        ? Math.round(validGlucose.reduce((a, b) => a + b.bloodGlucose!, 0) / validGlucose.length)
        : 0,
      avgTemperature: validTemp.length > 0
        ? Math.round(validTemp.reduce((a, b) => a + b.temperature!, 0) / validTemp.length * 10) / 10
        : 0,
      avgHeartRate: validHR.length > 0
        ? Math.round(validHR.reduce((a, b) => a + b.heartRate!, 0) / validHR.length)
        : 0,
      avgOxygenSaturation: validSpO2.length > 0
        ? Math.round(validSpO2.reduce((a, b) => a + b.oxygenSaturation!, 0) / validSpO2.length)
        : 0,
      criticalAlerts,
      totalRecords: vitalSigns.length,
    }
  }
}