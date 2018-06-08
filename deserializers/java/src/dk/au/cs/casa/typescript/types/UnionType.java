package dk.au.cs.casa.typescript.types;

import java.util.List;

public class UnionType implements Type {
    private List<Type> elements;

    public UnionType() {}

    public UnionType(List<Type> elements) {
        this.elements = elements;
    }

    public List<Type> getElements() {
        return elements;
    }

    public void setElements(List<Type> types) {
        this.elements = types;
    }

    @Override
    public String toString() {
        return "Union(" +
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
