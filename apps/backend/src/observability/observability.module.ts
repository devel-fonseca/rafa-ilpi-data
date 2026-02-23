import { Global, Module } from '@nestjs/common'
import { RequestPerformanceMetricsService } from './request-performance-metrics.service'

@Global()
@Module({
  providers: [RequestPerformanceMetricsService],
  exports: [RequestPerformanceMetricsService],
})
export class ObservabilityModule {}
