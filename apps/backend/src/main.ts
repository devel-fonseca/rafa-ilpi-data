import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Usar Winston como logger padrão
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // Config Service
  const configService = app.get(ConfigService);
  const port = configService.get('PORT') || 3000;
  // Suporta tanto CORS_ORIGIN (novo) quanto FRONTEND_URL (legado) para compatibilidade
  const corsOrigin = configService.get('CORS_ORIGIN')
    || configService.get('FRONTEND_URL')
    || 'http://localhost:5173';

  // CORS
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      // IMPORTANTE: Validar apenas INPUT (request), não OUTPUT (response)
      // Isso permite que métodos retornem campos calculados sem precisar de DTOs de resposta
      validateCustomDecorators: false,
      skipMissingProperties: false,
    }),
  );

  // Swagger/OpenAPI Configuration
  const config = new DocumentBuilder()
    .setTitle('Rafa ILPI API')
    .setDescription('API para Gestão de Instituições de Longa Permanência para Idosos (ILPIs)')
    .setVersion('1.0')
    .setContact(
      'Rafa Labs',
      'https://rafalabs.com.br',
      'suporte@rafalabs.com.br',
    )
    .setLicense('Proprietário', '')
    .addTag('auth', 'Autenticação e autorização')
    .addTag('tenants', 'Gestão de ILPIs (tenants)')
    .addTag('residents', 'Gestão de residentes')
    .addTag('files', 'Upload e gerenciamento de arquivos')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Token JWT de autenticação',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Rafa ILPI API Docs',
    customfavIcon: 'https://rafalabs.com.br/favicon.ico',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  await app.listen(port);

  console.log(`🚀 Server running on http://localhost:${port}/api`);
  console.log(`📚 API Docs: http://localhost:${port}/api/docs`);
  console.log(`📚 CORS Origin: ${corsOrigin}`);
}

bootstrap();
