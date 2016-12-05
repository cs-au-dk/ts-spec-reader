package dk.au.cs.casa.typescript.types;

/**
 * Created by erik1 on 03-11-2016.
 */
public class BooleanLiteral implements Type {
    private final boolean value;

    public BooleanLiteral(boolean value) {
        this.value = value;
    }

    public boolean getValue() {
        return value;
    }

    @Override
    public <T> T accept(TypeVisitor<T> v) {
        return v.visit(this);
    }

    @Override
    public <T, A> T accept(TypeVisitorWithArgument<T, A> v, A a) {
        return v.visit(this, a);
    }

    @Override
    public String toString() {
        return "Boolean(" + this.value + ")";
    }
}
