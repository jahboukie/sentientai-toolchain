import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { logger } from '../utils/logger';

export interface SearchResult {
  file: string;
  line: number;
  content: string;
  context: string[];
}

export class FileOperations {
  async readFile(filePath: string): Promise<string> {
    try {
      const absolutePath = path.resolve(filePath);
      const content = await fs.readFile(absolutePath, 'utf-8');
      logger.info(`File read successfully: ${filePath}`);
      return content;
    } catch (error) {
      logger.error(`Failed to read file: ${filePath}`, error);
      throw error;
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      const absolutePath = path.resolve(filePath);
      await fs.ensureDir(path.dirname(absolutePath));
      await fs.writeFile(absolutePath, content, 'utf-8');
      logger.info(`File written successfully: ${filePath}`);
    } catch (error) {
      logger.error(`Failed to write file: ${filePath}`, error);
      throw error;
    }
  }

  async searchCodebase(query: string, pattern?: string): Promise<SearchResult[]> {
    try {
      const searchPattern = pattern || '**/*.{ts,js,tsx,jsx,py,java,cpp,c,h}';
      const files = await glob(searchPattern, { 
        ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
        absolute: true,
      });

      const results: SearchResult[] = [];
      const regex = new RegExp(query, 'gi');

      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          const lines = content.split('\n');

          lines.forEach((line, index) => {
            if (regex.test(line)) {
              const contextStart = Math.max(0, index - 2);
              const contextEnd = Math.min(lines.length, index + 3);
              const context = lines.slice(contextStart, contextEnd);

              results.push({
                file: path.relative(process.cwd(), file),
                line: index + 1,
                content: line.trim(),
                context,
              });
            }
          });
        } catch (fileError) {
          // Skip files that can't be read (binary files, permission issues, etc.)
          logger.debug(`Skipping file due to read error: ${file}`, fileError);
        }
      }

      logger.info(`Search completed: found ${results.length} matches for "${query}"`);
      return results;
    } catch (error) {
      logger.error(`Codebase search failed for query: ${query}`, error);
      throw error;
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(path.resolve(filePath));
      return true;
    } catch {
      return false;
    }
  }

  async createDirectory(dirPath: string): Promise<void> {
    try {
      await fs.ensureDir(path.resolve(dirPath));
      logger.info(`Directory created: ${dirPath}`);
    } catch (error) {
      logger.error(`Failed to create directory: ${dirPath}`, error);
      throw error;
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.remove(path.resolve(filePath));
      logger.info(`File deleted: ${filePath}`);
    } catch (error) {
      logger.error(`Failed to delete file: ${filePath}`, error);
      throw error;
    }
  }

  async copyFile(sourcePath: string, targetPath: string): Promise<void> {
    try {
      const resolvedSource = path.resolve(sourcePath);
      const resolvedTarget = path.resolve(targetPath);
      await fs.ensureDir(path.dirname(resolvedTarget));
      await fs.copy(resolvedSource, resolvedTarget);
      logger.info(`File copied from ${sourcePath} to ${targetPath}`);
    } catch (error) {
      logger.error(`Failed to copy file from ${sourcePath} to ${targetPath}`, error);
      throw error;
    }
  }

  async getFileStats(filePath: string): Promise<fs.Stats> {
    try {
      return await fs.stat(path.resolve(filePath));
    } catch (error) {
      logger.error(`Failed to get file stats: ${filePath}`, error);
      throw error;
    }
  }
}