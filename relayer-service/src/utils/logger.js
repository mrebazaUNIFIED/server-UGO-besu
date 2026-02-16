import winston from 'winston';
import dotenv from 'dotenv';

dotenv.config();

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Custom format
const customFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  
  // Log metadata mejorado
  if (metadata && Object.keys(metadata).length > 0) {
    // Filtrar objetos grandes o circulares
    const safeMetadata = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (value instanceof Error) {
        safeMetadata[key] = {
          message: value.message,
          code: value.code,
          name: value.name
        };
      } else if (typeof value === 'object' && value !== null) {
        try {
          safeMetadata[key] = JSON.stringify(value);
        } catch {
          safeMetadata[key] = '[Circular or unserializable object]';
        }
      } else {
        safeMetadata[key] = value;
      }
    }
    msg += ` ${JSON.stringify(safeMetadata)}`;
  }
  
  if (stack) {
    msg += `\n${stack}`;
  }
  
  return msg;
});

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    customFormat
  ),
  transports: [
    // Console output
    new winston.transports.Console({
      format: combine(
        colorize(),
        customFormat
      )
    }),
    // File output
    new winston.transports.File({ 
      filename: process.env.LOG_FILE || './logs/relayer.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: combine(
        errors({ stack: true }),
        timestamp(),
        json()
      )
    })
  ]
});

// Capturar unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason instanceof Error ? {
      message: reason.message,
      stack: reason.stack,
      code: reason.code,
      name: reason.name
    } : reason,
    promise: '[Promise]'
  });
  
  // Para debugging: si es un error de ethers, loguear más detalles
  if (reason && reason.info) {
    logger.error('Ethers error info:', { info: reason.info });
  }
  if (reason && reason.error) {
    logger.error('Ethers nested error:', { error: reason.error });
  }
});

// Capturar uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    message: error.message,
    stack: error.stack,
    code: error.code,
    name: error.name
  });
  
  // Don't exit immediately - let the process handle it
  // process.exit(1);
});

export default logger;