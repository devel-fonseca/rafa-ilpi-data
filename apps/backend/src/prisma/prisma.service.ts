import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { createEncryptionMiddleware } from './middleware/encryption.middleware';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private tenantClients: Map<string, PrismaClient> = new Map();

  constructor(private readonly configService: ConfigService) {
    super({
      log: process.env.NODE_ENV === 'test' ? ['error'] : ['query', 'error', 'warn'],
    });

    // Registrar middleware de criptografia
    this.registerEncryptionMiddleware();
  }

  /**
   * Registrar middleware de criptografia para todos os clientes
   * Garante que dados sensíveis sejam automaticamente criptografados/descriptografados
   */
  private registerEncryptionMiddleware(): void {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_MASTER_KEY');

    if (!encryptionKey) {
      throw new Error('ENCRYPTION_MASTER_KEY must be defined in environment variables');
    }

    // Registrar middleware no cliente principal
    this.$use(createEncryptionMiddleware(encryptionKey));
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    // Desconectar todos os tenant clients
    for (const client of this.tenantClients.values()) {
      await client.$disconnect();
    }
    await this.$disconnect();
  }

  /**
   * Obtém um client Prisma para o schema do tenant
   * @param schemaName Nome do schema do tenant (ex: "tenant_abc123")
   */
  getTenantClient(schemaName: string): PrismaClient {
    if (!this.tenantClients.has(schemaName)) {
      // Extrai a connection string base
      const baseUrl = process.env.DATABASE_URL;

      if (!baseUrl) {
        throw new Error('DATABASE_URL environment variable is not defined');
      }

      // Adiciona o schema ao connection string
      // Ex: postgresql://user:pass@host:5432/db?schema=tenant_abc123
      const tenantUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}schema=${schemaName}`;

      const tenantClient = new PrismaClient({
        datasources: {
          db: {
            url: tenantUrl,
          },
        },
        log: process.env.NODE_ENV === 'test' ? ['error'] : ['query', 'error', 'warn'],
      });

      // Registrar middleware de criptografia no tenant client também
      const encryptionKey = this.configService.get<string>('ENCRYPTION_MASTER_KEY')!;
      tenantClient.$use(createEncryptionMiddleware(encryptionKey));

      this.tenantClients.set(schemaName, tenantClient);
    }

    return this.tenantClients.get(schemaName)!;
  }

  /**
   * Cria um novo schema para um tenant
   * @param schemaName Nome do schema (ex: "tenant_abc123")
   */
  async createTenantSchema(schemaName: string): Promise<void> {
    // Cria o schema no PostgreSQL
    await this.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}";`);

    // Pega o client do tenant
    const tenantClient = this.getTenantClient(schemaName);

    // Executa as migrations no schema do tenant
    // Nota: As migrations terão que ser executadas manualmente ou via script
    // Por enquanto, vamos apenas conectar
    await tenantClient.$connect();
  }

  /**
   * Remove o schema de um tenant
   * @param schemaName Nome do schema
   */
  async deleteTenantSchema(schemaName: string): Promise<void> {
    // Desconecta o client primeiro
    const client = this.tenantClients.get(schemaName);
    if (client) {
      await client.$disconnect();
      this.tenantClients.delete(schemaName);
    }

    // Remove o schema
    await this.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE;`);
  }
}
