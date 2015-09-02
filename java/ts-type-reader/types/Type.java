package dk.brics.tajs.envspec.typescript.types;

public interface Type {
    <T> T accept(TypeVisitor<T> v);

    <T, A> T accept(TypeVisitorWithArgument<T, A> v, A a);
}
