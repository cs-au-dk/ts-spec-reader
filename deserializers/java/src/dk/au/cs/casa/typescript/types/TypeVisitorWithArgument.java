package dk.au.cs.casa.typescript.types;

public interface TypeVisitorWithArgument<T, A> {
    T visit(AnonymousType t, A a);

    T visit(ClassType t, A a);

    T visit(GenericType t, A a);

    T visit(InterfaceType t, A a);

    T visit(ReferenceType t, A a);

    T visit(SimpleType t, A a);

    T visit(TupleType t, A a);

    T visit(UnionType t, A a);

    T visit(UnresolvedType t, A a);

    T visit(TypeParameterType t, A a);

    T visit(SymbolType t, A a);

    T visit(StringLiteral t, A a);

    T visit(BooleanLiteral t, A a);

    T visit(NumberLiteral t, A a);

    T visit(IntersectionType t, A a);

    T visit(ClassInstanceType t, A a);
}
