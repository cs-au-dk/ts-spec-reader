package dk.au.cs.casa.typescript.types;

import java.util.List;

public class IntersectionType implements Type {
    private static int counter = 0;
    private final int count = counter++;


    public IntersectionType() {
        if (count == 0) {
            System.out.println();
        }
    }

    private List<Type> elements;

    public List<Type> getElements() {
        return elements;
    }

    public void setElements(List<Type> types) {
        this.elements = types;
    }

    @Override
    public String toString() {
        return "Intersection(" +
                elements +
                ')';
    }

    @Override
    public <T, A> T accept(TypeVisitorWithArgument<T, A> v, A a) {
        return v.visit(this, a);
    }

    @Override
    public <T> T accept(TypeVisitor<T> v) {
        return v.visit(this);
    }
}
