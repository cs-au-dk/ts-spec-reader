/// <reference path="../typings/node/node.d.ts" />

if (typeof Map === 'undefined' || typeof Set === 'undefined') {
    console.error("Map and Set missing. Run node with --harmony.");
    process.exit(1);
}


import Reader = require('./TypeScriptEnvironmentReader');

var path = require('path');
var fs = require('fs');
var program = require('commander');


program
    .version('0.1.0')
    .usage("[options] [file ...]")
    .description("Produces JSON for an environment described by TypeScript files.")
    .option("--env <env>", "Environment to read, one of: es5, es6, es5-dom, es6-dom", /^(es5|es6|es5-dom|es6-dom|node)$/)
    .option("-o --output <file>", "The file to output to")
    .parse(process.argv);

var es5 = path.resolve(__dirname + "/../node_modules/typescript/bin/lib.core.d.ts");
var es6 = path.resolve(__dirname + "/../node_modules/typescript/bin/lib.core.es6.d.ts");
var es5dom = path.resolve(__dirname + "/../node_modules/typescript/bin/lib.d.ts");
var es6dom = path.resolve(__dirname + "/../node_modules/typescript/bin/lib.es6.d.ts");
var node = path.resolve(__dirname + "/../typings/node/node.d.ts");

var targets:string[];
var env = program.env;
if(!env){
    console.error("Bad/Missing --env: %s", env);
    process.exit(1);
}
switch (env) {
    case 'es5-dom':
        targets = [es5dom];
        break;
    case 'es6-dom':
        targets = [es6dom];
        break;
    case 'es5':
        targets = [es5];
        break;
    case 'es6':
        targets = [es6];
        break;
    case 'node':
        targets = [es6, node];
        break;
    default:
        console.error("Unhanleded env: %s", env);
        process.exit(1);
}

targets = targets.concat(program.args);

console.log("Reading files: " + targets);

var result = Reader.readFiles(targets);
var json = JSON.stringify(result);
if (program.output) {
    fs.writeFile(program.output, json, e => {
        if (e) {
            console.error("ERROR: %s", e.message);
            process.exit(1);
        }
        console.log("Output written to %s", program.output);
    });
} else {
    console.log(json);
}
