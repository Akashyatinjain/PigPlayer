const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const backendRoot = path.resolve(__dirname, '..');
const sqliteSchema = path.join(backendRoot, 'prisma', 'schema.prisma');
const postgresSchema = path.join(backendRoot, 'prisma', 'postgresql', 'schema.prisma');

function writePostgresSchema() {
  const schema = fs.readFileSync(sqliteSchema, 'utf8')
    .replace('// Soundify Backend - local SQLite schema', '// Generated from prisma/schema.prisma by scripts/prisma-cli.js')
    .replace('provider = "prisma-client-js"', 'provider = "prisma-client-js"\n  output   = "../../node_modules/.prisma/postgresql-client"')
    .replace('provider = "sqlite"', 'provider = "postgresql"');
  fs.writeFileSync(postgresSchema, schema);
}

function runPrisma(args, env = process.env) {
  const prismaPackage = require.resolve('prisma/package.json');
  const cli = path.join(path.dirname(prismaPackage), require(prismaPackage).bin.prisma);
  const result = spawnSync(process.execPath, [cli, ...args], { cwd: backendRoot, stdio: 'inherit', env });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Prisma ${args.slice(0, 2).join(' ')} failed with exit status ${result.status}.`);
}

module.exports = { postgresSchema, runPrisma };

if (require.main === module) {
  try {
    writePostgresSchema();
    runPrisma(['generate', '--schema', sqliteSchema]);
    runPrisma(['generate', '--schema', postgresSchema]);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
