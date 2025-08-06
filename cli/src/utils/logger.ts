import winston = require('winston');
import * as path from 'path';
import * as fs from 'fs-extra';

class Logger {
  private logger: winston.Logger;

  constructor() {
    const logDir = this.getLogDirectory();
    
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'sentient-cli' },
      transports: [
        new winston.transports.File({ 
          filename: path.join(logDir, 'error.log'), 
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        new winston.transports.File({ 
          filename: path.join(logDir, 'combined.log'),
          maxsize: 5242880,
          maxFiles: 5,
        }),
      ],
    });

    // Add console transport for development
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }));
    }
  }

  private getLogDirectory(): string {
    const projectRoot = process.cwd();
    const sentientDir = path.join(projectRoot, '.sentient');
    const logDir = path.join(sentientDir, 'logs');
    
    try {
      fs.ensureDirSync(logDir);
    } catch (error) {
      // Fallback to temp directory if we can't write to .sentient
      const tempLogDir = path.join(require('os').tmpdir(), 'sentient-logs');
      fs.ensureDirSync(tempLogDir);
      return tempLogDir;
    }
    
    return logDir;
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  error(message: string, error?: any): void {
    this.logger.error(message, { error: error?.stack || error });
  }

  log(level: string, message: string, meta?: any): void {
    this.logger.log(level, message, meta);
  }
}

// Create logger instance and export only the public interface
const loggerInstance = new Logger();

export const logger = {
  debug: (message: string, meta?: any) => loggerInstance.debug(message, meta),
  info: (message: string, meta?: any) => loggerInstance.info(message, meta),
  warn: (message: string, meta?: any) => loggerInstance.warn(message, meta),
  error: (message: string, error?: any) => loggerInstance.error(message, error),
  log: (level: string, message: string, meta?: any) => loggerInstance.log(level, message, meta),
};