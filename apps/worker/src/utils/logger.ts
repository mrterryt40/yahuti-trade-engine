import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

// Base logger configuration
const baseLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'HH:MM:ss',
        messageFormat: '{levelLabel} - {msg}',
      }
    }
  }),
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Create child loggers for different modules
export function createLogger(module: string) {
  return baseLogger.child({ 
    module,
    service: 'yahuti-worker'
  });
}

// Export base logger
export { baseLogger as logger };