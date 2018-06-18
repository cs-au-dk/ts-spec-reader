package dk.au.cs.casa.typescript.types;

import java.util.List;
import java.util.Map;

public class ClassType implements Type {
    @Override
    public String toString() {
        return "Class(" + instanceProperties.keySet() + ")";
    }

    @Override
    public <T> T accept(TypeVisitor<T> v) {
        return v.visit(this);
    }

    @Override
    public <T, A> T accept(TypeVisitorWithArgument<T, A> v, A a) {
        return v.visit(this, a);
    }

    private List<Signature> constructors; // <- constructors
    private List<Signature> callSignatures; // <- non-constructor interfaces.
    private List<Type> baseTypes;
    private Map<String, Type> staticProperties;
    private Map<String, Type> instanceProperties;
    private Type declaredStringIndexType;
    private Type declaredNumberIndexType;
    private Type target;
    private List<Type> typeParameters;
    private List<Type> typeArguments;
    private List<String> staticReadonlyProperties;
    private List<String> instanceReadOnlyProperties;

    public List<String> getStaticReadonlyProperties() {
        return staticReadonlyProperties;
    }

    public void setStaticReadonlyProperties(List<String> staticReadonlyProperties) {
        this.staticReadonlyProperties = staticReadonlyProperties;
    }

    public List<String> getInstanceReadOnlyProperties() {
        return instanceReadOnlyProperties;
    }

    public void setInstanceReadOnlyProperties(List<String> instanceReadOnlyProperties) {
        this.instanceReadOnlyProperties = instanceReadOnlyProperties;
    }

    public List<Signature> getConstructors() {
        return constructors;
    }

    public void setConstructors(List<Signature> constructors) {
        this.constructors = constructors;
    }

    public List<Signature> getCallSignatures() {
        return callSignatures;
    }

    public void setCallSignatures(List<Signature> callSignatures) {
        this.callSignatures = callSignatures;
    }

    public List<Type> getBaseTypes() {
        return baseTypes;
    }

    public void setBaseTypes(List<Type> baseTypes) {
        this.baseTypes = baseTypes;
    }

    public Map<String, Type> getStaticProperties() {
        return staticProperties;
    }

    public void setStaticProperties(Map<String, Type> staticProperties) {
        this.staticProperties = staticProperties;
    }

    public Map<String, Type> getInstanceProperties() {
        return instanceProperties;
    }

    public void setInstanceProperties(Map<String, Type> instanceProperties) {
        this.instanceProperties = instanceProperties;
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

    public List<Type> getTypeParameters() {
        return typeParameters;
    }

    public void setTypeParameters(List<Type> typeParameters) {
        this.typeParameters = typeParameters;
    }

    public List<Type> getTypeArguments() {
        return typeArguments;
    }

    public void setTypeArguments(List<Type> typeArguments) {
        this.typeArguments = typeArguments;
    }

    public ClassInstanceType instance = null;
    public ClassInstanceType getInstance() {
        if (instance != null) {
            return instance;
        }
        ClassInstanceType result = new ClassInstanceType();
        result.setClassType(this);
        instance = result;
        return result;
    }
}
