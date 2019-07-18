const execSync = require('child_process').execSync;
execSync("npm install --no-audit --loglevel=error");
execSync("node_modules/.bin/tsc");
