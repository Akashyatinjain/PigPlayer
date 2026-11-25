import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { once } from 'node:events';

it('migrates a legacy library when the server is started directly', async () => {
  const backend = path.resolve(__dirname, '..');
  const storage = mkdtempSync(path.join(process.env.DATA_DIR!, 'startup-'));
  const database = path.join(storage, 'legacy.db');
  const probe = createServer().listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const address = probe.address();
  await new Promise<void>((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  if (!address || typeof address === 'string') throw new Error('Could not allocate a test port');

  execFileSync(process.execPath, ['-e', `
    const { DatabaseSync } = require('node:sqlite');
    const { readFileSync } = require('node:fs');
    const db = new DatabaseSync(process.env.SQLITE_PATH);
    db.exec(readFileSync('prisma/migrations/0001_library.sql', 'utf8'));
    db.prepare('INSERT INTO Song (id, title, artist, audioRelativePath, updatedAt) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)')
      .run('legacy-song', 'Stored Song', 'Stored Artist', 'audio/original.wav');
    db.close();
  `], { cwd: backend, env: { ...process.env, SQLITE_PATH: database }, stdio: 'pipe' });

  const server = spawn(process.execPath, ['-r', 'ts-node/register/transpile-only', 'src/server.ts'], {
    cwd: backend,
    env: { ...process.env, PORT: String(address.port), SQLITE_PATH: database, DATA_DIR: storage },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  server.stdout.on('data', (data) => { log += String(data); });
  server.stderr.on('data', (data) => { log += String(data); });
  try {
    const origin = `http://127.0.0.1:${address.port}`;
    let ready: Response | undefined;
    const deadline = Date.now() + 12_000;
    while (!ready && server.exitCode === null && Date.now() < deadline) {
      ready = await fetch(`${origin}/api/ready`, { signal: AbortSignal.timeout(500) }).catch(() => undefined);
      if (!ready) await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!ready) throw new Error(`API did not start:\n${log}`);
    expect(ready.status).toBe(200);
    const catalog = await fetch(`${origin}/api/songs`);
    expect(catalog.status).toBe(200);
    expect((await catalog.json()).data).toEqual([
      expect.objectContaining({ id: 'legacy-song', title: 'Stored Song' }),
    ]);
  } finally {
    if (server.exitCode === null && server.signalCode === null) {
      const closed = once(server, 'close');
      server.kill();
      await closed;
    }
    rmSync(storage, { recursive: true, force: true });
  }
});
