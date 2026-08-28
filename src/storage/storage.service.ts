export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');

export interface FileResource {
  path: string;
  size: number;
  mimeType: string;
}

export interface StorageService {
  save(key: string, data: Buffer): Promise<void>;
  get(key: string, mimeType?: string): Promise<FileResource>;
  readJson<T>(key: string): Promise<T>;
  delete(key: string): Promise<void>;
  deletePrefix(prefix: string): Promise<void>;
}
