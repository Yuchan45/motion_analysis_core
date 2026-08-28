import { createReadStream } from 'node:fs';
import { Request, Response } from 'express';
import { FileResource } from './storage.service';

export function streamFile(resource: FileResource, request: Request, response: Response, filename?: string) {
  response.setHeader('Accept-Ranges', 'bytes');
  response.setHeader('Content-Type', resource.mimeType);
  if (filename) response.setHeader('Content-Disposition', `inline; filename="${filename.replaceAll('"', '')}"`);
  const range = request.headers.range;
  if (!range) {
    response.setHeader('Content-Length', resource.size);
    createReadStream(resource.path).pipe(response);
    return;
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match) return response.status(416).setHeader('Content-Range', `bytes */${resource.size}`).end();
  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Number(match[2]) : resource.size - 1;
  if (start > end || end >= resource.size) {
    return response.status(416).setHeader('Content-Range', `bytes */${resource.size}`).end();
  }
  response.status(206);
  response.setHeader('Content-Range', `bytes ${start}-${end}/${resource.size}`);
  response.setHeader('Content-Length', end - start + 1);
  createReadStream(resource.path, { start, end }).pipe(response);
}
