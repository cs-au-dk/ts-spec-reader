package dk.au.cs.casa.typescript.types;

public class TypeParameterType implements Type {
    private Type constraint;

    public Type getConstraint() {
        return constraint;
    }

    public void setConstraint(Type constraint) {
        this.constraint = constraint;
    }

    @Override
    public <T, A> T accept(TypeVisitorWithArgument<T, A> v, A a) {
        return v.visit(this, a);
    }

    @Override
    public String toString() {
        return "TypeParameter";
    }

    @Override
    public <T> T accept(TypeVisitor<T> v) {
        return v.visit(this);
    }

}
