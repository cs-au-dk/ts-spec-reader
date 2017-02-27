/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../node_modules/typescript/lib/lib.es6.d.ts" />
/// <reference path="../node_modules/typescript/lib/typescript.d.ts" />

import ts = require("typescript");
import util = require("util");
/**
 * Reads typescript files and extracts the environment they describe.
 *
 * @param fileNames as the files to read
 * @returns AnalysisResult
 */
export function readFiles(fileNames:string[]):AnalysisResult {
    var program = ts.createProgram(fileNames, {module: ts.ModuleKind.CommonJS, strictNullChecks: true, noImplicitAny: true, noImplicitReturns: true, noImplicitThis: true, noLib: true});

    var allDiagnostics = ts.getPreEmitDiagnostics(program);

    allDiagnostics.forEach(diagnostic => {
        var message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        if (diagnostic.file) {
            var { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
            console.warn(`TypeScript compiler :: ${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
        } else {
            console.warn(`TypeScript compiler :: ${message}`);
        }
    });

    return analyzeProgram(program);
}

/**
 * The result of an analysis of the type script files.
 * The object is serializable with JSON.stringify.
 *
 * - data: an array of types, references to types are indirect as indices into this array
 * - globals: the global properties and their types (the types are in .data)
 * - types: fully qualified names for some types (the types are in .data)
 */
export interface AnalysisResult {
    data: S.Type[]
    globals: NamedType[]
    types: NamedType[]
}

interface NamedType {
    qName: string[];
    type: number
}


/**
 * Qualified name
 */
type QName = string[]

/**
 * A type and its qualified name
 */
interface QualifiedDeclarationWithType {
    qName: QName
    type: ts.Type
    kind: ts.SyntaxKind
}
/**
 * The serialized version of QualifiedType
 */
interface QualifiedSerialization {
    qName: QName
    type: S.SerializationID
}
/**
 * A tree of qualified names for (serialized) types
 */
interface NestedSerialization {
    [name:string]: S.SerializationID|NestedSerialization
}

/**
 * Misc. types for serialization
 */
export declare module S {
    type SerializationID = number;

    interface Signature {
        /* declaration: */
        typeParameters: SerializationID[]
        parameters: Parameter[]
        resolvedReturnType: SerializationID
        minArgumentCount: number
        hasRestParameter: boolean
        target: Signature
        /* mapper */
        unionSignatures: Signature[]
        /* erasedSignatureCache */
        isolatedSignatureType: SerializationID
    }

    interface InterfaceType extends Type {
        typeParameters: SerializationID[]
        baseTypes: SerializationID[]
        declaredProperties: {[name:string]: S.SerializationID}
        declaredCallSignatures: Signature[]
        declaredConstructSignatures: Signature[]
        declaredStringIndexType: SerializationID
        declaredNumberIndexType: SerializationID

    }
    interface ReferenceType extends Type {
        target: SerializationID
        typeArguments: SerializationID[]
    }

    interface Parameter {
        name: string
        type: S.SerializationID
    }
    interface UnionType extends Type {
        elements: S.SerializationID[]
    }

    interface Type {
        kind: string // TypeKind string
    }

}

enum TypeKind {
    Any,
    String,
    StringLiteral,
    BooleanLiteral,
    NumberLiteral,
    Number,
    Boolean,
    Void,
    Undefined,
    Null,
    Enum,
    TypeParameter,
    Class,
    ClassInstance,
    Interface,
    Reference,
    Generic,
    Tuple,
    Union,
    Intersection,
    Anonymous,
    Index,
    IndexedAccess,
    Never,
    ThisType,
    Symbol,
    Object
}

/**
 * Serializer for typescript types. Converts a typescript type to an acyclic object with indirect references to other types.
 * @param tc as the typescript TypeChecker to extract types of declarations with
 */
function makeSerializer(tc:ts.TypeChecker) {

    var serializationCache = new Map<ts.Type, S.SerializationID>();
    var classInstanceMap : {[serializationId: number] : number} = {}; // Map from the serializationId of the classType, to the serializationId of the instance type.
    var serializations = [];
    var nextSerializationID = 0;
    var primitives = {
        Any: {kind: TypeKind[TypeKind.Any]},
        String: {kind: TypeKind[TypeKind.String]},
        Number: {kind: TypeKind[TypeKind.Number]},
        Boolean: {kind: TypeKind[TypeKind.Boolean]},
        Void: {kind: TypeKind[TypeKind.Void]},
        Undefined: {kind: TypeKind[TypeKind.Undefined]},
        Null: {kind: TypeKind[TypeKind.Null]},
        Object: {kind: TypeKind[TypeKind.Object]},
        Never: {kind: TypeKind[TypeKind.Never]},
        Symbol: {kind: TypeKind[TypeKind.Symbol]},
        Enum: {kind: TypeKind[TypeKind.Enum]}
    };

    function makeAny():S.Type {
        return primitives.Any;
    }

    function makeString():S.Type {
        return primitives.String;
    }

    function makeNumber():S.Type {
        return primitives.Number;
    }

    function makeBoolean():S.Type {
        return primitives.Boolean;
    }

    function makeVoid():S.Type {
        return primitives.Void;
    }

    function makeUndefined():S.Type {
        return primitives.Undefined;
    }

    function makeNull():S.Type {
        return primitives.Null;
    }

    function makeEnum():S.Type {
        return primitives.Enum;
    }

    function makeUnion(type:ts.UnionType):S.Type {
        return makeUnionFromParts(type.types.map((type) => serializeType(type)), TypeKind.Union);
    }


    function makeIntersection(type):S.Type {
        return makeUnionFromParts(type.types.map((type) => serializeType(type)), TypeKind.Intersection);
    }

    function makeUnionFromParts(parts:S.SerializationID[], kind: TypeKind): S.Type {
        kind = kind || TypeKind.Union;
        var elements = [];
        parts.forEach(p => {
            if (elements.indexOf(p) === -1) {
                elements.push(p)
            }
        });

        return <any>{kind: TypeKind[kind], elements: elements};
    }

    function makeStringLiteral(type):S.Type {
        return <any>{kind: TypeKind[TypeKind.StringLiteral], text: type.text};
    }

    function makeBooleanLiteral(type):S.Type {
        return <any>{kind: TypeKind[TypeKind.BooleanLiteral], value: type.intrinsicName == "true"};
    }

    function makeNumberLiteral(type):S.Type {
        return <any>{kind: TypeKind[TypeKind.NumberLiteral], value: Number(type.text)};
    }

    function makeReference(type:ts.TypeReference, expectingClassConstructor?):S.ReferenceType {
        var target = serializeType(type.target, expectingClassConstructor);
        var typeArguments:S.SerializationID[] = type.typeArguments ? type.typeArguments.map((type) => serializeType(type)) : [];
        return {
            kind: TypeKind[TypeKind.Reference],
            target: target,
            typeArguments: typeArguments
        };
    }

    function makeConstructorSignature(returnType : S.SerializationID, typeArg:ts.TypeReference) : S.Signature {
        var type = <any>typeArg;
        return <any>{
            typeParameters: [],
            parameters: type.parameters.map(function (parameter) {
                return {
                    name: parameter.name.text,
                    type: serializeType(tc.getTypeAtLocation(parameter))
                }
            }),
            resolvedReturnType: returnType,
            minArgumentCount: type.parameters.length,
            hasRestParameter: false,
            hasStringLiterals: false,
            target: undefined,
            unionSignatures: [],
            isolatedSignatureType: undefined
        }
    }

    function makeEmptyConstructorSignature(returnType : S.SerializationID) : S.Signature {
        return <any>{
            typeParameters: [],
            parameters: [],
            resolvedReturnType: returnType,
            minArgumentCount: 0,
            hasRestParameter: false,
            hasStringLiterals: false,
            target: undefined,
            unionSignatures: [],
            isolatedSignatureType: undefined
        }
    }


    function makeSignature(sig:ts.Signature):S.Signature {
        return {
            typeParameters: sig.typeParameters ? sig.typeParameters.map((type) => serializeType(type)) : [],
            parameters: sig.parameters.map(parameter => ({
                name: parameter.getName(),
                type: serializeType(tc.getTypeAtLocation(parameter.valueDeclaration))
            })),
            // The properties do exist, the type just does't know that
            resolvedReturnType: serializeType((sig as any).resolvedReturnType),
            minArgumentCount: (sig as any).minArgumentCount,
            hasRestParameter: (sig as any).hasRestParameter,
            // TODO: Unsure if these still exists in 2.0
            target: (sig as any).target ? makeSignature((sig as any).target) : undefined,
            unionSignatures: (sig as any).unionSignatures ? (sig as any).unionSignatures.map(makeSignature) : [],
            isolatedSignatureType: (sig as any).isolatedSignatureType ? serializeType((sig as any).isolatedSignatureType) : undefined
        };
    }

    function makeProperties(properties:ts.Symbol[]):{[name:string]: S.SerializationID} {
        var result:{[name:string]: S.SerializationID} = {};
        properties.forEach(prop => {
            var name = prop.getName();
            // (.parent is required for typeof expressions)
            let declarations = (prop.getDeclarations() || ((prop as any).parent && (prop as any).parent.getDeclarations()));
            if (declarations) {
                declarations = declarations.filter(dec => {
                    return dec.kind !== ts.SyntaxKind.InterfaceDeclaration;
                });
                if (declarations.length > 1) {
                    let isMethodSignatures = declarations.filter(dec => {
                        return dec.kind === ts.SyntaxKind.MethodSignature;
                    }).length = declarations.length;

                    let isModuleDecs = declarations.filter(dec => {
                        return dec.kind === ts.SyntaxKind.ModuleDeclaration;
                    }).length = declarations.length;

                    if (!isMethodSignatures && !isModuleDecs) {
                        throw new Error("Had multiple property declarations, and it wasn't just methodSignatures.");
                    }
                }
                var declaration = declarations[0];
                var isClassDeclaration = !((<any>declaration).type);
                var isTypeOf = !!((<any>declaration).type && (<any>declaration).type.exprName);
                result[name] = serializeType(tc.getTypeAtLocation(declaration), isClassDeclaration || isTypeOf);
            } else {
                result[name] = serializeType((prop as any).type);
            }
        });
        return result;
    }

    function makeClass(typeArg : ts.InterfaceType, classId: number): any {
        var instanceType = {kind: TypeKind[TypeKind.ClassInstance], classType: classId};
        classInstanceMap[classId] = classInstanceMap[classId] || nextSerializationID++;
        serializations[classInstanceMap[classId]] = instanceType;

        const type = <any>typeArg;
        let constructor = null;
        let extractConstructor = function (e) {
            if (e.name == "__constructor") {
                constructor = e;
            }
        };
        type.members.forEach(extractConstructor);
        type.symbol.members.forEach(extractConstructor);
        const constructorSignatures = constructor ? constructor.declarations.map(makeConstructorSignature.bind(null, -1)) : [makeEmptyConstructorSignature(-1)];

        var staticProperties = {};

        type.symbol.exports.forEach(function (staticType) {
            var name = staticType.name;
            if (name === "prototype") {
                return;
            }
            if (staticType.valueDeclaration) {
                var isClassDeclaration = !(staticType.valueDeclaration.type);
                var isTypeOf = !!(staticType.valueDeclaration.type && staticType.valueDeclaration.type.exprName);
                staticProperties[name] = serializeType(tc.getTypeAtLocation(staticType.valueDeclaration), isClassDeclaration || isTypeOf);
            }
        });

        const declaredStringIndexType = serializeType(type.declaredStringIndexType);
        const declaredNumberIndexType = serializeType(type.declaredNumberIndexType);

        const referencePart = makeReference(type);

        const instanceProperties:{[name:string]: S.SerializationID} = makeProperties(type.declaredProperties);

        const baseTypes:S.SerializationID[] = type.resolvedBaseTypes.map((type) => serializeType(type, true));

        const typeParameters:S.SerializationID[] = type.typeParameters ? type.typeParameters.map((type) => serializeType(type)) : [];

        return {
            kind: TypeKind[TypeKind.Class],
            signatures: constructorSignatures,
            baseTypes: baseTypes,
            staticProperties: staticProperties,
            instanceProperties: instanceProperties,
            declaredStringIndexType: declaredStringIndexType,
            declaredNumberIndexType: declaredNumberIndexType,
            target: referencePart.target,
            typeParameters: typeParameters,
            typeArguments: referencePart.typeArguments
        };
    }

    function makeInterface(type:ts.InterfaceTypeWithDeclaredMembers):S.InterfaceType {
        var typeParameters:S.SerializationID[] = type.typeParameters ? type.typeParameters.map((type) => serializeType(type)) : [];
        var baseTypes:S.SerializationID[] = (type as any).resolvedBaseTypes.map((type) => serializeType(type));
        var declaredProperties:{[name:string]: S.SerializationID} = makeProperties(type.declaredProperties);
        var declaredCallSignatures:S.Signature[] = type.declaredCallSignatures.map(makeSignature);
        var declaredConstructSignatures:S.Signature[] = type.declaredConstructSignatures.map(makeSignature);
        var declaredStringIndexType = serializeType(type.declaredStringIndexInfo && type.declaredStringIndexInfo.type);
        var declaredNumberIndexType = serializeType(type.declaredNumberIndexInfo && type.declaredNumberIndexInfo.type);
        return {
            kind: TypeKind[TypeKind.Interface],
            typeParameters: typeParameters,
            baseTypes: baseTypes,
            declaredProperties: declaredProperties,
            declaredCallSignatures: declaredCallSignatures,
            declaredConstructSignatures: declaredConstructSignatures,
            declaredStringIndexType: declaredStringIndexType,
            declaredNumberIndexType: declaredNumberIndexType
        };
    }

    function makeGeneric(type:ts.GenericType):S.Type {
        var interfacePart = makeInterface(type as any);
        var referencePart = makeReference(type);
        return <any>{
            kind: TypeKind[TypeKind.Generic],
            typeParameters: interfacePart.typeParameters,
            baseTypes: interfacePart.baseTypes,
            declaredProperties: interfacePart.declaredProperties,
            declaredCallSignatures: interfacePart.declaredCallSignatures,
            declaredConstructSignatures: interfacePart.declaredConstructSignatures,
            declaredStringIndexType: interfacePart.declaredStringIndexType,
            declaredNumberIndexType: interfacePart.declaredNumberIndexType,
            target: referencePart.target,
            typeArguments: referencePart.typeArguments
        };
    }

    // In TypeScript 2, a tuple is an array of type parameters. Meaning that any tuple of the same length can share type, they just have different parameters.
    function makeTuple(type:ts.GenericType):S.Type {
        return <any>{
            kind: TypeKind[TypeKind.Tuple],
            elementTypes: type.typeParameters.map(e => serializeType(e))
        }
    }

    function makeTypeParameter(type:ts.TypeParameter):S.Type {
        return <any>{
            kind: TypeKind[TypeKind.TypeParameter],
            constraint: serializeType(type.constraint)
        };
    }

    function makeSymbol():S.Type {
        return primitives.Symbol;
    }

    function makeAnonymous():S.Type {
        return {kind: TypeKind[TypeKind.Anonymous]};
    }

    function makeIndexedAccessType(type: ts.IndexedAccessType):S.Type {
        return <any>{
            objectType: serializeType(type.objectType),
            indexType: serializeType(type.indexType),
            kind: TypeKind[TypeKind.IndexedAccess]
        };
    }

    function makeIndex(type: ts.IndexType):S.Type {
        return <any>{
            type: serializeType(type.type),
            kind: TypeKind[TypeKind.Index]
        };
    }

    var makeAnonymousInterface = function (type: ts.Type): S.InterfaceType {
        // ts.ResolvedType actually exists inside tsserverlibrary.d.ts, it seems to follow the type we are using below.
        var rType: any = type;
        return {
            kind: TypeKind[TypeKind.Interface],
            typeParameters: [],
            baseTypes: [],
            declaredProperties: rType.properties ? makeProperties(rType.properties) : {},
            declaredCallSignatures: rType.callSignatures.map(makeSignature),
            declaredConstructSignatures: rType.constructSignatures.map(makeSignature),
            declaredStringIndexType: serializeType(rType.stringIndexInfo && rType.stringIndexInfo.type),
            declaredNumberIndexType: serializeType(rType.numberIndexInfo && rType.numberIndexInfo.type)
        };
    };

    /**
     * Serializes a type script type.
     * @param type as the type to serialize
     * @param expectingClassConstructor true if serialize type is expected to return an constructor for the class, and not the instance.
     * @returns the id of the serialize type
     */
    function serializeType(type:ts.Type, expectingClassConstructor = false):S.SerializationID {
        if (type === undefined) {
            return -1; // on purpose!
        }
        // XXX Need to execute this statement!
        // This seems to force the type to be a "ResolvedType", it seems like an internal thing of the TypeChecker
        // Perhaps this implementation should use more getters on the types and/or on the TypeChecker?
        try {
            tc.getSignaturesOfType(type, 0);
        } catch (e) {
            // Do nothing.
        }

         function makeType(type, id) {
            switch (type.flags) {
                case ts.TypeFlags.Any:
                    return makeAny();
                case ts.TypeFlags.String:
                    return makeString();
                case ts.TypeFlags.Number:
                    return makeNumber();
                case ts.TypeFlags.Boolean:
                case ts.TypeFlags.Boolean | ts.TypeFlags.Union: // No idea why it happens, but it does (and from what I've seen, it is just a boolean).
                    return makeBoolean();
                case ts.TypeFlags.Void:
                    return makeVoid();
                case ts.TypeFlags.Undefined:
                    return makeUndefined();
                case ts.TypeFlags.Null:
                    return makeNull();
                case ts.TypeFlags.Enum:
                    return makeEnum();
                case ts.TypeFlags.TypeParameter:
                    if ((type as any).isThisType) {
                        return {
                            kind: TypeKind[TypeKind.ThisType],
                            constraint: serializeType(type.constraint)
                        };
                    }
                    return makeTypeParameter(<ts.TypeParameter>type);
                case ts.TypeFlags.Object:
                    switch ((type as ts.ObjectType).objectFlags) {
                        case ts.ObjectFlags.Interface:
                            return makeInterface(<ts.InterfaceTypeWithDeclaredMembers>type);
                        case ts.ObjectFlags.Anonymous:
                        case ts.ObjectFlags.Anonymous + ts.ObjectFlags.Instantiated:
                            // XXX This is highly undocumented use of the typescript compiler API, but it seems to work out
                            // Anonymous: can always be made into an InterfaceType!?!
                            if ((type as any).getConstructSignatures() || (type as any).getCallSignatures() || (type as any).getProperties() || (type as any).getStringIndexType() || (type as any).getNumberIndexType()) {
                                return makeAnonymousInterface(type);
                            }
                            throw new Error("Actually trying to construct an anonymous type!");
                        case ts.ObjectFlags.Reference:
                            return makeReference(<ts.TypeReference>type, expectingClassConstructor);
                        case ts.ObjectFlags.Reference + ts.ObjectFlags.Interface:
                            return makeGeneric(<ts.GenericType>type);
                        case ts.ObjectFlags.Tuple + ts.ObjectFlags.Reference:
                            return makeTuple(<ts.GenericType>type);
                        case ts.ObjectFlags.Mapped + ts.ObjectFlags.Instantiated:
                            return makeAnonymous(); // TODO: This happens with types like the return of Object.freeze, where the actual type depends on how it is called, so the mapped type cannot be "solved" by the compiler ahead of time.
                        case ts.ObjectFlags.Class + ts.ObjectFlags.Reference:
                            return makeClass(<ts.GenericType>type, id);
                        case ts.ObjectFlags.Mapped:
                            return makeAnonymousInterface(type); // Everything seems to be handled by the compiler.
                        case ts.ObjectFlags.Class:
                        case ts.ObjectFlags.Tuple:
                        case ts.ObjectFlags.Instantiated:
                        case ts.ObjectFlags.ObjectLiteral:
                        case ts.ObjectFlags.EvolvingArray:
                        case ts.ObjectFlags.ObjectLiteralPatternWithComputedProperties:
                        case ts.ObjectFlags.ClassOrInterface:
                        default:
                            throw new Error("Unhandled objectFlags case: " + type.objectFlags);
                    }
                case ts.TypeFlags.Union:
                    return makeUnion(<ts.UnionType>type);
                case ts.TypeFlags.ESSymbol:
                    return makeSymbol();
                case ts.TypeFlags.StringLiteral:
                    return makeStringLiteral(type);
                case ts.TypeFlags.BooleanLiteral:
                    return makeBooleanLiteral(type);
                case ts.TypeFlags.NumberLiteral:
                    return makeNumberLiteral(type);
                case ts.TypeFlags.Never:
                    return primitives.Never;
                case ts.TypeFlags.Intersection:
                    return makeIntersection(type);
                case ts.TypeFlags.IndexedAccess:
                    return makeIndexedAccessType(type as ts.IndexedAccessType);
                case ts.TypeFlags.NonPrimitive:
                    if (type.intrinsicName == "object") {
                        return primitives.Object;
                    }
                    throw new Error("Unhandled non-primitive: " + type.intrinsicName);
                case ts.TypeFlags.Index:
                    return makeIndex(type as ts.IndexType);
                default:
                    throw new Error("Unhandled type case: " + type.flags);
            }
        }

        if (
            type.flags == ts.TypeFlags.Object &&
            ((type as ts.ObjectType).objectFlags == ts.ObjectFlags.Anonymous + ts.ObjectFlags.Instantiated) || (type as ts.ObjectType).objectFlags == ts.ObjectFlags.Anonymous &&
            (type as any).constructSignatures
        ) {
            var rType: any = type;
            if (rType.properties && rType.properties.filter(function (prop) {return prop.name == "prototype"}).length) {
                if (rType.constructSignatures.length) {
                    var returnType = rType.constructSignatures[0].resolvedReturnType;
                    if (returnType.flags == ts.TypeFlags.Object && returnType.objectFlags == ts.ObjectFlags.Class + ts.ObjectFlags.Reference) {
                        return serializeType(returnType, true);
                    }
                }
            }
        }

        var isClass = type.flags == ts.TypeFlags.Object && (type as ts.ObjectType).objectFlags == (ts.ObjectFlags.Class + ts.ObjectFlags.Reference);

        var cacheKey = type;
        if (serializationCache.has(cacheKey)) {
            var resultingId = serializationCache.get(cacheKey);
            if (isClass && !expectingClassConstructor) {
                return classInstanceMap[resultingId] || (classInstanceMap[resultingId] = nextSerializationID++);
            }
            return resultingId;
        }
        var id = nextSerializationID++;
        serializationCache.set(cacheKey, id);
        serializations[id] = makeType(type, id);

        if (isClass && !expectingClassConstructor) {
            return classInstanceMap[id] || (classInstanceMap[id] = nextSerializationID++);
        }

        return id;
    }

    return {
        serializeType: serializeType,
        serializations: serializations
    };
}

/**
 * Extracts all named declarations of a program and assigns qualified name to them.
 * @param program
 * @returns {QualifiedDeclarationWithType[]}
 */
function extractQualifiedDeclarations(program: ts.Program):QualifiedDeclarationWithType[] {
    var QNameCache = new WeakMap<ts.Declaration,QName>();

    function getNameIdentifierText(name:ts.DeclarationName) {
        switch (name.kind) {
            case ts.SyntaxKind.Identifier:
                return (<ts.Identifier>name).text;
            case ts.SyntaxKind.StringLiteral:
                return "'" + (<ts.LiteralExpression>name).text + "'";
            default:
                throw new Error("Unhandled declaration name kind: " + name.kind);
        }
    }

    function getQName(decl:ts.Declaration):QName {
        if (QNameCache.has(decl)) {
            return QNameCache.get(decl);
        }
        var declName:string;
        if (decl.name !== undefined) {
            declName = getNameIdentifierText(decl.name);
        } else {
            declName = "";
        }
        var parent = decl.parent;
        var qName = [declName];
        while (parent) {
            var qualifier:string;
            switch (parent.kind) {
                case ts.SyntaxKind.ModuleDeclaration:
                    qualifier = getNameIdentifierText((<ts.ModuleDeclaration>parent).name);
                    break;
                case ts.SyntaxKind.ClassDeclaration:
                    qualifier = getNameIdentifierText((<ts.ClassDeclaration>parent).name);
                    break;
                case ts.SyntaxKind.InterfaceDeclaration:
                    qualifier = getNameIdentifierText((<ts.InterfaceDeclaration>parent).name);
                    break;
                case ts.SyntaxKind.TypeAliasDeclaration:
                    qualifier = getNameIdentifierText((<ts.TypeAliasDeclaration>parent).name);
                    break;
                case ts.SyntaxKind.ModuleBlock:
                case ts.SyntaxKind.SourceFile:
                case ts.SyntaxKind.VariableDeclarationList:
                case ts.SyntaxKind.VariableStatement:
                case ts.SyntaxKind.VariableDeclaration:
                case ts.SyntaxKind.PropertySignature:
                    qualifier = undefined;
                    break;
                default:
                    throw new Error("Unhandled QName path element: " + "kind = " + parent.kind);
            }
            if (qualifier !== undefined) {
                qName.push(qualifier);
            }
            parent = parent.parent;
        }
        qName.reverse();
        QNameCache.set(decl, qName);
        return qName;
    }

    var declarations:QualifiedDeclarationWithType[] = [];
    program.getSourceFiles().forEach(sourceFile => {
        const tc = program.getTypeChecker();
        const namedDeclarations = (sourceFile as any).getNamedDeclarations();
        namedDeclarations.forEach(function (declaration, name) {
            declaration.forEach(decl => {
                switch (decl.kind) {
                    case ts.SyntaxKind.VariableDeclaration:
                    case ts.SyntaxKind.ClassDeclaration:
                    case ts.SyntaxKind.FunctionDeclaration:
                    case ts.SyntaxKind.ModuleDeclaration:
                    case ts.SyntaxKind.InterfaceDeclaration:
                        let type: ts.Type = tc.getTypeAtLocation(decl);
                        declarations.push({qName: getQName(decl), type: type, kind: decl.kind});
                        break;
                    default:
                    // ignore
                }

            });
        });
    });
    return declarations;
}

var delayedOperations : (() => void)[] = [];
/**
 * Analysis a typescript program
 */
function analyzeProgram(program:ts.Program):AnalysisResult {
    var declarations:QualifiedDeclarationWithType[] = extractQualifiedDeclarations(program);

    var serializer = makeSerializer(program.getTypeChecker());

    function serialize(decl:QualifiedDeclarationWithType):QualifiedSerialization {
        // TODO: TypeOf currently doesn't work here.
        var expectConstructor = false;
        if (decl.kind == ts.SyntaxKind.ClassDeclaration) {
            expectConstructor = true;
        }
        return {qName: decl.qName, type: serializer.serializeType(decl.type, expectConstructor)};
    }

    var types = declarations.filter(
            d => d.kind === ts.SyntaxKind.InterfaceDeclaration || d.kind === ts.SyntaxKind.ClassDeclaration // pick some, it only matters client *usability* later
    ).map(serialize);

    var globalProperties = declarations.filter(d => {
            return d.kind !== ts.SyntaxKind.InterfaceDeclaration && d.qName.length === 1 && d.qName[0][0] !== "'"
        }
    ).map(serialize);

    /*var ambientModules = */
    /*declarations.filter(
            d => d.kind !== ts.SyntaxKind.InterfaceDeclaration && d.qName.length === 1 && d.qName[0][0] === "'"
    ).map(serialize);*/

    while(delayedOperations.length) {
        delayedOperations.pop()();
    }

    return {
        data: serializer.serializations,
        globals: globalProperties,
        types: types
        /* TODO put ambient modules here? */
    }
}