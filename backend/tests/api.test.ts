import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/database';
import { ensureStorageDirectories, AUDIO_DIR, BACKUPS_DIR } from '../src/config/paths';
import { bootstrapLocalApp } from '../src/services/bootstrap.service';
import { config } from '../src/config/env';

describe('Soundify Offline-First API Suite', () => {
  let authToken = '';
  let adminToken = '';
  let secondUserToken = '';
  let testUserId = '';
  let testSongId = '';
  let testPlaylistId = '';
  let testBackupFileName = '';
  const testUserEmail = `test_${Date.now()}@soundify.app`;
  const createdAudioFiles: string[] = [];

  beforeAll(async () => {
    ensureStorageDirectories();
    await bootstrapLocalApp();
    const admin = await request(app).post('/api/auth/login').send(config.localUser);
    expect(admin.status).toBe(200);
    adminToken = admin.body.data.accessToken;
    const secondUser = await request(app).post('/api/auth/register').send({
      name: 'Second Listener', email: 'second@test.example', password: 'secondUserPassword123!',
    });
    expect(secondUser.status).toBe(201);
    secondUserToken = secondUser.body.data.accessToken;
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
      if (testBackupFileName) {
        const backupPath = path.join(BACKUPS_DIR, testBackupFileName);
        if (fs.existsSync(backupPath)) await fs.promises.unlink(backupPath);
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

    it('reports readiness against the initialized schema', async () => {
      const res = await request(app).get('/api/ready');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ready' });
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

    it('rotates refresh tokens once and revokes both tokens on logout', async () => {
      const login = await request(app).post('/api/auth/login').send({
        email: testUserEmail, password: 'securePassword123!',
      }).expect(200);
      const initial = login.body.data;
      expect(login.headers['cache-control']).toBe('no-store');
      await request(app).get('/api/auth/me')
        .set('Authorization', `Bearer ${initial.refreshToken}`).expect(401);

      const attempts = await Promise.all([
        request(app).post('/api/auth/refresh').send({ refreshToken: initial.refreshToken }),
        request(app).post('/api/auth/refresh').send({ refreshToken: initial.refreshToken }),
      ]);
      expect(attempts.map((res) => res.status).sort()).toEqual([200, 401]);
      const rotated = attempts.find((res) => res.status === 200)!.body.data;
      expect(rotated.refreshToken).not.toBe(initial.refreshToken);
      expect(rotated.user.password).toBeUndefined();
      await request(app).get('/api/auth/me').set('Authorization', `Bearer ${rotated.accessToken}`).expect(200);
      await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${rotated.accessToken}`).expect(200);
      await request(app).get('/api/auth/me').set('Authorization', `Bearer ${rotated.accessToken}`).expect(401);
      await request(app).post('/api/auth/refresh').send({ refreshToken: rotated.refreshToken }).expect(401);
      await request(app).get('/api/auth/me').set('Authorization', `Bearer ${authToken}`).expect(200);
    });

    it('enforces bcrypt byte limits and rejects normalized duplicate emails', async () => {
      await request(app).post('/api/auth/register').send({
        name: 'Long Password', email: 'long@test.example', password: '🚀'.repeat(19),
      }).expect(400);
      await request(app).post('/api/auth/register').send({
        name: 'Duplicate User', email: testUserEmail.toUpperCase(), password: 'anotherPassword123!',
      }).expect(409);
    });
  });

  describe('3. Upload, Duplicate, Stream, Download', () => {
    let fileHash = '';

    it('POST /api/upload/song creates a local song', async () => {
      const wav = makeMinimalWav();
      fileHash = createHash('sha256').update(wav).digest('hex');
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
      const res = await request(app).get('/api/search').query({ q: 'neon' });
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

    it('rejects malformed filters and keeps page shape stable', async () => {
      await request(app).get('/api/songs').query({ page: '2x' }).expect(400);
      await request(app).get('/api/songs').query({ limit: 0 }).expect(400);
      await request(app).get('/api/search?q=Neon&q=Other').expect(400);
      const page = await request(app).get('/api/songs').query({ page: 1, limit: 1 }).expect(200);
      expect(page.body.pagination).toMatchObject({ page: 1, limit: 1, total: 1, totalPages: 1 });
      expect(page.body.data[0].id).toBe(testSongId);
    });

    it('validates multipart metadata and forbids edits by another listener', async () => {
      await request(app).post('/api/upload/song').set('Authorization', `Bearer ${authToken}`)
        .field('duration', 'invalid').attach('audio', makeMinimalWav(), 'valid.wav').expect(400);
      await request(app).put(`/api/songs/${testSongId}`).set('Authorization', `Bearer ${secondUserToken}`)
        .send({ title: 'Unauthorized change' }).expect(403);
      await request(app).delete(`/api/songs/${testSongId}`)
        .set('Authorization', `Bearer ${secondUserToken}`).expect(403);
      await request(app).post('/api/upload/song').set('Authorization', `Bearer ${secondUserToken}`)
        .field('duplicatePolicy', 'replace').attach('audio', makeMinimalWav(), 'same.wav').expect(403);
      const song = await request(app).get(`/api/songs/${testSongId}`).expect(200);
      expect(song.body.data.title).toBe('Neon Horizon');
    });

    it('analyzes audio without creating songs and validates uploaded artwork', async () => {
      const analysis = await request(app).post('/api/upload/analyze').set('Authorization', `Bearer ${authToken}`)
        .attach('audio', makeMinimalWav(), 'Song For Analysis.wav').expect(200);
      expect(analysis.body.data).toMatchObject({ fileHash, hasEmbeddedArtwork: false });
      expect(analysis.body.data.duplicate.matchType).toBe('exact');
      const invalid = await request(app).post('/api/upload/artwork').set('Authorization', `Bearer ${authToken}`)
        .send({ imageData: 'bad data' }).expect(400);
      expect(invalid.body.success).toBe(false);
      const pixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aYuoAAAAASUVORK5CYII=';
      const artwork = await request(app).post('/api/upload/artwork').set('Authorization', `Bearer ${authToken}`)
        .send({ imageData: `data:image/png;base64,${pixel}` }).expect(200);
      await request(app).put(`/api/songs/${testSongId}`).set('Authorization', `Bearer ${authToken}`)
        .send({ coverRelativePath: artwork.body.data.coverRelativePath }).expect(200);
      const cover = await request(app).get(`/api/songs/${testSongId}/artwork`).expect(200);
      expect(cover.headers['content-type']).toBe('image/png');
      expect(cover.body).toEqual(Buffer.from(pixel, 'base64'));
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

    it('returns 404 when adding non-existent song to playlist or favorites', async () => {
      const plRes = await request(app)
        .post(`/api/playlists/${testPlaylistId}/songs`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ songId: 'non-existent-song-id' });
      expect(plRes.status).toBe(404);

      const favRes = await request(app)
        .post('/api/favorites/non-existent-song-id')
        .set('Authorization', `Bearer ${authToken}`);
      expect(favRes.status).toBe(404);
    });

    it('returns 404 when streaming non-existent song', async () => {
      const res = await request(app).get('/api/songs/non-existent-song-id/audio');
      expect(res.status).toBe(404);
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

    it('isolates playlists, search, history, and statistics between listeners', async () => {
      const anonymousPlaylists = await request(app).get('/api/playlists').expect(200);
      expect(anonymousPlaylists.body.data).toEqual([]);
      const anonymousHistory = await request(app).get('/api/history').expect(200);
      expect(anonymousHistory.body.data).toEqual([]);
      const secondPlaylists = await request(app).get('/api/search').query({ q: 'Test Mix' })
        .set('Authorization', `Bearer ${secondUserToken}`).expect(200);
      expect(secondPlaylists.body.data.playlists).toEqual([]);
      await request(app).get(`/api/playlists/${testPlaylistId}`)
        .set('Authorization', `Bearer ${secondUserToken}`).expect(403);
      await request(app).get('/api/history').set('Authorization', 'Bearer invalid').expect(401);
      await request(app).delete('/api/history').expect(401);
      await request(app).delete('/api/history').set('Authorization', `Bearer ${secondUserToken}`).expect(200);
      const ownerStats = await request(app).get('/api/songs/stats').set('Authorization', `Bearer ${authToken}`).expect(200);
      const otherStats = await request(app).get('/api/songs/stats').set('Authorization', `Bearer ${secondUserToken}`).expect(200);
      expect(ownerStats.body.data.listeningHistoryCount).toBe(1);
      expect(otherStats.body.data.listeningHistoryCount).toBe(0);
      await request(app).post('/api/history').set('Authorization', `Bearer ${authToken}`)
        .send({ songId: testSongId, durationPlayed: -1 }).expect(400);
      await request(app).put(`/api/playlists/${testPlaylistId}/reorder`)
        .set('Authorization', `Bearer ${authToken}`).send({ songIds: [] }).expect(400);
    });
  });

  describe('5. Backup & Delete', () => {
    it('creates a local backup zip', async () => {
      const res = await request(app)
        .post('/api/backups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ includeMedia: false });
      expect(res.status).toBe(201);
      expect(res.body.data.fileName).toMatch(/\.zip$/);
      testBackupFileName = res.body.data.fileName;
    });

    it('exports library JSON', async () => {
      const res = await request(app)
        .get('/api/backups/export')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.songs).toBeDefined();
    });

    it('merges an exported snapshot without duplicating play history', async () => {
      const exported = await request(app).get('/api/backups/export').set('Authorization', `Bearer ${adminToken}`).expect(200);
      const imported = await request(app).post('/api/backups/import').set('Authorization', `Bearer ${adminToken}`)
        .send({ library: exported.body.data, mode: 'merge' }).expect(200);
      expect(imported.body.data).toMatchObject({ skippedSongs: 1, importedSongs: 0, importedPlaylists: 0 });
      const history = await request(app).get('/api/history').set('Authorization', `Bearer ${authToken}`).expect(200);
      expect(history.body.data).toHaveLength(1);
    });

    it('restricts destructive endpoints, previews backups, and validates confirmation', async () => {
      await request(app).get('/api/backups').set('Authorization', `Bearer ${authToken}`).expect(403);
      await request(app).delete('/api/songs/all').set('Authorization', `Bearer ${authToken}`).expect(403);
      const preview = await request(app).post('/api/backups/restore')
        .set('Authorization', `Bearer ${adminToken}`).send({ fileName: testBackupFileName }).expect(200);
      expect(preview.body.data).toMatchObject({ preview: true, songCount: 1 });
      await request(app).post('/api/backups/restore').set('Authorization', `Bearer ${adminToken}`)
        .send({ fileName: testBackupFileName, confirmReplace: 'false' }).expect(400);
      const restore = await request(app).post('/api/backups/restore').set('Authorization', `Bearer ${adminToken}`)
        .send({ fileName: testBackupFileName, confirmReplace: true }).expect(200);
      expect(restore.body.data).toMatchObject({ restored: true, importedSongs: 1, importedPlaylists: 1 });
      await request(app).get(`/api/songs/${testSongId}/audio`).set('Range', 'bytes=0-3').expect(206);
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
