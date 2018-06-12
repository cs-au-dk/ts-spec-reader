package dk.au.cs.casa.typescript.types;

import java.util.function.Supplier;

/**
 * Placeholder type which should be replaced with a real type later.
 * (deserialization does not see all types at once)
 */
public class DelayedType implements Type {
    private final Supplier<Type> generator;
    private Type type = null;

    public DelayedType(Supplier<Type> generator) {
        this.generator = generator;
    }

    @Override
    public <T> T accept(TypeVisitor<T> v) {
        return v.visit(this);
    }

    public Type getType() {
        if (type == null) {
            type = generator.get();
        }
        while (type instanceof DelayedType) {
            type = ((DelayedType) type).getType();
        }
        return type;
    }

    @Override
    public <T, A> T accept(TypeVisitorWithArgument<T, A> v, A a) {
        return v.visit(this, a);
    }
}
