/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../node_modules/typescript/bin/lib.es6.d.ts" />
/// <reference path="../node_modules/typescript/bin/typescript.d.ts" />

import ts = require("typescript");
import util = require("util");
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
        parameters: Parameter[]
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

    interface Parameter {
        name: string
        type: S.SerializationID
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
    Anonymous,
    Symbol
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
        return makeUnionFromParts(type.types.map((type) => serializeType(type)));
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
        var typeArguments:S.SerializationID[] = type.typeArguments.map((type) => serializeType(type));
        return {
            kind: TypeKind[TypeKind.Reference],
            target: target,
            typeArguments: typeArguments
        };
    }

    function makeConstructorSignature(returnType : S.SerializationID, typeArg:ts.TypeReference) : S.Signature {
        var type = <any>typeArg;
        return {
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
        return {
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
            resolvedReturnType: serializeType(sig.resolvedReturnType),
            minArgumentCount: sig.minArgumentCount,
            hasRestParameter: sig.hasRestParameter,
            hasStringLiterals: sig.hasStringLiterals,
            target: sig.target ? makeSignature(sig.target) : undefined,
            unionSignatures: sig.unionSignatures ? sig.unionSignatures.map(makeSignature) : [],
            isolatedSignatureType: sig.isolatedSignatureType ? serializeType(sig.isolatedSignatureType) : undefined
        };
    }

    function makeProperties(properties:ts.Symbol[]):{[name:string]: S.SerializationID} {
        var result:{[name:string]: S.SerializationID} = {};
        properties.forEach(prop => {
            var name = prop.getName();
            // XXX do we ignore some types by doing [0]???!
            // (.parent is required for typeof expressions)
            var declaration = (prop.getDeclarations() || prop.parent.getDeclarations())[0];
            var isClassDeclaration = !(declaration.type);
            var isTypeOf = !!(declaration.type && declaration.type.exprName);
            result[name] = serializeType(tc.getTypeAtLocation(declaration), null, isClassDeclaration || isTypeOf);
        });
        return result;
    }


    function makeClass(typeArg : ts.InterfaceType, classId: number):S.InterfaceType {
        var type = <any>typeArg;
        var instanceType = nextSerializationID++;
        classInstanceMap[classId] = instanceType;
        serializeType(type, function (type) {
            var result = makeInterface(<ts.InterfaceType>type);
            result.classType = "instance";
            return result;
        }, false, instanceType);
        var constructor = type.members.__constructor;
        var constructorSignatures = constructor ? constructor.declarations.map(makeConstructorSignature.bind(null, instanceType)) : [makeEmptyConstructorSignature(instanceType)];
        var staticNames = Object.keys(type.symbol.exports);
        staticNames.splice(staticNames.indexOf("prototype"), 1);
        var staticProperties = {};
        staticNames.forEach(function (name) {
            var staticType = type.symbol.exports[name];
            staticProperties[name] = serializeType(tc.getTypeAtLocation(staticType.valueDeclaration));
        });

        delayedOperations.push(function () {
            var type = serializations[instanceType];
            for (var i = 0; i < type.baseTypes.length; i++) {
                var baseType = serializations[type.baseTypes[i]];
                if (baseType.classType == "constructor") {
                    var constructor = baseType.declaredConstructSignatures[0];
                    type.baseTypes[i] = constructor.resolvedReturnType;
                }
            }
        })

        return <any>{ // Stop complaining!
            // This field is for internal use.
            classType: "constructor",
            kind: TypeKind[TypeKind.Interface],
            typeParameters: [],
            baseTypes: [],
            declaredProperties: staticProperties,
            declaredCallSignatures: [],
            declaredConstructSignatures: constructorSignatures,
            declaredStringIndexType: -1,
            declaredNumberIndexType: -1
        };

    }


    function makeInterface(type:ts.InterfaceType):S.InterfaceType {
        var typeParameters:S.SerializationID[] = type.typeParameters ? type.typeParameters.map((type) => serializeType(type)) : [];
        var baseTypes:S.SerializationID[] = type.baseTypes.map((type) => serializeType(type));
        var declaredProperties:{[name:string]: S.SerializationID} = makeProperties(type.declaredProperties);
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

    function makeGenericClass(type:ts.GenericType, id: number):S.Type {
        var interfacePart = makeClass(type, id);
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

    function makeSymbol():S.Type {
        return {kind: TypeKind[TypeKind.Symbol]};
    }

    function makeAnonymous():S.Type {
        return {kind: TypeKind[TypeKind.Anonymous]};
    }

    /**
     * Serializes a type script type.
     * @param type as the type to serialize
     * @param makeTypeArg a custom function that generates the type.
     * @param expectingClassConstructor true if serialize type is expected to return an constructor for the class, and not the instance.
     * @param explicitNextSerializationId If the serializationId has already been computed, it can be given here.
     * @returns the id of the serialize type
     */
    function serializeType(type:ts.Type, makeTypeArg?: (type: ts.Type) => S.Type, expectingClassConstructor = false, explicitNextSerializationId? : number):S.SerializationID {
        if (type === undefined) {
            return -1; // on purpose!
        }
        var makeType = typeof makeTypeArg === "function" ? makeTypeArg : function (type, id) {
            // XXX Need to execute this statement!
            // This seems to force the type to be a "ResolvedType", it seems like an internal thing of the TypeChecker
            // Perhaps this implementation should use more getters on the types and/or on the TypeChecker?
            tc.getSignaturesOfType(type, 0);

            switch (type.flags) {
                case ts.TypeFlags.Any:
                    return makeAny();
                case ts.TypeFlags.String:
                    return makeString();
                case ts.TypeFlags.Number:
                    return makeNumber();
                case ts.TypeFlags.Boolean:
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
                    return makeTypeParameter(<ts.TypeParameter>type);
                case ts.TypeFlags.Class:
                    return makeClass(<ts.InterfaceType>type, id);
                case ts.TypeFlags.Class + ts.TypeFlags.Reference:
                    return makeGenericClass(<ts.GenericType>type, id);
                case ts.TypeFlags.Interface:
                    return makeInterface(<ts.InterfaceType>type);
                case ts.TypeFlags.Reference:
                    return makeReference(<ts.TypeReference>type);
                case ts.TypeFlags.Tuple:
                    return makeTuple(<ts.TupleType>type);
                case ts.TypeFlags.Union:
                    return makeUnion(<ts.UnionType>type);
                case ts.TypeFlags.Anonymous:
                    // XXX This is highly undocumented use of the typescript compiler API, but it seems to work out
                    // Anonymous: can always be made into an InterfaceType!?!
                    if (type.getConstructSignatures() || type.getCallSignatures() || type.getProperties() || type.getStringIndexType() || type.getNumberIndexType()) {
                        var rType: ts.ResolvedType = <ts.ResolvedType>type;
                        return {
                            kind: TypeKind[TypeKind.Interface],
                            typeParameters: [],
                            baseTypes: [],
                            declaredProperties: rType.properties? makeProperties(rType.properties): {},
                            declaredCallSignatures: rType.callSignatures.map(makeSignature),
                            declaredConstructSignatures: rType.constructSignatures.map(makeSignature),
                            declaredStringIndexType: serializeType(rType.stringIndexType),
                            declaredNumberIndexType: serializeType(rType.numberIndexType)
                        };
                    }
                    return makeAnonymous();
                case ts.TypeFlags.Reference | ts.TypeFlags.Interface:
                    return makeGeneric(<ts.GenericType>type);
                case ts.TypeFlags.ESSymbol:
                    return makeSymbol();
                case ts.TypeFlags.StringLiteral:
                    return makeString(); // TODO make string literal type
                default:
                    throw new Error("Unhandled type case: " + type.flags);
            }
        }

        var cacheKey = type;
        if (typeof makeTypeArg === "function") {
            cacheKey = type.instanceCacheKey = type.instanceCacheKey || {};
        }
        if (serializationCache.has(cacheKey)) {
            var resultingId = serializationCache.get(cacheKey);
            if (classInstanceMap[resultingId] && !expectingClassConstructor) {
                return classInstanceMap[resultingId];
            }
            return resultingId;
        }
        var id = explicitNextSerializationId || nextSerializationID++;
        serializationCache.set(cacheKey, id);
        serializations[id] = makeType(type, id);
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
function extractQualifiedDeclarations(program):QualifiedDeclarationWithType[] {
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
        if (decl.kind == 201) {
            expectConstructor = true;
        }
        return {qName: decl.qName, type: serializer.serializeType(decl.type, null, expectConstructor)};
    }

    var types = declarations.filter(
            d => d.kind === ts.SyntaxKind.InterfaceDeclaration || d.kind === ts.SyntaxKind.ClassDeclaration // pick some, it only matters client *usability* later
    ).map(serialize);

    var globalProperties = declarations.filter(d => {
            return d.kind !== ts.SyntaxKind.InterfaceDeclaration && d.qName.length === 1 && d.qName[0][0] !== "'"
        }
    ).map(serialize);

    /*var ambientModules = */
    declarations.filter(
            d => d.kind !== ts.SyntaxKind.InterfaceDeclaration && d.qName.length === 1 && d.qName[0][0] === "'"
    ).map(serialize);

    while(delayedOperations.length) {
        delayedOperations.pop()();
    }

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
                console.log(parent);
                throw new Error(util.format("Host is a leaf... (parent[%s] === %s)", head, nextParent));
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