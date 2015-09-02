# ts-type-reader
Reads TypeScript-types by hooking into the TypeScript compiler, emits a single json-file of all the types.
A Java deserializer has been implemented, ask @esbena.

Example use:
```
<< COMPILE THE TYPESCRIPT FILES IN PLACE >>
$ node src/CLI.js --help   

  Usage: CLI [options]

  Produces JSON for an environment described by TypeScript files.

  Options:

    -h, --help          output usage information
    -V, --version       output the version number
    --env <env>         Environment to read, one of: es5, es6, es5-dom, es6-dom
    -o --output <file>  The file to output to
$ node src/CLI.js --env es5 -o test.json                        
```


## Major TODOs
- build script for the implementation (compile TypeScript)
- CLI.ts should be able to take multiple files as arguments (implementation should support it)
- @esbena: If I recall correctly, some of the handling generics are not completely implemented 
- documentation
- lobbying Microsoft to make this project obsolete: the TypeScript compiler should emit this by it self
  - has other projects surfaced?
  
  
