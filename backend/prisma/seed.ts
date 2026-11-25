import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../src/config/database';
import { config } from '../src/config/env';
import { AUDIO_DIR, ARTWORK_DIR, ensureStorageDirectories } from '../src/config/paths';

const DEMO_AUDIO = path.resolve(__dirname, '../public/demo');

async function copyIfExists(src: string, dest: string) {
  if (!fs.existsSync(src)) return false;
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  await fs.promises.copyFile(src, dest);
  return true;
}

async function main() {
  if (config.env === 'production') throw new Error('Demo seeding is available in development only.');
  ensureStorageDirectories();

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
    const audioDest = path.join(AUDIO_DIR, audioName);
    const coverDest = path.join(ARTWORK_DIR, coverName);

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
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
