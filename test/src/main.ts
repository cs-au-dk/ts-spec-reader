/// <reference path="../../typings/mocha/mocha.d.ts" />
/// <reference path="../../typings/node/node.d.ts" />
/// <reference path="../../node_modules/typescript/bin/typescript.d.ts" />
/// <reference path="../../node_modules/typescript/bin/lib.d.ts" />

import ts = require("typescript");
import Reader = require('../../src/TypeScriptEnvironmentReader')

// TODO: tests should be refactored a bit to be proper mocha-style

var libdts = "node_modules/typescript/bin/lib.d.ts";
it("Should work", function (done) {
    this.timeout(5000);
    // Smoke test. Should not crash.
    var result = Reader.readFiles([libdts, 'typings/node/node.d.ts', 'typings/mocha/mocha.d.ts', 'test/fixtures/test1.ts', 'test/fixtures/test2.d.ts', 'node_modules/typescript/bin/typescript.d.ts', 'node_modules/typescript/bin/typescriptServices.d.ts']);
    JSON.stringify(result);
    done();
});

it("var-test", function (done) {
    this.timeout(5000);
    // Smoke test. Should not crash.
    var result = Reader.readFiles([libdts, 'test/fixtures/var-with-anonymous-type.d.ts']);
    JSON.stringify(result);
    done();
});

it("Constructor typeof test", function (done) {
    this.timeout(5000);
    // Smoke test. Should not crash.
    var result = Reader.readFiles([libdts, 'test/fixtures/constructor-typeof.d.ts']);
    JSON.stringify(result);
    done();
});

it("pixi test", function (done) {
    this.timeout(5000);
    // Smoke test. Should not crash.
    var result = Reader.readFiles([libdts, 'test/fixtures/pixi.js.d.ts']);
    JSON.stringify(result);
    done();
});

it("pixi bug test", function (done) {
    this.timeout(5000);
    // Smoke test. Should not crash.
    var result = Reader.readFiles([libdts, 'test/fixtures/pixi.js-bug.d.ts']);
    JSON.stringify(result);
    done();
});

it("array test", function (done) {
    this.timeout(5000);
    // Smoke test. Should not crash.
    var result = Reader.readFiles([libdts, 'test/fixtures/array-types.d.ts']);
    JSON.stringify(result);
    done();
});

it("namespace test", function (done) {
    this.timeout(5000);
    // Erik: "Gør at der bliver defineret en var Events på det globale object, og ikke under L.Mixin."
    var result = Reader.readFiles([libdts, 'test/fixtures/namespace.d.ts']);
    JSON.stringify(result);
    done(false);
});

it("class with constructor test", function (done) {
    this.timeout(5000);
    var result = Reader.readFiles([libdts, 'test/fixtures/class-with-construtor.d.ts']);
    JSON.stringify(result);
    var id = result.types["Klass"];
    var element = <Reader.S.InterfaceType>result.data[<number>id];
    assert(element.declaredConstructSignatures.length === 1);
    done();
});

it("class with implicit constructor test", function (done) {
    this.timeout(5000);
    var result = Reader.readFiles([libdts, 'test/fixtures/class-with-implicit-constructor.d.ts']);
    JSON.stringify(result);
    var id = result.types["Klass"];
    var element = <Reader.S.InterfaceType>result.data[<number>id];
    assert(element.declaredConstructSignatures.length === 1);
    done();
});

function assert(r:boolean) {
    if (!r) {
        throw new Error("Assertion error");
    }
}
