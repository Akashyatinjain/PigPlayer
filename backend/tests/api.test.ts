import fs from 'fs';
import path from 'path';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/database';
import { ensureStorageDirectories, AUDIO_DIR } from '../src/config/paths';
import { bootstrapLocalApp } from '../src/services/bootstrap.service';

describe('Soundify Offline-First API Suite', () => {
  let authToken = '';
  let testUserId = '';
  let testSongId = '';
  let testPlaylistId = '';
  const testUserEmail = `test_${Date.now()}@soundify.app`;
  const createdAudioFiles: string[] = [];

  beforeAll(async () => {
    ensureStorageDirectories();
    await bootstrapLocalApp();
  });

  afterAll(async () => {
    try {
      if (testPlaylistId) {
        await prisma.playlist.deleteMany({ where: { id: testPlaylistId } });
      }
      if (testSongId) {
        await prisma.song.deleteMany({ where: { id: testSongId } });
      }
      if (testUserId) {
        await prisma.favorite.deleteMany({ where: { userId: testUserId } });
        await prisma.playHistory.deleteMany({ where: { userId: testUserId } });
        await prisma.user.deleteMany({ where: { id: testUserId } });
      }
      for (const f of createdAudioFiles) {
        const p = path.join(AUDIO_DIR, f);
        if (fs.existsSync(p)) await fs.promises.unlink(p);
      }
      await prisma.$disconnect();
    } catch {
      // ignore cleanup errors
    }
  });

  function makeMinimalWav(): Buffer {
    // Minimal valid WAV header + silence
    const dataSize = 64;
    const buffer = Buffer.alloc(44 + dataSize);
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(1, 22);
    buffer.writeUInt32LE(8000, 24);
    buffer.writeUInt32LE(8000, 28);
    buffer.writeUInt16LE(1, 32);
    buffer.writeUInt16LE(8, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    return buffer;
  }

  describe('1. Health Check', () => {
    it('GET /health returns 200 ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.mode).toBe('offline-first');
    });
  });

  describe('2. Authentication Flow', () => {
    it('POST /api/auth/register creates a new user', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Tester User',
        email: testUserEmail,
        password: 'securePassword123!',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      authToken = res.body.data.accessToken;
      testUserId = res.body.data.user.id;
    });

    it('POST /api/auth/login works', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: testUserEmail,
        password: 'securePassword123!',
      });
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('GET /api/auth/me requires token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('3. Upload, Duplicate, Stream, Download', () => {
    const fileHash = `test_hash_${Date.now()}`;

    it('POST /api/upload/song creates a local song', async () => {
      const wav = makeMinimalWav();
      const res = await request(app)
        .post('/api/upload/song')
        .set('Authorization', `Bearer ${authToken}`)
        .field('title', 'Neon Horizon')
        .field('artist', 'Synthetix')
        .field('album', 'Retro Future')
        .field('genre', 'Synthwave')
        .field('duration', '12')
        .field('fileHash', fileHash)
        .attach('audio', wav, 'neon-horizon.wav');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.audioUrl).toContain('/api/songs/');
      testSongId = res.body.data.id;
      if (res.body.data.audioFileName) {
        createdAudioFiles.push(res.body.data.audioFileName);
      }
    });

    it('detects duplicate by hash', async () => {
      const res = await request(app)
        .post('/api/songs/check-duplicate')
        .send({ fileHash });
      expect(res.status).toBe(200);
      expect(res.body.data.isDuplicate).toBe(true);
    });

    it('GET /api/songs lists songs', async () => {
      const res = await request(app).get('/api/songs');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it('GET /api/search finds songs', async () => {
      const res = await request(app).get('/api/search').query({ q: 'Neon' });
      expect(res.status).toBe(200);
      expect(res.body.data.songs.length).toBeGreaterThan(0);
    });

    it('GET /api/songs/:id/audio supports range requests', async () => {
      const res = await request(app)
        .get(`/api/songs/${testSongId}/audio`)
        .set('Range', 'bytes=0-15');
      expect(res.status).toBe(206);
      expect(res.headers['content-range']).toBeDefined();
      expect(res.headers['accept-ranges']).toBe('bytes');
    });

    it('GET /api/songs/:id/download streams attachment', async () => {
      const res = await request(app).get(`/api/songs/${testSongId}/download`);
      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toMatch(/attachment/);
    });

    it('GET /api/songs/stats returns library stats', async () => {
      const res = await request(app).get('/api/songs/stats');
      expect(res.status).toBe(200);
      expect(res.body.data.totalSongs).toBeGreaterThan(0);
    });
  });

  describe('4. Playlists, Favorites, History', () => {
    it('creates and modifies a playlist', async () => {
      const create = await request(app)
        .post('/api/playlists')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Mix', description: 'API test' });
      expect(create.status).toBe(201);
      testPlaylistId = create.body.data.id;

      const add = await request(app)
        .post(`/api/playlists/${testPlaylistId}/songs`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ songId: testSongId });
      expect(add.status).toBe(200);

      const reorder = await request(app)
        .put(`/api/playlists/${testPlaylistId}/reorder`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ songIds: [testSongId] });
      expect([200, 201]).toContain(reorder.status);
    });

    it('favorites a song', async () => {
      const add = await request(app)
        .post(`/api/favorites/${testSongId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(add.status).toBe(200);

      const list = await request(app)
        .get('/api/favorites')
        .set('Authorization', `Bearer ${authToken}`);
      expect(list.status).toBe(200);
      expect(list.body.data.some((s: { id: string }) => s.id === testSongId)).toBe(true);

      const remove = await request(app)
        .delete(`/api/favorites/${testSongId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(remove.status).toBe(200);
    });

    it('records and lists history', async () => {
      const record = await request(app)
        .post('/api/history')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ songId: testSongId, durationPlayed: 5 });
      expect(record.status).toBe(201);

      const list = await request(app)
        .get('/api/history')
        .set('Authorization', `Bearer ${authToken}`);
      expect(list.status).toBe(200);
      expect(list.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('5. Backup & Delete', () => {
    it('creates a local backup zip', async () => {
      const res = await request(app)
        .post('/api/backups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ includeMedia: false });
      expect(res.status).toBe(201);
      expect(res.body.data.fileName).toMatch(/\.zip$/);
    });

    it('exports library JSON', async () => {
      const res = await request(app)
        .get('/api/backups/export')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.songs).toBeDefined();
    });

    it('deletes a song and removes DB row', async () => {
      const res = await request(app)
        .delete(`/api/songs/${testSongId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      const get = await request(app).get(`/api/songs/${testSongId}`);
      expect(get.status).toBe(404);
      testSongId = '';
    });
  });
});
