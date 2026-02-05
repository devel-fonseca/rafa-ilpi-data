import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ReportsService } from './reports.service';
import { MultiDayReportDto } from './dto/daily-report.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily')
  @ApiOperation({ summary: 'Gerar relatório diário ou multi-dia' })
  @ApiQuery({ name: 'startDate', required: true, type: String, description: 'Data inicial (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Data final (YYYY-MM-DD). Se não fornecida, retorna apenas startDate' })
  @ApiResponse({
    status: 200,
    description: 'Relatório gerado com sucesso',
    type: MultiDayReportDto,
  })
  async getDailyReport(
    @CurrentUser() user: JwtPayload,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate?: string,
  ): Promise<MultiDayReportDto> {
    if (!user.tenantId) {
      throw new Error('TenantId não encontrado no token JWT');
    }
    return this.reportsService.generateMultiDayReport(user.tenantId, startDate, endDate);
  }
}
