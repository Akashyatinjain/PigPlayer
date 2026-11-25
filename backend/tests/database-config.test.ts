import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const configScript = path.resolve(__dirname, '../scripts/database-config.js');
const postgresUrl = 'postgresql://test:fake-password@example.invalid/shared';

function readConfig(env: NodeJS.ProcessEnv, script = configScript) {
  return spawnSync(process.execPath, ['-e', `
    const config = require(process.argv[1]);
    console.log(config.databaseProvider === 'sqlite'
      ? config.databasePath
      : new URL(config.databaseMigrationUrl).hostname);
  `, script], {
    encoding: 'utf8',
    env: {
      ...process.env,
      DATABASE_PROVIDER: 'sqlite',
      SQLITE_PATH: '',
      SQLITE_DATABASE_URL: '',
      DATABASE_URL: postgresUrl,
      DIRECT_URL: '',
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

it('uses the direct Neon endpoint for migrations when only a pooled URL is supplied', () => {
  const result = readConfig({
    DATABASE_PROVIDER: 'postgresql',
    DATABASE_URL: 'postgresql://ep-example-pooler.us-east-2.aws.neon.tech/pigplayer?sslmode=require',
  });
  expect(result.status).toBe(0);
  expect(result.stdout.trim()).toBe('ep-example.us-east-2.aws.neon.tech');
});

it('rejects a migration URL for a different Neon branch', () => {
  const result = readConfig({
    DATABASE_PROVIDER: 'postgresql',
    DATABASE_URL: 'postgresql://ep-example-pooler.us-east-2.aws.neon.tech/pigplayer?sslmode=require',
    DIRECT_URL: 'postgresql://ep-other.us-east-2.aws.neon.tech/pigplayer?sslmode=require',
  });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('same Neon branch');
});

it('keeps a bare absolute SQLite file path from legacy configuration', () => {
  const intendedFile = path.join(process.env.DATA_DIR!, 'legacy-file.db');
  const result = readConfig({ DATABASE_URL: intendedFile });
  expect(result.status).toBe(0);
  expect(result.stdout.trim()).toBe(intendedFile);
});

function withCleanConfig(check: (script: string, backend: string) => void) {
  const fixture = mkdtempSync(path.join(process.env.DATA_DIR!, 'database-config-'));
  try {
    const backend = path.join(fixture, 'backend');
    const script = path.join(backend, 'scripts', 'database-config.js');
    mkdirSync(path.dirname(script), { recursive: true });
    copyFileSync(configScript, script);
    check(script, backend);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}

it('selects PostgreSQL from the Render URL when no SQLite location is configured', () => {
  withCleanConfig((script) => {
    const result = readConfig({ DATABASE_PROVIDER: '' }, script);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Using PostgreSQL on Render');
    expect(result.stdout.trim().endsWith('example.invalid')).toBe(true);
    expect(result.stdout).not.toContain('fake-password');
  });
});

it('keeps an existing SQLite library when no provider is specified on Render', () => {
  withCleanConfig((script, backend) => {
    const data = path.join(backend, 'data');
    const database = path.join(data, 'soundify.db');
    mkdirSync(data);
    writeFileSync(database, '');
    const result = readConfig({ DATABASE_PROVIDER: '' }, script);
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe(database);
  });
});

it('honors an explicit SQLite provider and explains how to select PostgreSQL', () => {
  withCleanConfig((script) => {
    const result = readConfig({}, script);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Set DATABASE_PROVIDER=postgresql to select it');
    expect(result.stderr).not.toContain('fake-password');
  });
});
