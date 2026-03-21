import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Serviço abstrato de cache usando Redis
 *
 * Fornece métodos centralizados para operações de cache com:
 * - Tratamento de erros robusto
 * - Logging estruturado
 * - TTL configurável
 * - Suporte a padrões (patterns) para invalidação em massa
 *
 * @example
 * ```typescript
 * // Salvar no cache
 * await cacheService.set('user:123', userData, 600); // 10 minutos
 *
 * // Recuperar do cache
 * const user = await cacheService.get<User>('user:123');
 *
 * // Deletar do cache
 * await cacheService.del('user:123');
 *
 * // Limpar por padrão
 * await cacheService.clear('user:*'); // Deleta todas as chaves que começam com "user:"
 * ```
 */
@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: Redis;
  private isConnected = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get('REDIS_HOST') || 'localhost';
    const port = this.configService.get('REDIS_PORT') || 6379;
    const password = this.configService.get('REDIS_PASSWORD');

    this.client = new Redis({
      host,
      port,
      password,
      retryStrategy: (times) => {
        // Tentar reconectar até 10 vezes, com delay exponencial
        if (times > 10) {
          this.logger.error('Redis: Máximo de tentativas de reconexão atingido');
          return null; // Para de tentar
        }
        const delay = Math.min(times * 1000, 5000); // Máximo 5s
        this.logger.warn(`Redis: Reconectando em ${delay}ms (tentativa ${times}/10)`);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      this.logger.log(`✅ Redis conectado: ${host}:${port}`);
    });

    this.client.on('error', (err) => {
      this.isConnected = false;
      this.logger.error(`❌ Redis erro: ${err.message}`);
    });

    this.client.on('close', () => {
      this.isConnected = false;
      this.logger.warn('⚠️  Redis desconectado');
    });

    this.client.on('reconnecting', () => {
      this.logger.log('🔄 Redis reconectando...');
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis desconectado com sucesso');
    }
  }

  /**
   * Verifica conectividade real com Redis.
   *
   * Usado em readiness checks para garantir que cache/filas compartilham
   * a mesma dependência crítica antes de marcar a API como saudável.
   */
  async ping(): Promise<boolean> {
    try {
      if (!this.isConnected || !this.client) {
        return false;
      }

      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error(`Erro ao executar Redis PING: ${error.message}`);
      return false;
    }
  }

  /**
   * Recupera um valor do cache
   *
   * @param key - Chave do cache
   * @returns Valor deserializado ou null se não encontrado
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.isConnected) {
        this.logger.warn(`Cache GET falhou: Redis desconectado (key: ${key})`);
        return null;
      }

      const value = await this.client.get(key);
      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Erro ao recuperar cache (key: ${key}): ${error.message}`);
      return null; // Falha silenciosa - não quebrar a aplicação
    }
  }

  /**
   * Salva um valor no cache com TTL
   *
   * @param key - Chave do cache
   * @param value - Valor a ser cacheado (será serializado para JSON)
   * @param ttl - Tempo de vida em segundos (padrão: 900s = 15min)
   */
  async set(key: string, value: unknown, ttl = 900): Promise<void> {
    try {
      if (!this.isConnected) {
        this.logger.warn(`Cache SET ignorado: Redis desconectado (key: ${key})`);
        return;
      }

      const serialized = JSON.stringify(value);
      await this.client.setex(key, ttl, serialized);

      this.logger.debug(`Cache SET: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      this.logger.error(`Erro ao salvar cache (key: ${key}): ${error.message}`);
      // Falha silenciosa - não quebrar a aplicação
    }
  }

  /**
   * Deleta uma chave do cache
   *
   * @param key - Chave a ser deletada
   * @returns Número de chaves deletadas (0 ou 1)
   */
  async del(key: string): Promise<number> {
    try {
      if (!this.isConnected) {
        this.logger.warn(`Cache DEL ignorado: Redis desconectado (key: ${key})`);
        return 0;
      }

      const result = await this.client.del(key);
      this.logger.debug(`Cache DEL: ${key} (${result} deletada(s))`);
      return result;
    } catch (error) {
      this.logger.error(`Erro ao deletar cache (key: ${key}): ${error.message}`);
      return 0;
    }
  }

  /**
   * Deleta todas as chaves que correspondem a um padrão
   *
   * @param pattern - Padrão glob (ex: "user:*", "tenant:abc-*")
   * @returns Número de chaves deletadas
   */
  async clear(pattern: string): Promise<number> {
    try {
      if (!this.isConnected) {
        this.logger.warn(`Cache CLEAR ignorado: Redis desconectado (pattern: ${pattern})`);
        return 0;
      }

      // Usar SCAN ao invés de KEYS para evitar bloqueio do Redis em bases grandes
      let cursor = '0';
      let totalDeleted = 0;

      do {
        const [nextCursor, keys] = await this.client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          500,
        );
        cursor = nextCursor;

        if (keys.length > 0) {
          const deleted = await this.client.del(...keys);
          totalDeleted += deleted;
        }
      } while (cursor !== '0');

      this.logger.log(
        `Cache CLEAR: ${totalDeleted} chave(s) deletada(s) (pattern: "${pattern}")`,
      );
      return totalDeleted;
    } catch (error) {
      this.logger.error(`Erro ao limpar cache (pattern: ${pattern}): ${error.message}`);
      return 0;
    }
  }

  /**
   * Conta quantas chaves existem para um padrão sem removê-las
   *
   * @param pattern - Padrão glob (ex: "user:*", "tenant:abc-*")
   * @returns Número de chaves encontradas
   */
  async countByPattern(pattern: string): Promise<number> {
    try {
      if (!this.isConnected) {
        this.logger.warn(`Cache COUNT ignorado: Redis desconectado (pattern: ${pattern})`);
        return 0;
      }

      let cursor = '0';
      let total = 0;

      do {
        const [nextCursor, keys] = await this.client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          500,
        );
        cursor = nextCursor;
        total += keys.length;
      } while (cursor !== '0');

      this.logger.debug(`Cache COUNT: ${total} chave(s) para pattern "${pattern}"`);
      return total;
    } catch (error) {
      this.logger.error(`Erro ao contar cache (pattern: ${pattern}): ${error.message}`);
      return 0;
    }
  }

  /**
   * Verifica se uma chave existe no cache
   *
   * @param key - Chave a verificar
   * @returns true se existe, false caso contrário
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }

      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Erro ao verificar existência (key: ${key}): ${error.message}`);
      return false;
    }
  }

  /**
   * Obtém o tempo de vida restante de uma chave (em segundos)
   *
   * @param key - Chave a verificar
   * @returns TTL em segundos, -1 se não tem TTL, -2 se não existe
   */
  async ttl(key: string): Promise<number> {
    try {
      if (!this.isConnected) {
        return -2;
      }

      return await this.client.ttl(key);
    } catch (error) {
      this.logger.error(`Erro ao obter TTL (key: ${key}): ${error.message}`);
      return -2;
    }
  }

  /**
   * Renova o TTL de uma chave existente
   *
   * @param key - Chave a renovar
   * @param ttl - Novo tempo de vida em segundos
   * @returns true se renovado, false se a chave não existe
   */
  async refresh(key: string, ttl: number): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }

      const result = await this.client.expire(key, ttl);
      return result === 1;
    } catch (error) {
      this.logger.error(`Erro ao renovar TTL (key: ${key}): ${error.message}`);
      return false;
    }
  }

  /**
   * Retorna informações de status do Redis
   */
  getStatus(): { connected: boolean; host: string; port: number } {
    return {
      connected: this.isConnected,
      host: this.configService.get('REDIS_HOST') || 'localhost',
      port: this.configService.get('REDIS_PORT') || 6379,
    };
  }
}
