package dk.au.cs.casa.typescript;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonArray;
import com.google.gson.JsonDeserializationContext;
import com.google.gson.JsonDeserializer;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParseException;
import dk.au.cs.casa.typescript.types.*;

import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class SpecReader {

    private final Type global;

    private final TypeNameTree namedTypes;

    /**
     * Reads a specification from a file.
     */
    public SpecReader(Path specFile) {
        this(pathToString(specFile));
    }

    private static String pathToString(Path specFile) {
        try {
            return new String(Files.readAllBytes(specFile), Charset.forName("UTF-8"));
        } catch (IOException e) {
            throw new RuntimeException();
        }
    }

    /**
     * Reads a specification from a string.
     */
    public SpecReader(String specification) {
        GsonBuilder builder = new GsonBuilder();
        TypeResolver typeResolver = new TypeResolver();
        builder.registerTypeAdapter(Spec.class, new SpecAdapter(typeResolver));
        builder.registerTypeAdapter(Type.class, new TypeIDAdapter(typeResolver));
        builder.registerTypeAdapter(TypeNameTree.class, new TypeNameTreeAdapter(typeResolver));
        Gson gson = builder.create();
        Spec spec = gson.fromJson(specification, Spec.class);
        this.namedTypes = spec.getTypes();
        InterfaceType global = makeEmptySyntheticInterfaceType();
        global.getDeclaredProperties().putAll(flattenTypeNameTree(spec.getGlobals()));
        this.global = global;
    }

    /**
     * Flattens a tree already flat tree. Exceptions will be thrown if the tree is not flat...
     */
    private static Map<String, Type> flattenTypeNameTree(TypeNameTree tree) {
        // should be type safe...
        Map<String, Type> map = new HashMap<>();
        ((Node) tree).children.forEach((k, v) -> map.put(k, ((Leaf) v).getType()));
        return map;
    }

    /**
     * Convinience method for creting synthetic instances of the InterfaceType.
     * Simplifies some implementation-cases.
     */
    public static InterfaceType makeEmptySyntheticInterfaceType() {

        InterfaceType interfaceType = new InterfaceType();
        interfaceType.setBaseTypes(newList());
        interfaceType.setDeclaredCallSignatures(newList());
        interfaceType.setDeclaredConstructSignatures(newList());
        interfaceType.setDeclaredNumberIndexType(null);
        interfaceType.setDeclaredProperties(newMap());
        interfaceType.setDeclaredStringIndexType(null);
        interfaceType.setTypeParameters(newList());
        return interfaceType;
    }

    private static <K, V> Map<K, V> newMap() {

        return new HashMap<>();
    }

    private static <T> List<T> newList() {

        return new ArrayList<>();
    }

    public TypeNameTree getNamedTypes() {

        return namedTypes;
    }

    public Type getGlobal() {

        return global;
    }

    public interface TypeNameTree {

    }

    private class TypeNameTreeAdapter implements JsonDeserializer<TypeNameTree> {

        private final TypeResolver resolver;

        private TypeNameTreeAdapter(TypeResolver resolver) {

            this.resolver = resolver;
        }

        private TypeNameTree deserialize(JsonElement jsonElement) {

            if (jsonElement.isJsonPrimitive()) {
                return new Leaf(this.resolver.resolve(jsonElement.getAsInt()));
            }
            if (jsonElement.isJsonObject()) {
                Map<String, TypeNameTree> children = new HashMap<>();
                JsonObject object = jsonElement.getAsJsonObject();
                object.entrySet().forEach(e -> children.put(e.getKey(), deserialize(e.getValue())));
                return new Node(children);
            }
            throw new RuntimeException("Unhandled case: " + jsonElement);
        }

        @Override
        public TypeNameTree deserialize(JsonElement jsonElement, java.lang.reflect.Type type, JsonDeserializationContext jsonDeserializationContext) throws JsonParseException {

            return deserialize(jsonElement);
        }
    }

    private class SpecAdapter implements JsonDeserializer<Spec> {

        private final TypeResolver typeResolver;

        public SpecAdapter(TypeResolver typeResolver) {
            this.typeResolver = typeResolver;
        }

        @Override
        public Spec deserialize(JsonElement jsonElement, java.lang.reflect.Type type, JsonDeserializationContext ctx) throws JsonParseException {

            JsonObject jsonObject = jsonElement.getAsJsonObject();
            JsonArray data = jsonObject.get("data").getAsJsonArray();
            for (int id = 0; id < data.size(); id++) {
                JsonElement jsonElement1 = data.get(id);
                Type deserializedType = deserializeUnresolvedType(jsonElement1, ctx);
                this.typeResolver.register(id, deserializedType);
            }
            this.typeResolver.resolveAll();
            TypeNameTree globals = ctx.deserialize(jsonObject.get("globals"), TypeNameTree.class);
            TypeNameTree types = ctx.deserialize(jsonObject.get("types"), TypeNameTree.class);
            return new Spec(globals, types);
        }

        private Type deserializeUnresolvedType(JsonElement jsonElement, JsonDeserializationContext ctx) {

            JsonObject object = jsonElement.getAsJsonObject();
            TypeKind kind = TypeKind.valueOf(object.get("kind").getAsString());
            switch (kind) {
                case Any:
                case String:
                case Number:
                case Boolean:
                case Void:
                case Undefined:
                case Null:
                case Enum:
                    return ctx.deserialize(object, SimpleType.class);
                case StringLiteral:
                    return ctx.deserialize(object, StringLiteral.class);
                case BooleanLiteral:
                    return ctx.deserialize(object, BooleanLiteral.class);
                case NumberLiteral:
                    return ctx.deserialize(object, NumberLiteral.class);
                case Union:
                    return ctx.deserialize(object, UnionType.class);
                case Intersection:
                    return ctx.deserialize(object, IntersectionType.class);
                case Interface:
                    return ctx.deserialize(object, InterfaceType.class);
                case TypeParameter:
                    return ctx.deserialize(object, TypeParameterType.class);
                case Class:
                    return ctx.deserialize(object, ClassType.class);
                case ClassInstance:
                    return ctx.deserialize(object, ClassInstanceType.class);
                case Reference:
                    return ctx.deserialize(object, ReferenceType.class);
                case Generic:
                    return ctx.deserialize(object, GenericType.class);
                case Tuple:
                    return ctx.deserialize(object, TupleType.class);
                case Anonymous:
                    return ctx.deserialize(object, AnonymousType.class);
                case Never:
                    return ctx.deserialize(object, NeverType.class);
                case ThisType:
                    return ctx.deserialize(object, ThisType.class);
                case Symbol:
                    return ctx.deserialize(object, SymbolType.class);
                default:
                    throw new RuntimeException("Unhandled case: " + kind);
            }
        }
    }

    private class TypeIDAdapter implements JsonDeserializer<Type> {

        private final TypeResolver resolver;

        private TypeIDAdapter(TypeResolver resolver) {

            this.resolver = resolver;
        }

        @Override
        public Type deserialize(JsonElement jsonElement, java.lang.reflect.Type type, JsonDeserializationContext jsonDeserializationContext) throws JsonParseException {

            return this.resolver.resolve(jsonElement.getAsInt());
        }
    }

    public class Spec {

        private TypeNameTree globals;

        private TypeNameTree types;

        public Spec(TypeNameTree globals, TypeNameTree types) {

            this.globals = globals;
            this.types = types;
        }

        @Override
        public String toString() {

            return "Spec{" +
                    "globals=" + globals +
                    ", types=" + types +
                    '}';
        }

        public TypeNameTree getGlobals() {

            return globals;
        }

        public TypeNameTree getTypes() {

            return types;
        }
    }

    public class Leaf implements TypeNameTree {

        private final Type type;

        public Leaf(Type type) {

            this.type = type;
        }

        public Type getType() {

            return type;
        }

        @Override
        public String toString() {

            return "Leaf{" +
                    "type=" + type +
                    '}';
        }
    }

    public class Node implements TypeNameTree {

        private final Map<String, TypeNameTree> children;

        private Node(Map<String, TypeNameTree> children) {

            this.children = children;
        }

        public Map<String, TypeNameTree> getChildren() {

            return children;
        }

        @Override
        public String toString() {

            return "Node{" +
                    "children=" + children +
                    '}';
        }
    }
}

