// Convenience launcher for nodemon / node
const fs = require('fs');
const path = require('path');

const distServer = path.resolve(__dirname, 'dist/server.js');

if (fs.existsSync(distServer)) {
  require(distServer);
} else {
  // If dist hasn't been built yet, register ts-node and run src/server.ts
  require('ts-node/register');
  require('./src/server.ts');
}
