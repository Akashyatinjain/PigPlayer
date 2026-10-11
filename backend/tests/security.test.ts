import fs from 'fs';
import os from 'os';
import path from 'path';
import express from 'express';
import request from 'supertest';
import app from '../src/app';
import { config } from '../src/config/env';
import { AuthRequest } from '../src/types';
import { AppError } from '../src/middleware/error.middleware';
import { requireMutationAuth, requireProductionAdmin } from '../src/middleware/auth.middleware';
import { PlaylistService } from '../src/services/playlist.service';
import { PlaylistRepository } from '../src/repositories/playlist.repository';
import { MediaService, streamFileWithRange } from '../src/services/media.service';
import { SongService } from '../src/services/song.service';
import { TEMP_DIR, ensureStorageDirectories } from '../src/config/paths';

describe('security and playback regressions', () => {
  it('allows the configured frontend origin and omits CORS access for an unknown origin', async () => {
    const allowedOrigin = new URL(config.clientUrl).origin;
    const allowed = await request(app).get('/health').set('Origin', allowedOrigin);
    expect(allowed.headers['access-control-allow-origin']).toBe(allowedOrigin);

    const vercelOrigin = 'https://pig-player.vercel.app';
    const vercelAllowed = await request(app).get('/health').set('Origin', vercelOrigin);
    expect(vercelAllowed.headers['access-control-allow-origin']).toBe(vercelOrigin);

    const previewOrigin = 'https://pig-player-preview-test.vercel.app';
    const previewAllowed = await request(app).get('/health').set('Origin', previewOrigin);
    expect(previewAllowed.headers['access-control-allow-origin']).toBe(previewOrigin);

    const preflight = await request(app)
      .options('/api/upload/song')
      .set('Origin', vercelOrigin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type,Authorization');
    expect(preflight.status).toBe(204);
    expect(preflight.headers['access-control-allow-origin']).toBe(vercelOrigin);
    expect(preflight.headers['access-control-allow-methods']).toContain('POST');

    const blocked = await request(app).get('/health').set('Origin', 'https://attacker.invalid');
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('requires a token for mutations and admin routes in production', () => {
    const previousEnv = config.env;
    config.env = 'production';
    try {
      const req = { headers: {} } as AuthRequest;
      const res = {} as never;
      const mutationNext = jest.fn();
      requireMutationAuth(req, res, mutationNext);
      expect((mutationNext.mock.calls[0][0] as AppError).statusCode).toBe(401);

      const adminNext = jest.fn();
      requireProductionAdmin(req, res, adminNext);
      expect((adminNext.mock.calls[0][0] as AppError).statusCode).toBe(401);
    } finally {
      config.env = previousEnv;
    }
  });

  it('rejects writes to another user’s playlist when the caller is logged out', async () => {
    const findById = jest.spyOn(PlaylistRepository, 'findById').mockResolvedValue({
      id: 'private-playlist',
      userId: 'playlist-owner',
    } as never);
    try {
      await expect(PlaylistService.deletePlaylist('private-playlist')).rejects.toMatchObject({
        statusCode: 403,
      });
    } finally {
      findById.mockRestore();
    }
  });

  it('streams a valid range and rejects malformed/multiple ranges', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soundify-range-'));
    const target = path.join(tempDir, 'sample.wav');
    fs.writeFileSync(target, Buffer.from('0123456789abcdef'));
    const testApp = express();
    testApp.get('/audio', (req, res) => streamFileWithRange(req, res, target, 'audio/wav'));

    try {
      const partial = await request(testApp).get('/audio').set('Range', 'bytes=2-5');
      expect(partial.status).toBe(206);
      expect(partial.headers['content-range']).toBe('bytes 2-5/16');
      expect(partial.body.toString()).toBe('2345');
      expect(partial.headers['cache-control']).toContain('no-cache');

      // A normal request close must not truncate the next stream for this same song URL.
      const full = await request(testApp).get('/audio');
      expect(full.status).toBe(200);
      expect(full.body.toString()).toBe('0123456789abcdef');

      const malformed = await request(testApp).get('/audio').set('Range', 'bytes=0-2,5-7');
      expect(malformed.status).toBe(416);
      expect(malformed.headers['content-range']).toBe('bytes */16');
    } finally {
      if (path.resolve(tempDir).startsWith(path.resolve(os.tmpdir()) + path.sep)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });

  it('refuses to create a song whose audio file is inside temporary storage', async () => {
    ensureStorageDirectories();
    const filename = `song-lifecycle-${Date.now()}.mp3`;
    const absolutePath = path.join(TEMP_DIR, filename);
    fs.writeFileSync(absolutePath, Buffer.alloc(32));
    try {
      await expect(
        SongService.createSong({
          title: 'Temporary file regression',
          artist: 'Test',
          audioRelativePath: `temp/${filename}`,
        })
      ).rejects.toMatchObject({ statusCode: 400 });
    } finally {
      if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
    }
  });

  it('does not stream a different track when a managed audio path is missing', async () => {
    const getSongRaw = jest.spyOn(SongService, 'getSongRaw').mockResolvedValue({
      id: 'missing-audio',
      audioRelativePath: 'audio/not-on-disk.mp3',
      mimeType: 'audio/mpeg',
    } as never);
    try {
      await expect(
        MediaService.streamAudio(
          { params: { id: 'missing-audio' }, headers: {} } as never,
          {} as never
        )
      ).rejects.toMatchObject({ statusCode: 404 });
    } finally {
      getSongRaw.mockRestore();
    }
  });
});
