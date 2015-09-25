/// <reference path="../../typings/lib.d.ts" />
/// <reference path="../../typings/mocha/mocha.d.ts" />
/// <reference path="../../typings/node/node.d.ts" />
/// <reference path="../../node_modules/typescript/bin/typescript.d.ts" />

import ts = require("typescript");
import Reader = require('../../src/TypeScriptEnvironmentReader')


it.only("Should work", function (done) {
    // Smoke test. Should not crash.
    var result = Reader.readFiles(['typings/lib.d.ts', 'typings/node/node.d.ts', 'typings/mocha/mocha.d.ts', 'test/fixtures/test1.ts', 'test/fixtures/test2.d.ts', 'node_modules/typescript/bin/typescript.d.ts', 'node_modules/typescript/bin/typescriptServices.d.ts']);
    JSON.stringify(result);
    done();
});

it("var-test", function (done) {
    // Smoke test. Should not crash.
    var result = Reader.readFiles(['typings/lib.d.ts', 'test/fixtures/var-with-anonymous-type.d.ts']);
    JSON.stringify(result);
    done();
});