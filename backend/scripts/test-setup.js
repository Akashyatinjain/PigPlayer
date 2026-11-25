const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');

module.exports = () => {
  const testRoot = fs.mkdtempSync(path.join(__dirname, '..', '.test-data-'));
  global.testRoot = testRoot;
  process.env.NODE_ENV = 'test';
  process.env.DATA_DIR = testRoot;
  process.env.SQLITE_PATH = path.join(testRoot, 'test.db');
  process.env.ALLOW_GUEST_MUTATIONS = 'false';
  process.env.ALLOW_GUEST_UPLOADS = 'false';
  process.env.LOCAL_USER_EMAIL = 'admin@test.example';
  process.env.LOCAL_USER_PASSWORD = randomBytes(24).toString('base64url');
  try {
    execFileSync(process.execPath, [path.join(__dirname, 'migrate.js')], { stdio: 'inherit' });
  } catch (error) {
    fs.rmSync(testRoot, { recursive: true, force: true });
    throw error;
  }
};
