/**
 * File system service implementation
 * Wraps Node.js file system operations for dependency injection
 */

import {
  appendFileSync,
  existsSync,
  promises as fs,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import * as path from "node:path";
import type { IFileSystemService } from "../interfaces";

export class FileSystemService implements IFileSystemService {
  /**
   * Reads file content as string
   */
  async readFile(filePath: string, encoding: string = "utf8"): Promise<string> {
    return await fs.readFile(filePath, {
      encoding: encoding as BufferEncoding,
    });
  }

  /**
   * Synchronously reads file content as string
   */
  readFileSync(filePath?: string, encoding: string = "utf8"): string {
    if (!filePath) {
      throw new Error("File path is undefined");
    }

    return readFileSync(filePath, {
      encoding: encoding as BufferEncoding,
    });
  }

  /**
   * Writes content to file
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    await fs.writeFile(filePath, content, "utf8");
  }

  /**
   * Synchronously writes content to file
   */
  writeFileSync(filePath: string, content: string): void {
    writeFileSync(filePath, content, "utf8");
  }

  /**
   * Synchronously appends content to file
   */
  appendFileSync(filePath: string, content: string): void {
    appendFileSync(filePath, content, "utf8");
  }

  /**
   * Checks if path exists
   */
  existsSync(filePath?: string): boolean {
    if (!filePath) {
      return false;
    }
    return existsSync(filePath);
  }

  /**
   * Creates directory with optional recursive option
   */
  mkdir(dirPath: string, options?: { recursive: boolean }): void {
    mkdirSync(dirPath, options);
  }

  /**
   * Joins path segments
   */
  join(...paths: string[]): string {
    return path.join(...paths);
  }

  /**
   * Resolves absolute path
   */
  resolve(...paths: string[]): string {
    return path.resolve(...paths);
  }

  /**
   * Gets directory name from path
   */
  dirname(filePath: string): string {
    return path.dirname(filePath);
  }

  /**
   * Gets base name from path
   */
  basename(filePath: string): string {
    return path.basename(filePath);
  }
}
