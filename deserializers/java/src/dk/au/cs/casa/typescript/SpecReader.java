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
    private final List<NamedType> namedTypes;
    private final List<NamedType> ambientTypes;
    private final Map<String, Map<String, ElementInfo>> locations;

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
        Gson gson = builder.create();
        Spec spec = gson.fromJson(specification, Spec.class);
        this.namedTypes = spec.getTypes();
        InterfaceType global = makeEmptySyntheticInterfaceType();
        global.getDeclaredProperties().putAll(flattenTypeNameTree(spec.getGlobals()));
        this.global = global;
        this.ambientTypes = spec.getAmbient();
        this.locations = spec.getLocations();
    }

    public SpecReader(Type global, List<NamedType> namedTypes, List<NamedType> ambientTypes, Map<String, Map<String, ElementInfo>> locations) {
        this.global = global;
        this.namedTypes = namedTypes;
        this.ambientTypes = ambientTypes;
        this.locations = locations;
    }

    /**
     * Flattens a tree already flat tree. Exceptions will be thrown if the tree is not flat...
     */
    private static Map<String, Type> flattenTypeNameTree(List<NamedType> tree) {
        // should be type safe...
        Map<String, Type> map = new HashMap<>();
        for (NamedType namedType : tree) {
            assert namedType.qName.size() == 1;
            map.put(namedType.qName.iterator().next(), namedType.type);
        }

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
        interfaceType.setReadonlyDeclarations(newList());
        interfaceType.setDeclaredNumberIndexType(null);
        interfaceType.setDeclaredProperties(newMap());
        interfaceType.setDeclaredStringIndexType(null);
        interfaceType.setTypeParameters(newList());
        return interfaceType;
    }
    /**
     * Convinience method for creting synthetic instances of the InterfaceType.
     * Simplifies some implementation-cases.
     */
    public static GenericType makeEmptySyntheticGenericType() {
        GenericType genericType = new GenericType();
        genericType.setBaseTypes(newList());
        genericType.setDeclaredCallSignatures(newList());
        genericType.setDeclaredConstructSignatures(newList());
        genericType.setDeclaredNumberIndexType(null);
        genericType.setDeclaredProperties(newMap());
        genericType.setDeclaredStringIndexType(null);
        genericType.setTypeParameters(newList());
        genericType.setTypeArguments(newList());
        genericType.setTarget(genericType);
        return genericType;
    }

    private static <K, V> Map<K, V> newMap() {
        return new HashMap<>();
    }

    private static <T> List<T> newList() {
        return new ArrayList<>();
    }

    public List<NamedType> getNamedTypes() {
        return namedTypes;
    }

    public InterfaceType getGlobal() {
        return (InterfaceType) global;
    }

    public List<NamedType> getAmbientTypes() {
        return ambientTypes;
    }

    public Map<String, Map<String, ElementInfo>> getLocations() {
        return locations;
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

            List<NamedType> globals = new ArrayList<>();
            JsonArray globalsArr = jsonObject.getAsJsonArray("globals");
            for (int i = 0; i < globalsArr.size(); i++) {
                globals.add(ctx.deserialize(globalsArr.get(i), NamedType.class));
            }

            List<NamedType> types = new ArrayList<>();
            JsonArray typesArr = jsonObject.getAsJsonArray("types");
            for (int i = 0; i < typesArr.size(); i++) {
                types.add(ctx.deserialize(typesArr.get(i), NamedType.class));
            }

            List<NamedType> ambient = new ArrayList<>();
            JsonArray ambientArr = jsonObject.getAsJsonArray("ambient");
            for (int i = 0; i < ambientArr.size(); i++) {
                ambient.add(ctx.deserialize(ambientArr.get(i), NamedType.class));
            }

            Map<String, Map<String, ElementInfo>> fileLocations = new HashMap<>();
            JsonObject object = jsonObject.getAsJsonObject("locations");
            for (Map.Entry<String, JsonElement> fileEntry : object.entrySet()) {
                HashMap<String, ElementInfo> locations = new HashMap<>();
                fileLocations.put(fileEntry.getKey(), locations);

                for (Map.Entry<String, JsonElement> locationEntry : fileEntry.getValue().getAsJsonObject().entrySet()) {
                    String elementKind = locationEntry.getValue().getAsJsonObject().get("kind").getAsString();
                    Type typeInfo = ctx.deserialize(locationEntry.getValue().getAsJsonObject().get("type"), Type.class);
                    String debug = locationEntry.getValue().getAsJsonObject().get("debug").getAsString();
                    locations.put(locationEntry.getKey(), new ElementInfo(typeInfo, elementKind, debug));
                }
            }

            return new Spec(globals, types, ambient, fileLocations);
        }

        private Type deserializeUnresolvedType(JsonElement jsonElement, JsonDeserializationContext ctx) {
            if(jsonElement.isJsonNull()) return null;

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
                case Symbol:
                case Never:
                case Object:
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
                case ThisType:
                    return ctx.deserialize(object, ThisType.class);
                case Index:
                    return ctx.deserialize(object, IndexType.class);
                case IndexedAccess:
                    return ctx.deserialize(object, IndexedAccessType.class);
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

    public static final class NamedType {
        public Type type;
        public List<String> qName;

        public NamedType() {}

        public NamedType(Type type, List<String> qName) {
            this.type = type;
            this.qName = qName;
        }
    }

    public static final class ElementInfo {
        public Type type;
        public String kind;
        public String debug;

        ElementInfo(Type type, String kind, String debug) {
            this.type = type;
            this.kind = kind;
            this.debug = debug;
        }

        @Override
        public String toString() {
            return "ElementInfo{" +
                    "type=" + type +
                    ", kind='" + kind + '\'' +
                    ", debug='" + debug + '\'' +
                    '}';
        }
    }

    public static class Spec {
        private List<NamedType> globals;
        private List<NamedType> types;
        private List<NamedType> ambient;
        private Map<String, Map<String, ElementInfo>> locations;

        public Spec(List<NamedType> globals, List<NamedType> types, List<NamedType> ambient, Map<String, Map<String, ElementInfo>> locations) {
            this.globals = globals;
            this.types = types;
            this.ambient = ambient;
            this.locations = locations;
        }

        @Override
        public String toString() {
            return "Spec{" +
                    "globals=" + globals +
                    ", types=" + types +
                    ", ambient=" + ambient +
                    '}';
        }

        public Map<String, Map<String, ElementInfo>> getLocations() {
            return locations;
        }

        public List<NamedType> getGlobals() {
            return globals;
        }

        public List<NamedType> getTypes() {
            return types;
        }

        public List<NamedType> getAmbient() {
            return ambient;
        }
    }
}

