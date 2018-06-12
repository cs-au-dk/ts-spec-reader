package dk.au.cs.casa.typescript.types;

public interface TypeVisitor<T> {
    T visit(AnonymousType t);

    T visit(ClassType t);

    T visit(GenericType t);

    T visit(InterfaceType t);

    T visit(ReferenceType t);

    T visit(SimpleType t);

    T visit(TupleType t);

    T visit(UnionType t);

    default T visit(UnresolvedType t) {
        throw new RuntimeException();
    }

    T visit(TypeParameterType t);

    T visit(StringLiteral t);

    T visit(BooleanLiteral t);

    T visit(NumberLiteral t);

    T visit(IntersectionType t);

    T visit(ClassInstanceType t);

    T visit(ThisType t);

    T visit(IndexType t);

    T visit(IndexedAccessType t);

    default T visit(DelayedType delayedType) {
        throw new RuntimeException();
    }
}
