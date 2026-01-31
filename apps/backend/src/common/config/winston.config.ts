import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Formato customizado para logs
const customFormat = printf(({ level, message, timestamp, context, trace, requestId, tenantId, userId, ...metadata }) => {
  const parts = [];

  // Base: timestamp, context, level, message
  parts.push(`${timestamp} [${context || 'Application'}] ${level}: ${message}`);

  // IDs úteis para rastreamento (requestId, tenantId, userId)
  const tags = [];
  if (requestId) tags.push(`rid=${requestId}`);
  if (tenantId) tags.push(`tid=${tenantId}`);
  if (userId) tags.push(`uid=${userId}`);
  if (tags.length) parts.push(`(${tags.join(' ')})`);

  // Metadata restante (qualquer outro campo adicional)
  const metadataKeys = Object.keys(metadata);
  if (metadataKeys.length > 0) {
    parts.push(JSON.stringify(metadata));
  }

  // Stack trace (se existir)
  if (trace) {
    parts.push(`\n${trace}`);
  }

  return parts.join(' ');
});

// Formato JSON para produção
const jsonFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  winston.format.json(),
);

// Formato legível para desenvolvimento
const consoleFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  colorize({ all: true }),
  customFormat,
);

export const winstonConfig: WinstonModuleOptions = {
  transports: [
    // Console logs (sempre ativo)
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? jsonFormat : consoleFormat,
      level: process.env.LOG_LEVEL || 'info',
    }),

    // Logs de erro em arquivo separado
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: jsonFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // Todos os logs em arquivo
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: jsonFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // Logs de auditoria (auth, data changes)
    new winston.transports.File({
      filename: 'logs/audit.log',
      level: 'info',
      format: jsonFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
  ],

  // Níveis customizados (opcional)
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6,
  },

  // Tratamento de exceções não capturadas
  exceptionHandlers: [
    new winston.transports.File({
      filename: 'logs/exceptions.log',
      format: jsonFormat,
    }),
  ],

  // Tratamento de rejeições de promises não tratadas
  rejectionHandlers: [
    new winston.transports.File({
      filename: 'logs/rejections.log',
      format: jsonFormat,
    }),
  ],
};
