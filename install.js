const execSync = require('child_process').execSync;
const path = require('path');
execSync("npm install --no-audit --loglevel=error");
execSync("." + path.sep + "tsc", {cwd: "node_modules/.bin"});
