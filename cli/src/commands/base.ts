import { Command } from 'commander';
import { logger } from '../utils/logger';

export abstract class BaseCommand {
  abstract readonly name: string;
  abstract readonly description: string;

  public readonly logger = logger;

  abstract execute(...args: any[]): Promise<void>;

  static register(program: Command): void {
    throw new Error('register method must be implemented by subclasses');
  }

  protected handleError(error: Error, context?: string): void {
    const message = context ? `${context}: ${error.message}` : error.message;
    this.logger.error(message, error);
    process.exit(1);
  }
}