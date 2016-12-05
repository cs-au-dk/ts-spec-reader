package dk.au.cs.casa.typescript.types;

public class NeverType implements Type {
    @Override
    public String toString() {
        return "Never";
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
