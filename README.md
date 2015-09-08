# ts-type-reader
Reads TypeScript-types by hooking into the TypeScript compiler, emits a single json-file of all the types.
A Java deserializer has been implemented, ask @esbena.

Example use:
```
$ npm i
$ node_modules/.bin/tsc --module commonjs src/*.ts
# bunch of type error warnings (need proper build script), but .js files will be created
$ node src/CLI.js --help   

  Usage: CLI [options]

  Produces JSON for an environment described by TypeScript files.

  Options:

    -h, --help          output usage information
    -V, --version       output the version number
    --env <env>         Environment to read, one of: es5, es6, es5-dom, es6-dom
    -o --output <file>  The file to output to
$ node src/CLI.js --env es5 -o test.json 
Output written to test.json                       
```


## Major TODOs
- build script for the implementation (compile TypeScript)
- CLI.ts should be able to take multiple files as arguments (implementation should support it)
- Make Java API instead of a bunch of Java files that does not compile ( & add support for SymbolType)
- @esbena: If I recall correctly, some of the handling generics are not completely implemented 
- documentation
- lobbying Microsoft to make this project obsolete: the TypeScript compiler should emit this by it self
  - has other projects surfaced?
- most function parameters has types, but none has optionality  
  
- Techical: Ghost modules (modules with only interfaces does not get instantiated as global variables...)
