import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';

const configScript = path.resolve(__dirname, '../scripts/database-config.js');
const postgresUrl = 'postgresql://test:fake-password@example.invalid/shared';

function readConfig(env: NodeJS.ProcessEnv, script = configScript) {
  return spawnSync(process.execPath, ['-e', 'console.log(require(process.argv[1]).databasePath)', script], {
    encoding: 'utf8',
    env: {
      ...process.env,
      SQLITE_PATH: '',
      SQLITE_DATABASE_URL: '',
      DATABASE_URL: postgresUrl,
      DATA_DIR: '',
      DATA_ROOT: '',
      RENDER: 'true',
      ...env,
    },
  });
}

it('uses an explicit SQLite URL ahead of a shared PostgreSQL URL', () => {
  const intendedFile = path.join(process.env.DATA_DIR!, 'chosen.db');
  const result = readConfig({ SQLITE_DATABASE_URL: `file:${intendedFile}` });
  expect(result.status).toBe(0);
  expect(result.stdout.trim()).toBe(intendedFile);
});

it('keeps a bare absolute SQLite file path from legacy configuration', () => {
  const intendedFile = path.join(process.env.DATA_DIR!, 'legacy-file.db');
  const result = readConfig({ DATABASE_URL: intendedFile });
  expect(result.status).toBe(0);
  expect(result.stdout.trim()).toBe(intendedFile);
});

it('requires a known SQLite location when Render supplies a PostgreSQL URL', () => {
  const fixture = mkdtempSync(path.join(process.env.DATA_DIR!, 'database-config-'));
  try {
    const script = path.join(fixture, 'backend', 'scripts', 'database-config.js');
    mkdirSync(path.dirname(script), { recursive: true });
    copyFileSync(configScript, script);
    const result = readConfig({}, script);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Set SQLITE_PATH to the intended SQLite database file');
    expect(result.stderr).not.toContain('fake-password');
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
