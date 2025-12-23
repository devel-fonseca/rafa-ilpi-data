import { Controller, Get, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AdminComplianceService } from './admin-compliance.service'

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly complianceService: AdminComplianceService) {}

  @Get('compliance/today')
  async getComplianceToday() {
    return this.complianceService.getTodayCompliance()
  }
}
