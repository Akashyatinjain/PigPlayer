const fs = require('node:fs');

module.exports = () => {
  if (global.testRoot) fs.rmSync(global.testRoot, { recursive: true, force: true });
};
