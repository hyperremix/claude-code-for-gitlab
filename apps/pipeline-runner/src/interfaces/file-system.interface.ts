export interface IFileSystemService {
  readFile(path: string, encoding?: string): Promise<string>;
  readFileSync(path?: string, encoding?: string): string;
  writeFile(path: string, content: string): Promise<void>;
  writeFileSync(path: string, content: string): void;
  appendFileSync(path: string, content: string): void;
  existsSync(path?: string): boolean;
  mkdir(path: string, options?: { recursive: boolean }): void;
  join(...paths: string[]): string;
  resolve(...paths: string[]): string;
  dirname(path: string): string;
  basename(path: string): string;
}
