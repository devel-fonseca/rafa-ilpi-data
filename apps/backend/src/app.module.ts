import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { FilesModule } from './files/files.module';
import { TenantsModule } from './tenants/tenants.module';
import { PlansModule } from './plans/plans.module';
import { ResidentsModule } from './residents/residents.module';
import { DailyRecordsModule } from './daily-records/daily-records.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { VaccinationsModule } from './vaccinations/vaccinations.module';
import { AuditModule } from './audit/audit.module';
import { AuditInterceptor } from './audit/audit.interceptor';
import { HealthModule } from './health/health.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { winstonConfig } from './common/config/winston.config';
import { BuildingsModule } from './buildings/buildings.module';
import { FloorsModule } from './floors/floors.module';
import { RoomsModule } from './rooms/rooms.module';
import { BedsModule } from './beds/beds.module';
import { VitalSignsModule } from './vital-signs/vital-signs.module';
import { InstitutionalProfileModule } from './institutional-profile/institutional-profile.module';

@Module({
  imports: [
    // Config Module (variáveis de ambiente)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Winston Logger (logs estruturados)
    WinstonModule.forRoot(winstonConfig),

    // Redis + BullMQ (filas de processamento)
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST') || 'localhost',
          port: configService.get('REDIS_PORT') || 6379,
        },
      }),
    }),

    // Database
    PrismaModule,

    // Módulos da aplicação
    AuthModule,
    FilesModule,
    TenantsModule,
    PlansModule,
    ResidentsModule,
    DailyRecordsModule,
    PrescriptionsModule,
    VaccinationsModule,
    AuditModule,
    HealthModule,
    BuildingsModule,
    FloorsModule,
    RoomsModule,
    BedsModule,
    VitalSignsModule,
    InstitutionalProfileModule,
  ],
  providers: [
    // Guard global - todas as rotas requerem autenticação por padrão
    // Use @Public() para rotas públicas
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Interceptor global de auditoria
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
