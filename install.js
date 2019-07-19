const execSync = require('child_process').execSync;
execSync("npm install --no-audit --loglevel=error");
execSync("tsc", {cwd: "node_modules/.bin"});
