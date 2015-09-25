package dk.au.cs.casa.typescript.types;

public interface Type {
    <T> T accept(TypeVisitor<T> v);

    <T, A> T accept(TypeVisitorWithArgument<T, A> v, A a);
}
