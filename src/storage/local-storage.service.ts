import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve, sep } from 'node:path';
import { FileResource, StorageService } from './storage.service';

@Injectable()
export class LocalStorageService implements StorageService {
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root = resolve(config.get('LOCAL_STORAGE_PATH', '../data'));
  }

  async save(key: string, data: Buffer) {
    const path = this.resolveKey(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
  }

  async get(key: string, mimeType = 'application/octet-stream'): Promise<FileResource> {
    const path = this.resolveKey(key);
    try {
      const info = await stat(path);
      if (!info.isFile()) throw new Error('Not a file');
      return { path, size: info.size, mimeType };
    } catch {
      throw new NotFoundException('Stored file not found.');
    }
  }

  async readJson<T>(key: string): Promise<T> {
    const file = await this.get(key, 'application/json');
    return JSON.parse(await readFile(file.path, 'utf8')) as T;
  }

  async delete(key: string) {
    await rm(this.resolveKey(key), { force: true });
  }

  async deletePrefix(prefix: string) {
    await rm(this.resolveKey(prefix), { recursive: true, force: true });
  }

  private resolveKey(key: string) {
    if (!key || isAbsolute(key) || key.includes('\0')) throw new Error('Invalid storage key.');
    const path = resolve(this.root, key.replaceAll('/', sep));
    if (path !== this.root && !path.startsWith(`${this.root}${sep}`)) throw new Error('Invalid storage key.');
    return path;
  }
}
