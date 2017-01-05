package dk.au.cs.casa.typescript.types;

import java.util.List;

public class ThisType implements Type {

    private Type constraint;

    @Override
    public String toString() {
        return "ThisType{" +
                "constraint=" + constraint +
                '}';
    }

    public Type getConstraint() {
        return constraint;
    }

    public void setConstraint(Type constraint) {
        this.constraint = constraint;
    }

    @Override
    public <T> T accept(TypeVisitor<T> v) {
        return v.visit(this);
    }

    @Override
    public <T, A> T accept(TypeVisitorWithArgument<T, A> v, A a) {
        return v.visit(this, a);
    }

}
