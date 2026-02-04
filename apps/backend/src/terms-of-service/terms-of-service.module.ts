import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TermsOfServiceController } from './terms-of-service.controller';
import { TermsOfServiceService } from './terms-of-service.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ReauthenticationGuard } from '../auth/guards/reauthentication.guard';

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
  controllers: [TermsOfServiceController],
  providers: [TermsOfServiceService, ReauthenticationGuard],
  exports: [TermsOfServiceService],
})
export class TermsOfServiceModule {}
