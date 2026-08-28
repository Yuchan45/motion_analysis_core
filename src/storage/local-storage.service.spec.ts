import { ConfigService } from '@nestjs/config';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalStorageService } from './local-storage.service';

describe('LocalStorageService', () => {
  let root: string;
  let storage: LocalStorageService;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'motion-storage-'));
    storage = new LocalStorageService({ get: () => root } as unknown as ConfigService);
  });

  afterEach(() => rm(root, { recursive: true, force: true }));

  it('stores and reads JSON inside the configured root', async () => {
    await storage.save('users/u/video.json', Buffer.from('{"ok":true}'));
    await expect(storage.readJson('users/u/video.json')).resolves.toEqual({ ok: true });
  });

  it('rejects path traversal', async () => {
    await expect(storage.save('../escape.txt', Buffer.from('x'))).rejects.toThrow('Invalid storage key');
  });
});
