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
  if (!fs.existsSync(postgresSchema) || fs.readFileSync(postgresSchema, 'utf8') !== schema) {
    fs.writeFileSync(postgresSchema, schema);
  }
}

function runPrisma(args, env = process.env) {
  const prismaPackage = require.resolve('prisma/package.json');
  const cli = path.join(path.dirname(prismaPackage), require(prismaPackage).bin.prisma);
  const result = spawnSync(process.execPath, [cli, ...args], { cwd: backendRoot, stdio: 'inherit', env });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const reason = result.signal ? `signal ${result.signal}` : `exit status ${result.status}`;
    throw Object.assign(new Error(`Prisma ${args.slice(0, 2).join(' ')} failed with ${reason}.`), {
      code: 'PRISMA_CLI_EXIT',
      exitStatus: result.status,
      signal: result.signal,
    });
  }
}

function generateClientIfCurrent(schemaPath, outputDirectory) {
  const generatedSchema = path.join(outputDirectory, 'schema.prisma');
  const normalizeSchema = (contents) => contents.replace(/\/\/.*$/gm, '').replace(/\s+/g, '');
  const source = normalizeSchema(fs.readFileSync(schemaPath, 'utf8'));
  const generated = fs.existsSync(generatedSchema)
    ? normalizeSchema(fs.readFileSync(generatedSchema, 'utf8'))
    : null;
  if (generated === source) {
    console.log(`Prisma Client is current for ${path.relative(backendRoot, schemaPath)}.`);
    return;
  }
  runPrisma(['generate', '--schema', schemaPath]);
}

module.exports = { postgresSchema, runPrisma };

if (require.main === module) {
  try {
    writePostgresSchema();
    generateClientIfCurrent(sqliteSchema, path.join(backendRoot, 'node_modules', '.prisma', 'client'));
    generateClientIfCurrent(postgresSchema, path.join(backendRoot, 'node_modules', '.prisma', 'postgresql-client'));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
