/**
 * Orphan file cleanup for Soundify local storage.
 *
 * Usage:
 *   npm run cleanup:storage -- --dry-run
 *   npm run cleanup:storage -- --confirm
 */
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const AUDIO_DIR = path.join(PROJECT_ROOT, 'data/audio');
const ARTWORK_DIR = path.join(PROJECT_ROOT, 'data/artwork');

const prisma = new PrismaClient();

async function listFiles(dir: string): Promise<string[]> {
  if (!fs.existsSync(dir)) return [];
  const entries = await fs.promises.readdir(dir);
  return entries.filter((f) => f !== '.gitkeep' && !f.startsWith('.'));
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || !args.includes('--confirm');

  console.log(`[cleanup] Mode: ${dryRun ? 'DRY-RUN (pass --confirm to delete)' : 'CONFIRM DELETE'}`);

  const songs = await prisma.song.findMany({
    select: { audioRelativePath: true, coverRelativePath: true },
  });

  const referenced = new Set<string>();
  for (const s of songs) {
    if (s.audioRelativePath) referenced.add(path.basename(s.audioRelativePath));
    if (s.coverRelativePath) referenced.add(path.basename(s.coverRelativePath));
  }

  const audioFiles = await listFiles(AUDIO_DIR);
  const artworkFiles = await listFiles(ARTWORK_DIR);

  const orphanAudio = audioFiles.filter((f) => !referenced.has(f));
  const orphanArtwork = artworkFiles.filter((f) => !referenced.has(f));

  console.log(`[cleanup] Referenced files: ${referenced.size}`);
  console.log(`[cleanup] Orphan audio (${orphanAudio.length}):`, orphanAudio);
  console.log(`[cleanup] Orphan artwork (${orphanArtwork.length}):`, orphanArtwork);

  if (dryRun) {
    console.log('[cleanup] No files deleted (dry-run).');
    return;
  }

  for (const f of orphanAudio) {
    await fs.promises.unlink(path.join(AUDIO_DIR, f));
    console.log(`[cleanup] Deleted audio/${f}`);
  }
  for (const f of orphanArtwork) {
    await fs.promises.unlink(path.join(ARTWORK_DIR, f));
    console.log(`[cleanup] Deleted artwork/${f}`);
  }

  console.log('[cleanup] Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
