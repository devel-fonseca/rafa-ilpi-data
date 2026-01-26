import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
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
import { ClinicalNotesModule } from './clinical-notes/clinical-notes.module';
import { AuditModule } from './audit/audit.module';
import { AuditInterceptor } from './audit/audit.interceptor';
import { TenantContextService } from './prisma/tenant-context.service';
import { HealthModule } from './health/health.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { winstonConfig } from './common/config/winston.config';
import { BuildingsModule } from './buildings/buildings.module';
import { FloorsModule } from './floors/floors.module';
import { RoomsModule } from './rooms/rooms.module';
import { BedsModule } from './beds/beds.module';
import { VitalSignsModule } from './vital-signs/vital-signs.module';
import { VitalSignAlertsModule } from './vital-sign-alerts/vital-sign-alerts.module';
import { InstitutionalProfileModule } from './institutional-profile/institutional-profile.module';
import { ResidentDocumentsModule } from './resident-documents/resident-documents.module';
import { UserProfilesModule } from './user-profiles/user-profiles.module';
import { EmailModule } from './email/email.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ClinicalProfilesModule } from './clinical-profiles/clinical-profiles.module';
import { AllergiesModule } from './allergies/allergies.module';
import { ConditionsModule } from './conditions/conditions.module';
import { DietaryRestrictionsModule } from './dietary-restrictions/dietary-restrictions.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PopsModule } from './pops/pops.module';
import { MedicationsModule } from './medications/medications.module';
import { SOSMedicationsModule } from './sos-medications/sos-medications.module';
import { ResidentScheduleModule } from './resident-schedule/resident-schedule.module';
import { ResidentContractsModule } from './resident-contracts/resident-contracts.module';
import { SuperAdminModule } from './superadmin/superadmin.module';
import { PaymentsModule } from './payments/payments.module';
import { AdminModule } from './admin/admin.module';
import { PrivacyPolicyModule } from './privacy-policy/privacy-policy.module';
import { EmailTemplatesModule } from './email-templates/email-templates.module';
import { EmailLogsModule } from './email-logs/email-logs.module';
import { TenantMessagesModule } from './tenant-messages/tenant-messages.module';
import { MessagesModule } from './messages/messages.module';
import { CacheModule } from './cache/cache.module';
import { InstitutionalEventsModule } from './institutional-events/institutional-events.module';
import { SentinelEventsModule } from './sentinel-events/sentinel-events.module';
import { RdcIndicatorsModule } from './rdc-indicators/rdc-indicators.module';
import { AdminDashboardModule } from './admin-dashboard/admin-dashboard.module';
import { TenantProfileModule } from './tenant-profile/tenant-profile.module';
import { EventsModule } from './events/events.module';
import { ValidationModule } from './validation/validation.module';
import { TeamsModule } from './teams/teams.module';
import { ShiftTemplatesModule } from './shift-templates/shift-templates.module';
import { CareShiftsModule } from './care-shifts/care-shifts.module';
import { ComplianceAssessmentsModule } from './compliance-assessments/compliance-assessments.module';
import { ContractsModule } from './contracts/contracts.module';
import { TermsOfServiceModule } from './terms-of-service/terms-of-service.module';

@Module({
  imports: [
    // Config Module (variáveis de ambiente)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Winston Logger (logs estruturados)
    WinstonModule.forRoot(winstonConfig),

    // Schedule Module (cron jobs)
    ScheduleModule.forRoot(),

    // Event Emitter (eventos entre módulos)
    EventEmitterModule.forRoot(),

    // Redis + BullMQ (filas de processamento)
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST') || 'localhost',
          port: configService.get('REDIS_PORT') || 6379,
          password: configService.get('REDIS_PASSWORD') || undefined, // Segurança em produção
        },
      }),
    }),

    // Database
    PrismaModule,

    // Cache (Redis)
    CacheModule,

    // Módulos da aplicação
    AuthModule,
    FilesModule,
    TenantsModule,
    PlansModule,
    ResidentsModule,
    DailyRecordsModule,
    PrescriptionsModule,
    MedicationsModule,
    SOSMedicationsModule,
    VaccinationsModule,
    ClinicalNotesModule,
    AuditModule,
    HealthModule,
    BuildingsModule,
    FloorsModule,
    RoomsModule,
    BedsModule,
    VitalSignsModule,
    VitalSignAlertsModule,
    InstitutionalProfileModule,
    ResidentDocumentsModule,
    UserProfilesModule,
    EmailModule,
    PermissionsModule,
    ClinicalProfilesModule,
    AllergiesModule,
    ConditionsModule,
    DietaryRestrictionsModule,
    NotificationsModule,
    PopsModule,
    ResidentScheduleModule,
    ResidentContractsModule,
    SuperAdminModule,
    PaymentsModule,
    AdminModule,
    PrivacyPolicyModule,
    EmailTemplatesModule,
    EmailLogsModule,
    TenantMessagesModule,
    MessagesModule,
    InstitutionalEventsModule,

    // Conformidade RDC 502/2021
    SentinelEventsModule,
    RdcIndicatorsModule,
    ComplianceAssessmentsModule,
    AdminDashboardModule,

    // Escala de Cuidados (Gestão de Turnos e Plantões)
    TeamsModule,
    ShiftTemplatesModule,
    CareShiftsModule,

    // Real-time events (WebSocket)
    EventsModule,

    // Onboarding
    TenantProfileModule,

    // Contratos e Termos de Uso (SaaS)
    ContractsModule,
    TermsOfServiceModule,

    // Validação pública de documentos
    ValidationModule,
  ],
  providers: [
    // Guard global - todas as rotas requerem autenticação por padrão
    // Use @Public() para rotas públicas
    // IMPORTANTE: useFactory para permitir injeção de Reflector e TenantContextService
    {
      provide: APP_GUARD,
      useFactory: (reflector: Reflector, tenantContext: TenantContextService) => {
        return new JwtAuthGuard(reflector, tenantContext);
      },
      inject: [Reflector, TenantContextService],
    },
    // Tenant Context Service - REQUEST-scoped para isolamento de dados
    TenantContextService,
    // NOTA: TenantContext é inicializado pelo JwtAuthGuard após validação JWT
    // Interceptor global de auditoria (REQUEST-scoped para funcionar com TenantContextService)
    // Mudado para REQUEST scope para ter acesso ao TenantContextService correto
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
