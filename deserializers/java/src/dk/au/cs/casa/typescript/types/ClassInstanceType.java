package dk.au.cs.casa.typescript.types;

public class ClassInstanceType implements Type {
    private Type classType;

    @Override
    public <T> T accept(TypeVisitor<T> v) {
        return v.visit(this);
    }

    @Override
    public <T, A> T accept(TypeVisitorWithArgument<T, A> v, A a) {
        return v.visit(this, a);
    }

    public Type getClassType() {
        return classType;
    }

    public void setClassType(Type classType) {
        this.classType = classType;
    }

    @Override
    public String toString() {
        return "ClassInstance(" +
                classType +
                ')';
    }
}
