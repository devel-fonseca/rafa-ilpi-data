import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    try {
      // Verificar conexão com o banco de dados
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
      };
    } catch (error) {
      return {
        status: 'error',
      };
    }
  }
}
