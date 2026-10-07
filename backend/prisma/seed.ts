import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DEMO_AUDIO = path.join(PROJECT_ROOT, 'frontend/public/demo');
const DATA_AUDIO = path.join(PROJECT_ROOT, 'data/audio');
const DATA_ARTWORK = path.join(PROJECT_ROOT, 'data/artwork');

async function copyIfExists(src: string, dest: string) {
  if (!fs.existsSync(src)) return false;
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  await fs.promises.copyFile(src, dest);
  return true;
}

async function main() {
  console.log('[Seed] Seeding Soundify local SQLite database...');

  await fs.promises.mkdir(DATA_AUDIO, { recursive: true });
  await fs.promises.mkdir(DATA_ARTWORK, { recursive: true });

  const hashedPassword = await bcrypt.hash('soundify', 10);
  const localUser = await prisma.user.upsert({
    where: { email: 'local@soundify.app' },
    update: {},
    create: {
      email: 'local@soundify.app',
      name: 'Local User',
      password: hashedPassword,
      role: 'user',
    },
  });

  const demoHashed = await bcrypt.hash('password123', 10);
  await prisma.user.upsert({
    where: { email: 'demo@soundify.app' },
    update: {},
    create: {
      email: 'demo@soundify.app',
      name: 'Demo Listener',
      password: demoHashed,
      role: 'user',
    },
  });

  console.log(`[Seed] Local user: local@soundify.app / soundify`);
  console.log(`[Seed] Demo user: demo@soundify.app / password123`);

  const count = await prisma.song.count();
  if (count > 0) {
    console.log(`[Seed] Database already has ${count} songs. Skipping demo tracks.`);
    return;
  }

  const demos = [
    {
      title: 'Midnight Drift',
      artist: 'Soundify Demo',
      album: 'Local Library',
      genre: 'Ambient',
      audio: 'midnight-drift.wav',
      cover: 'covers/cover-1.svg',
    },
    {
      title: 'Golden Hour Glow',
      artist: 'Soundify Demo',
      album: 'Local Library',
      genre: 'Chill',
      audio: 'golden-hour-glow.wav',
      cover: 'covers/cover-2.svg',
    },
    {
      title: 'Velvet Horizons',
      artist: 'Soundify Demo',
      album: 'Local Library',
      genre: 'Electronic',
      audio: 'velvet-horizons.wav',
      cover: 'covers/cover-3.svg',
    },
    {
      title: 'Echoes of Silence',
      artist: 'Soundify Demo',
      album: 'Local Library',
      genre: 'Lo-Fi',
      audio: 'echoes-of-silence.wav',
      cover: 'covers/cover-4.svg',
    },
    {
      title: 'Quantum Horizons',
      artist: 'Soundify Demo',
      album: 'Local Library',
      genre: 'Synthwave',
      audio: 'quantum-horizons.wav',
      cover: 'covers/cover-5.svg',
    },
  ];

  const createdIds: string[] = [];

  for (let i = 0; i < demos.length; i++) {
    const d = demos[i];
    const audioName = `demo_${i + 1}_${d.audio}`;
    const coverName = `demo_${i + 1}_cover${path.extname(d.cover)}`;
    const audioDest = path.join(DATA_AUDIO, audioName);
    const coverDest = path.join(DATA_ARTWORK, coverName);

    const audioOk = await copyIfExists(path.join(DEMO_AUDIO, d.audio), audioDest);
    const coverOk = await copyIfExists(path.join(DEMO_AUDIO, d.cover), coverDest);

    if (!audioOk) {
      console.warn(`[Seed] Missing demo audio: ${d.audio} — skipping`);
      continue;
    }

    const stat = await fs.promises.stat(audioDest);
    const song = await prisma.song.create({
      data: {
        title: d.title,
        artist: d.artist,
        album: d.album,
        genre: d.genre,
        duration: 30,
        trackNumber: i + 1,
        releaseYear: 2026,
        audioRelativePath: `audio/${audioName}`,
        audioFileName: audioName,
        coverRelativePath: coverOk ? `artwork/${coverName}` : null,
        coverFileName: coverOk ? coverName : null,
        originalFileName: d.audio,
        mimeType: 'audio/wav',
        fileSize: stat.size,
        isDownloadable: true,
        userId: localUser.id,
        audioUrl: '',
        coverUrl: null,
      },
    });

    await prisma.song.update({
      where: { id: song.id },
      data: {
        audioUrl: `/api/songs/${song.id}/audio`,
        coverUrl: coverOk ? `/api/songs/${song.id}/artwork` : null,
      },
    });

    createdIds.push(song.id);
  }

  if (createdIds.length) {
    await prisma.playlist.create({
      data: {
        name: 'Welcome Mix',
        description: 'Local demo tracks — no internet required.',
        userId: localUser.id,
        songs: {
          create: createdIds.map((songId, idx) => ({
            songId,
            position: idx,
          })),
        },
      },
    });
    console.log(`[Seed] Seeded ${createdIds.length} local demo tracks + Welcome Mix playlist.`);
  }

  console.log('[Seed] Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('[Seed] Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
