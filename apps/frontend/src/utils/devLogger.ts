type LogMethod = 'log' | 'info' | 'warn' | 'error' | 'debug'

const isDevelopment = import.meta.env.DEV

function write(method: LogMethod, ...args: unknown[]) {
  if (!isDevelopment) {
    return
  }

  console[method](...args)
}

export const devLogger = {
  log: (...args: unknown[]) => write('log', ...args),
  info: (...args: unknown[]) => write('info', ...args),
  warn: (...args: unknown[]) => write('warn', ...args),
  error: (...args: unknown[]) => write('error', ...args),
  debug: (...args: unknown[]) => write('debug', ...args),
}
