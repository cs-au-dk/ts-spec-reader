package dk.au.cs.casa.typescript.types;

import java.util.List;
import java.util.Map;

public class GenericType implements Type {
    /**
     * A mix of InterfaceType and ReferenceType.
     * TODO consider custom deserializer and delegation...
     */

    private List<Type> typeParameters;
    private List<Type> baseTypes;
    private Map<String, Type> declaredProperties;
    private List<Signature> declaredCallSignatures;
    private List<Signature> declaredConstructSignatures;
    private Type declaredStringIndexType;
    private Type declaredNumberIndexType;
    private Type target;
    private List<Type> typeArguments;

    /**
     * Creates an interface-type, with all the information from the this generic type, just without the target and typeArguments.
     *
     * @return An interface, where the generic information is erased.
     */
    public InterfaceType toInterface() {
        InterfaceType result = new InterfaceType();
        result.setTypeParameters(this.getTypeParameters());
        result.setBaseTypes(this.getBaseTypes());
        result.setDeclaredProperties(this.getDeclaredProperties());
        result.setDeclaredCallSignatures(this.getDeclaredCallSignatures());
        result.setDeclaredConstructSignatures(this.getDeclaredConstructSignatures());
        result.setDeclaredStringIndexType(this.getDeclaredStringIndexType());
        result.setDeclaredNumberIndexType(this.getDeclaredNumberIndexType());
        return result;
    }

    public List<Type> getTypeParameters() {
        return typeParameters;
    }

    public void setTypeParameters(List<Type> typeParameters) {
        this.typeParameters = typeParameters;
    }

    public List<Type> getBaseTypes() {
        return baseTypes;
    }

    public void setBaseTypes(List<Type> baseTypes) {
        this.baseTypes = baseTypes;
    }

    public Map<String, Type> getDeclaredProperties() {
        return declaredProperties;
    }

    public void setDeclaredProperties(Map<String, Type> declaredProperties) {
        this.declaredProperties = declaredProperties;
    }

    public List<Signature> getDeclaredCallSignatures() {
        return declaredCallSignatures;
    }

    public void setDeclaredCallSignatures(List<Signature> declaredCallSignatures) {
        this.declaredCallSignatures = declaredCallSignatures;
    }

    public List<Signature> getDeclaredConstructSignatures() {
        return declaredConstructSignatures;
    }

    public void setDeclaredConstructSignatures(List<Signature> declaredConstructSignatures) {
        this.declaredConstructSignatures = declaredConstructSignatures;
    }

    public Type getDeclaredStringIndexType() {
        return declaredStringIndexType;
    }

    public void setDeclaredStringIndexType(Type declaredStringIndexType) {
        this.declaredStringIndexType = declaredStringIndexType;
    }

    public Type getDeclaredNumberIndexType() {
        return declaredNumberIndexType;
    }

    public void setDeclaredNumberIndexType(Type declaredNumberIndexType) {
        this.declaredNumberIndexType = declaredNumberIndexType;
    }

    public Type getTarget() {
        return target;
    }

    public void setTarget(Type target) {
        this.target = target;
    }

    public List<Type> getTypeArguments() {
        return typeArguments;
    }

    public void setTypeArguments(List<Type> typeArguments) {
        this.typeArguments = typeArguments;
    }

    @Override
    public <T> T accept(TypeVisitor<T> v) {
        return v.visit(this);
    }

    @Override
    public String toString() {
        return "Generic(" + declaredProperties.keySet() + ")";
    }

    @Override
    public <T, A> T accept(TypeVisitorWithArgument<T, A> v, A a) {
        return v.visit(this, a);
    }

}
