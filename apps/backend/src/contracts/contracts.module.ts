import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ReauthenticationGuard } from '../auth/guards/reauthentication.guard';

/**
 * @deprecated ContractsModule está DEPRECADO
 *
 * Use TermsOfServiceModule em vez deste módulo.
 *
 * Razão: Renomeação de "Contratos" para "Termos de Uso" para evitar confusão
 * com contratos de residentes (ResidentContractsModule).
 *
 * Este módulo usa a tabela `service_contracts` (legacy).
 * TermsOfServiceModule usa a tabela `terms_of_service` (nova nomenclatura).
 *
 * Removido de SuperAdminModule em: 03/02/2026
 */
@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN') || '15m',
        },
      }),
    }),
  ],
  controllers: [ContractsController],
  providers: [ContractsService, ReauthenticationGuard],
  exports: [ContractsService],
})
export class ContractsModule {}
