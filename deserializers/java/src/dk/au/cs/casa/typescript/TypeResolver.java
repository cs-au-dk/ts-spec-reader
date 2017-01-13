package dk.au.cs.casa.typescript;

import dk.au.cs.casa.typescript.types.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Registers type by unique IDs and replaces the IDs with real types later.
 */
class TypeResolver {
    private boolean resolved = false;
    private Map<Integer, Type> typeIdMap = new HashMap<>();

    public Type resolve(int id) {
        if (!resolved) {
            return new UnresolvedType(id);
        }
        if (!typeIdMap.containsKey(id)) {
            throw new RuntimeException("Id " + id + " does not exist!?!");
        }
        return typeIdMap.get(id);
    }

    public void register(int id, Type type) {
        if (resolved) {
            throw new RuntimeException("Already fully resolved?!?" /* just a sanity check, technically it is fine to add more as long as a #resolveAll() is done afterwards... */);
        }
        if (typeIdMap.containsKey(id)) {
            throw new RuntimeException("Id " + id + " already used!?!");
        }
        typeIdMap.put(id, type);
    }

    public void resolveAll() {
        if (resolved) {
            throw new RuntimeException("Already fully resolved?!?");
        }
        resolved = true;
        TypeVisitor<Void> v = new ResolverVisitor();
        typeIdMap.entrySet().forEach(t -> {
            try {
                t.getValue().accept(v);
            } catch (NullPointerException e) {
                System.out.println("NullPointerException at id " + t.getKey() + " / type: " + t.getValue());
            }
        });
    }

    /**
     * Replaces UnresolvedType values in all fields of a type.
     */
    private class ResolverVisitor implements TypeVisitor<Void> {

        @Override
        public Void visit(AnonymousType t) {
            return null;
        }

        @Override
        public Void visit(ClassType t) {
            visit(t.getSignatures());
            t.setBaseTypes(map(t.getBaseTypes()));
            t.setInstanceProperties(mapMap(t.getInstanceProperties()));
            t.setStaticProperties(mapMap(t.getStaticProperties()));
            t.setDeclaredNumberIndexType(map(t.getDeclaredNumberIndexType()));
            t.setDeclaredStringIndexType(map(t.getDeclaredStringIndexType()));
            t.setTarget(map(t.getTarget()));
            t.setTypeArguments(map(t.getTypeArguments()));
            t.setTypeParameters(map(t.getTypeParameters()));
            return null;
        }

        @Override
        public Void visit(GenericType t) {
            // hmm.. this process of mentioning all field names twice seems error prone... perhaps a different recursion-resolution strategy should be used?
            t.setBaseTypes(map(t.getBaseTypes()));
            visit(t.getDeclaredCallSignatures());
            visit(t.getDeclaredConstructSignatures());
            t.setDeclaredNumberIndexType(map(t.getDeclaredNumberIndexType()));
            t.setDeclaredStringIndexType(map(t.getDeclaredStringIndexType()));
            t.setDeclaredProperties(mapMap(t.getDeclaredProperties()));
            t.setTarget(map(t.getTarget()));
            t.setTypeArguments(map(t.getTypeArguments()));
            t.setTypeParameters(map(t.getTypeParameters()));
            return null;
        }

        private Map<String, Type> mapMap(Map<String, Type> map) {
            Map<String, Type> mapped = new HashMap<>();
            map.forEach((k, v) -> mapped.put(k, map(v)));
            return mapped;
        }

        private void visit(List<Signature> signatures) {
            signatures.forEach(this::visit);
        }

        private void visit(Signature signature) {
            signature.getParameters().forEach(p -> {
                if (p.getType() instanceof UnresolvedType) {
                    p.setType(map(p.getType()));
                }
            });
            if (signature.getResolvedReturnType() instanceof UnresolvedType) {
                signature.setResolvedReturnType(map(signature.getResolvedReturnType()));
            }

            if (signature.getTarget() != null && signature.getTarget() != signature) {
                visit(signature.getTarget());
            }
        }

        private List<Type> map(List<Type> types) {
            return types.stream().map(this::map).collect(Collectors.toList());
        }

        private Type map(Type t) {
            if (t instanceof UnresolvedType) {
                return typeIdMap.get(((UnresolvedType) t).getId());
            } else {
                throw new RuntimeException("Expected only UnresolvedType here?! (" + t.getClass() + ")");
            }
        }

        @Override
        public Void visit(InterfaceType t) {
            t.setBaseTypes(map(t.getBaseTypes()));
            visit(t.getDeclaredCallSignatures());
            visit(t.getDeclaredConstructSignatures());
            t.setDeclaredNumberIndexType(map(t.getDeclaredNumberIndexType()));
            t.setDeclaredStringIndexType(map(t.getDeclaredStringIndexType()));
            t.setDeclaredProperties(mapMap(t.getDeclaredProperties()));
            t.setTypeParameters(map(t.getTypeParameters()));
            return null;
        }

        @Override
        public Void visit(ReferenceType t) {
            t.setTarget(map(t.getTarget()));
            t.setTypeArguments(map(t.getTypeArguments()));
            return null;
        }

        @Override
        public Void visit(SimpleType t) {
            return null;
        }

        @Override
        public Void visit(TupleType t) {
            t.setElementTypes(map(t.getElementTypes()));
            return null;
        }

        @Override
        public Void visit(UnionType t) {
            t.setElements(map(t.getElements()));
            return null;
        }

        @Override
        public Void visit(IntersectionType t) {
            t.setElements(map(t.getElements()));
            return null;
        }

        @Override
        public Void visit(ClassInstanceType t) {
            t.setClassType(map(t.getClassType()));
            return null;
        }

        @Override
        public Void visit(NeverType t) {
            return null;
        }

        @Override
        public Void visit(ThisType t) {
            t.setConstraint(map(t.getConstraint()));
            return null;
        }

        @Override
        public Void visit(IndexType t) {
            t.setType(map(t.getType()));
            return null;
        }

        @Override
        public Void visit(IndexedAccessType t) {
            t.setObjectType(map(t.getObjectType()));
            t.setIndexType(map(t.getIndexType()));
            return null;
        }

        @Override
        public Void visit(UnresolvedType t) {
            throw new RuntimeException("Should not occur here!?");
        }

        @Override
        public Void visit(TypeParameterType t) {
            t.setConstraint(map(t.getConstraint()));
            return null;
        }

        @Override
        public Void visit(SymbolType t) {
            return null;
        }

        @Override
        public Void visit(StringLiteral t) {
            return null;
        }

        @Override
        public Void visit(BooleanLiteral t) {
            return null;
        }

        @Override
        public Void visit(NumberLiteral t) {
            return null;
        }
    }
}
