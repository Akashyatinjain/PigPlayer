import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { openPromise } from 'yauzl';
import { ZipFile } from 'yazl';
import { AppError } from '../../middleware/error.middleware';

export async function writeBackupArchive(
  target: string,
  library: unknown,
  database: string | undefined,
  mediaDirs: Array<{ folder: string; source: string }>,
) {
  const media = await Promise.all(mediaDirs.map(async ({ folder, source }) => ({
    folder,
    source,
    entries: await fs.promises.readdir(source, { withFileTypes: true }),
  })));
  const archive = new ZipFile();
  const output = fs.createWriteStream(target, { mode: 0o600, flags: 'wx' });
  archive.on('error', (error) => output.destroy(error));
  const written = pipeline(archive.outputStream, output);
  try {
    archive.addBuffer(Buffer.from(JSON.stringify(library)), 'library.json');
    if (database) archive.addFile(database, 'soundify.db');
    for (const { folder, source, entries } of media) {
      for (const entry of entries) {
        if (entry.isFile()) {
          archive.addFile(path.join(source, entry.name), `${folder}/${entry.name}`, { compress: false });
        }
      }
    }
    archive.end();
  } catch (error) {
    output.destroy(error as Error);
  }
  await written;
}

export async function extractBackupArchive(source: string, staging: string) {
  const maxArchiveBytes = 20 * 1024 ** 3;
  const maxLibraryBytes = 50 * 1024 ** 2;
  const maxMediaBytes = 100 * 1024 ** 2;
  try {
    const archive = await openPromise(source, {
      autoClose: false, strictFileNames: true, validateEntrySizes: true,
    });
    try {
      let totalBytes = 0;
      if (archive.entryCount > 100_000) throw new Error('Too many archive entries');
      for await (const entry of archive.eachEntry()) {
        const name = entry.fileName;
        const type = (entry.externalFileAttributes >>> 16) & 0o170000;
        totalBytes += entry.uncompressedSize;
        if (totalBytes > maxArchiveBytes || entry.isEncrypted()) throw new Error('Unsupported ZIP entry');

        if (name === 'audio/' || name === 'artwork/') {
          if (type !== 0 && type !== 0o040000) throw new Error('Invalid directory type');
          continue;
        }
        if (type !== 0 && type !== 0o100000) throw new Error('ZIP entries must be regular files');
        if (name === 'soundify.db') continue;
        const media = /^(audio|artwork)\/[^/\\:\x00-\x1f]+$/.test(name);
        if ((!media && name !== 'library.json') ||
            entry.uncompressedSize > (media ? maxMediaBytes : maxLibraryBytes)) {
          throw new Error('Unsupported backup entry or file size');
        }
        const target = path.join(staging, name);
        await fs.promises.mkdir(path.dirname(target), { recursive: true });
        const data = await archive.openReadStreamPromise(entry);
        await pipeline(data, fs.createWriteStream(target, { mode: 0o600, flags: 'wx' }));
      }
    } finally {
      archive.close();
    }
  } catch {
    throw new AppError('Backup ZIP is invalid or exceeds restore limits.', 400);
  }
}
