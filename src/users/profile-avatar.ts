import { BadRequestException, UnsupportedMediaTypeException } from '@nestjs/common';
import { ProfileImageSourceType } from '@prisma/client';
import { RegistrationAvatar } from './users.repository';

export const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;
export const DICEBEAR_STYLES = new Set(['waves', 'stack', 'stripes', 'initial-face', 'patchwork']);

type DetectedImage = { mimeType: 'image/jpeg' | 'image/png' | 'image/webp'; extension: '.jpg' | '.png' | '.webp' };
export type PreparedProfileAvatar = { metadata: RegistrationAvatar; file?: DetectedImage & { buffer: Buffer } };
export type ProfileAvatarInput = { avatarSource?: 'none' | 'upload' | 'generated'; diceBearStyle?: string; diceBearSeed?: string };

export function prepareProfileAvatar(input: ProfileAvatarInput, file?: Express.Multer.File): PreparedProfileAvatar | undefined {
  if (!input.avatarSource) {
    if (file || input.diceBearStyle || input.diceBearSeed) throw new BadRequestException('Avatar source is required when changing a profile image.');
    return undefined;
  }
  if (input.avatarSource === 'none') {
    if (file || input.diceBearStyle || input.diceBearSeed) throw new BadRequestException('Avatar source fields are inconsistent.');
    return undefined;
  }
  if (input.avatarSource === 'generated') {
    if (file || !input.diceBearStyle || !input.diceBearSeed || !DICEBEAR_STYLES.has(input.diceBearStyle)) {
      throw new BadRequestException('Invalid DiceBear avatar selection.');
    }
    return {
      metadata: {
        sourceType: ProfileImageSourceType.GENERATED,
        provider: 'dicebear',
        url: `https://api.dicebear.com/10.x/${input.diceBearStyle}/svg?seed=${encodeURIComponent(input.diceBearSeed)}`,
      },
    };
  }
  if (!file) throw new BadRequestException('A profile image is required.');
  if (input.diceBearStyle || input.diceBearSeed) throw new BadRequestException('Avatar source fields are inconsistent.');
  if (file.size > MAX_PROFILE_IMAGE_BYTES) throw new BadRequestException('Profile image must not exceed 5 MB.');
  const detected = detectImage(file.buffer);
  if (!detected) throw new UnsupportedMediaTypeException('Profile image must be a JPEG, PNG, or WebP file.');
  return {
    metadata: { sourceType: ProfileImageSourceType.MANAGED, mimeType: detected.mimeType, sizeBytes: file.size },
    file: { ...detected, buffer: file.buffer },
  };
}

function detectImage(buffer: Buffer): DetectedImage | null {
  if (buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return { mimeType: 'image/jpeg', extension: '.jpg' };
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mimeType: 'image/png', extension: '.png' };
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return { mimeType: 'image/webp', extension: '.webp' };
  return null;
}
