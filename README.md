# ts-type-reader
Reads TypeScript-types by hooking into the TypeScript compiler, emits a single json-file of all the types.

## Example use

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

## Common use

### Java
To deserialize the content of test.json to Java-objects, the [SpecReader](deserializers/java/src/dk/au/cs/casa/typescript/SpecReader.java) can be used.

[deserializers/java/dist/ts-type-reader.jar](deserializers/java/dist/ts-type-reader.jar) contains a (probably) up-to-date jar-file with SpecReader.java and related clases.

### Produce "standard" type files

The script [bin/make-standard-files.sh](bin/make-standard-files.sh) will produce type files for the standard native environments: 
```
    
    $ bin/make-standard-files.sh
    $ ls dist
    es5-dom.json  es5.json  es6-dom.json  es6.json  node.json
```

## Major TODOs
- build script for the implementation (compile TypeScript)
- CLI.ts should be able to take multiple files as arguments (implementation should support it)
- @esbena: If I recall correctly, some of the handling generics are not completely implemented 
- documentation
- lobbying Microsoft to make this project obsolete: the TypeScript compiler should emit this by it self
  - has other projects surfaced?
- most function parameters has types, but none has optionality  
  
- Techical: Ghost modules (modules with only interfaces does not get instantiated as global variables...)
