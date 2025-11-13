import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { APP_GUARD } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { FilesModule } from './files/files.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { winstonConfig } from './common/config/winston.config';

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
        connection: {
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
  ],
  providers: [
    // Guard global - todas as rotas requerem autenticação por padrão
    // Use @Public() para rotas públicas
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
