/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../node_modules/typescript/bin/lib.es6.d.ts" />
/// <reference path="../node_modules/typescript/bin/typescript.d.ts" />

import ts = require("typescript");

/**
 * Reads typescript files and extracts the environment they describe.
 *
 * @param fileNames as the files to read
 * @returns AnalysisResult
 */
export function readFiles(fileNames:string[]):AnalysisResult {
    var program = ts.createProgram(fileNames, {module: ts.ModuleKind.CommonJS, noLib: true});

    var allDiagnostics = ts.getPreEmitDiagnostics(program);

    allDiagnostics.forEach(diagnostic => {
        var { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        var message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        console.warn(`TypeScript compiler :: ${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
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
    globals: NestedSerialization
    types: NestedSerialization
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
declare module S {
    type SerializationID = number;

    interface Signature {
        /* declaration: */
        typeParameters: SerializationID[]
        parameters: string[]
        resolvedReturnType: SerializationID
        minArgumentCount: number
        hasRestParameter: boolean
        hasStringLiterals: boolean
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
    interface Type {
        kind: string // TypeKind string
    }

}

enum TypeKind {
    Any,
    String,
    Number,
    Boolean,
    Void,
    Undefined,
    Null,
    Enum,
    TypeParameter,
    Class,
    Interface,
    Reference,
    Generic,
    Tuple,
    Union,
    Anonymous
}

/**
 * Serializer for typescript types. Converts a typescript type to an acyclic object with indirect references to other types.
 * @param tc as the typescript TypeChecker to extract types of declarations with
 */
function makeSerializer(tc:ts.TypeChecker) {

    var serializationCache = new Map<ts.Type, S.SerializationID>();
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
        return makeUnionFromParts(type.types.map(serializeType));
    }

    function makeUnionFromParts(parts:S.SerializationID[]):S.Type {
        var elements = [];
        parts.forEach(p => {
            if (elements.indexOf(p) === -1) {
                elements.push(p)
            }
        });

        return {kind: TypeKind[TypeKind.Union], elements: elements};
    }

    function makeReference(type:ts.TypeReference):S.ReferenceType {
        var target = serializeType(type.target);
        var typeArguments:S.SerializationID[] = type.typeArguments.map(serializeType);
        return {
            kind: TypeKind[TypeKind.Reference],
            target: target,
            typeArguments: typeArguments
        };
    }

    function makeSignature(sig:ts.Signature):S.Signature {
        return {
            typeParameters: sig.typeParameters ? sig.typeParameters.map(serializeType) : [],
            parameters: sig.parameters.map(sig => sig.getName()),
            resolvedReturnType: serializeType(sig.resolvedReturnType),
            minArgumentCount: sig.minArgumentCount,
            hasRestParameter: sig.hasRestParameter,
            hasStringLiterals: sig.hasStringLiterals,
            target: sig.target ? makeSignature(sig.target) : undefined,
            unionSignatures: sig.unionSignatures ? sig.unionSignatures.map(makeSignature) : [],
            isolatedSignatureType: sig.isolatedSignatureType ? serializeType(sig.isolatedSignatureType) : undefined
        };
    }

    function makeInterface(type:ts.InterfaceType):S.InterfaceType {
        function makeDeclaredProperties(properties:ts.Symbol[]):{[name:string]: S.SerializationID} {
            var result:{[name:string]: S.SerializationID} = {};
            properties.forEach(prop => {
                var name = prop.getName();
                result[name] = serializeType(tc.getTypeAtLocation(prop.getDeclarations()[0]));
            });
            return result;
        }

        var typeParameters:S.SerializationID[] = type.typeParameters ? type.typeParameters.map(serializeType) : [];
        var baseTypes:S.SerializationID[] = type.baseTypes.map(serializeType);
        var declaredProperties:{[name:string]: S.SerializationID} = makeDeclaredProperties(type.declaredProperties);
        var declaredCallSignatures:S.Signature[] = type.declaredCallSignatures.map(makeSignature);
        var declaredConstructSignatures:S.Signature[] = type.declaredConstructSignatures.map(makeSignature);
        var declaredStringIndexType = serializeType(type.declaredStringIndexType);
        var declaredNumberIndexType = serializeType(type.declaredNumberIndexType);
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
        var interfacePart = makeInterface(type);
        var referencePart = makeReference(type);
        return {
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

    function makeTuple(type:ts.TupleType):S.Type {
        return {
            kind: TypeKind[TypeKind.Tuple],
            elementTypes: type.elementTypes.map(e => serializeType(e)),
            baseArrayType: serializeType(type.baseArrayType)
        }
    }

    function makeTypeParameter(type:ts.TypeParameter):S.Type {
        return {
            kind: TypeKind[TypeKind.TypeParameter],
            constraint: serializeType(type.constraint),
            target: serializeType(type.target)
            /*mapper:*/
        };
    }

    function makeAnonymous():S.Type {
        return {kind: TypeKind[TypeKind.Anonymous]};
    }

    /**
     * Serializes a type script type.
     * @param type as the type to serialize
     * @returns the id of the serialize type
     */
    function serializeType(type:ts.Type):S.SerializationID {
        if (type === undefined) {
            return -1; // on purpose!
        }
        if (serializationCache.has(type)) {
            return serializationCache.get(type);
        }
        var id = nextSerializationID++;

        serializationCache.set(type, id);

        var result:S.Type;
        switch (type.flags) {
            case ts.TypeFlags.Any:
                result = makeAny();
                break;
            case ts.TypeFlags.String:
                result = makeString();
                break;
            case ts.TypeFlags.Number:
                result = makeNumber();
                break;
            case ts.TypeFlags.Boolean:
                result = makeBoolean();
                break;
            case ts.TypeFlags.Void:
                result = makeVoid();
                break;
            case ts.TypeFlags.Undefined:
                result = makeUndefined();
                break;
            case ts.TypeFlags.Null:
                result = makeNull();
                break;
            case ts.TypeFlags.Enum:
                result = makeEnum();
                break;
            case ts.TypeFlags.TypeParameter:
                result = makeTypeParameter(<ts.TypeParameter>type);
                break;
            case ts.TypeFlags.Class:
                result = makeInterface /* yep! */(<ts.InterfaceType>type);
                break;
            case ts.TypeFlags.Interface:
                result = makeInterface(<ts.InterfaceType>type);
                break;
            case ts.TypeFlags.Reference:
                result = makeReference(<ts.TypeReference>type);
                break;
            case ts.TypeFlags.Tuple:
                result = makeTuple(<ts.TupleType>type);
                break;
            case ts.TypeFlags.Union:
                result = makeUnion(<ts.UnionType>type);
                break;
            case ts.TypeFlags.Anonymous:
                result = makeAnonymous();
                break;
            case ts.TypeFlags.Reference | ts.TypeFlags.Interface:
                result = makeGeneric(<ts.GenericType>type);
                break;
            case ts.TypeFlags.StringLiteral:
            default:
                throw new Error("Unhandled type case: " + type.flags);

        }
        // console.log(result);
        serializations[id] = result;
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
function extractQualifiedDeclarations(program) {
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
        var tc = program.getTypeChecker();
        sourceFile.getNamedDeclarations().forEach(decl => {
            switch (decl.kind) {
                case ts.SyntaxKind.VariableDeclaration:
                case ts.SyntaxKind.ClassDeclaration:
                case ts.SyntaxKind.FunctionDeclaration:
                case ts.SyntaxKind.ModuleDeclaration:
                case ts.SyntaxKind.InterfaceDeclaration:
                    var type:ts.Type = tc.getTypeAtLocation(decl);
                    declarations.push({qName: getQName(decl), type: type, kind: decl.kind});
                    break;
                default:
                // ignore
            }

        });
    });
    return declarations;
}
/**
 * Analysis a typescript program
 */
function analyzeProgram(program:ts.Program):AnalysisResult {
    var declarations = extractQualifiedDeclarations(program);

    var serializer = makeSerializer(program.getTypeChecker());

    function serialize(decl:QualifiedDeclarationWithType):QualifiedSerialization {
        return {qName: decl.qName, type: serializer.serializeType(decl.type)};
    }

    var types = declarations.filter(
            d => d.kind === ts.SyntaxKind.InterfaceDeclaration || d.kind === ts.SyntaxKind.ClassDeclaration // pick some, it only matters client *usability* later
    ).map(serialize);

    var globalProperties = declarations.filter(
            d => d.kind !== ts.SyntaxKind.InterfaceDeclaration && d.qName.length === 1 && d.qName[0][0] !== "'"
    ).map(serialize);

    /*var ambientModules = */
    declarations.filter(
            d => d.kind !== ts.SyntaxKind.InterfaceDeclaration && d.qName.length === 1 && d.qName[0][0] === "'"
    ).map(serialize);

    function nest(flats:QualifiedSerialization[]):NestedSerialization {
        var root:NestedSerialization = {};

        function getHost(parent:NestedSerialization, qName:QName) {
            if (qName.length === 0) {
                return parent;
            }
            var head = qName[0];
            var tail = qName.slice(1);
            if (!parent.hasOwnProperty(head)) {
                parent[head] = {};
            }
            var nextParent = parent[head];
            if (typeof nextParent === 'number') {
                throw new Error("Host is a leaf...");
            } else {
                return getHost(nextParent, tail);
            }
        }

        flats.forEach(flat => {
            var host = getHost(root, flat.qName.slice(0, flat.qName.length - 1));
            var name = flat.qName[flat.qName.length - 1];
            if (host[name] !== undefined) {
                // ignore. The typescript compiler will complain about ambiguous declarations...
            }
            host[name] = flat.type;
        });
        return root;
    }

    return {
        data: serializer.serializations,
        globals: nest(globalProperties),
        types: nest(types),
        /* TODO put ambient modules here? */
    };
}