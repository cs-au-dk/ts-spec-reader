/// <reference path="../typings/node/node.d.ts" />

if(typeof Map === 'undefined' || typeof Set === 'undefined'){
    console.error("Map and Set missing. Run node with --harmony.");
    process.exit(1);
}


import Reader = require('./TypeScriptEnvironmentReader');

var path = require('path');
var fs = require('fs');
var program = require('commander');


program
    .version('0.1.0')
    .usage("[options]")
    .description("Produces JSON for an environment described by TypeScript files. (hardcoded to es5 for now)")
    .option("-o --output <file>", "The file to output to")
    .parse(process.argv);

var target = path.resolve(__dirname + "/../node_modules/typescript/bin/lib.core.d.ts");

var result = Reader.readFiles([target]);
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
