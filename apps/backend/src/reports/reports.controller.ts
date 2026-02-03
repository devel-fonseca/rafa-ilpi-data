import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ReportsService } from './reports.service';
import { DailyReportDto } from './dto/daily-report.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily/:date')
  @ApiOperation({ summary: 'Gerar relatório diário' })
  @ApiResponse({
    status: 200,
    description: 'Relatório diário gerado com sucesso',
    type: DailyReportDto,
  })
  async getDailyReport(
    @CurrentUser() user: JwtPayload,
    @Param('date') date: string,
  ): Promise<DailyReportDto> {
    if (!user.tenantId) {
      throw new Error('TenantId não encontrado no token JWT');
    }
    return this.reportsService.generateDailyReport(user.tenantId, date);
  }
}
