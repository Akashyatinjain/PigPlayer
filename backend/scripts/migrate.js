const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { backendRoot, databasePath } = require('./database-config');

const folder = path.join(backendRoot, 'prisma', 'migrations');
const migrations = fs.readdirSync(folder).filter((name) => /^\d{4}_[\w]+\.sql$/.test(name)).sort();
fs.mkdirSync(path.dirname(databasePath), { recursive: true });
fs.closeSync(fs.openSync(databasePath, 'a', 0o600));
const db = new DatabaseSync(databasePath);
try {
  db.exec('PRAGMA busy_timeout = 10000; BEGIN IMMEDIATE;');
  db.exec('CREATE TABLE IF NOT EXISTS "_pigplayer_migrations" ("name" TEXT PRIMARY KEY NOT NULL, "checksum" TEXT NOT NULL)');
  const applied = new Map(db.prepare('SELECT "name", "checksum" FROM "_pigplayer_migrations"').all()
    .map(({ name, checksum }) => [name, checksum]));
  const record = db.prepare('INSERT INTO "_pigplayer_migrations" ("name", "checksum") VALUES (?, ?)');
  const pending = [];
  for (const name of migrations) {
    const sql = fs.readFileSync(path.join(folder, name), 'utf8').replace(/\r\n/g, '\n');
    const checksum = createHash('sha256').update(sql).digest('hex');
    if (applied.has(name)) {
      if (applied.get(name) !== checksum) throw new Error(`Applied migration ${name} was changed`);
      continue;
    }
    db.exec(sql);
    record.run(name, checksum);
    pending.push(name);
  }
  if (pending.length && db.prepare('PRAGMA foreign_key_check').get()) {
    throw new Error('Existing data violates a foreign key constraint');
  }
  db.exec('COMMIT');
  for (const name of pending) console.log(`Applied SQLite migration ${name}`);
} catch (error) {
  console.error('SQLite migration failed:', error.message);
  process.exitCode = 1;
} finally {
  db.close(); // SQLite rolls back any open transaction on close.
}
