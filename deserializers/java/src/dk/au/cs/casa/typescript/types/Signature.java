package dk.au.cs.casa.typescript.types;

import java.util.List;

public class Signature {
    private List<Integer> typeParameters;
    private List<Parameter> parameters;
    private Type resolvedReturnType;
    private int minArgumentCount;
    private boolean hasRestParameter;
    private boolean hasStringLiterals;
    private Signature target;
    /* mapper */
    private List<Signature> unionSignatures;
    /* erasedSignatureCache */
    private Type isolatedSignatureType;

    public Type getIsolatedSignatureType() {
        return isolatedSignatureType;
    }

    public void setIsolatedSignatureType(Type isolatedSignatureType) {
        this.isolatedSignatureType = isolatedSignatureType;
    }

    public List<Integer> getTypeParameters() {
        return typeParameters;
    }

    public void setTypeParameters(List<Integer> typeParameters) {
        this.typeParameters = typeParameters;
    }

    public List<Parameter> getParameters() {
        return parameters;
    }

    public void setParameters(List<Parameter> parameters) {
        this.parameters = parameters;
    }

    public Type getResolvedReturnType() {
        return resolvedReturnType;
    }

    public void setResolvedReturnType(Type resolvedReturnType) {
        this.resolvedReturnType = resolvedReturnType;
    }

    public int getMinArgumentCount() {
        return minArgumentCount;
    }

    public void setMinArgumentCount(int minArgumentCount) {
        this.minArgumentCount = minArgumentCount;
    }

    public boolean isHasRestParameter() {
        return hasRestParameter;
    }

    public void setHasRestParameter(boolean hasRestParameter) {
        this.hasRestParameter = hasRestParameter;
    }

    public boolean isHasStringLiterals() {
        return hasStringLiterals;
    }

    public void setHasStringLiterals(boolean hasStringLiterals) {
        this.hasStringLiterals = hasStringLiterals;
    }

    public Signature getTarget() {
        return target;
    }

    public void setTarget(Signature target) {
        this.target = target;
    }

    public List<Signature> getUnionSignatures() {
        return unionSignatures;
    }

    public void setUnionSignatures(List<Signature> unionSignatures) {
        this.unionSignatures = unionSignatures;
    }

    public static class Parameter/* NB: not actually a TypeScript compiler type! */ {
        private String name;
        private Type type;

        public String getName () {
            return name;
        }

        public void setName (String name) {
            this.name = name;
        }

        public Type getType () {
            return type;
        }

        public void setType (Type type) {
            this.type = type;
        }

        public String toString(){
            return name + ": " + type;
        }
    }
}
