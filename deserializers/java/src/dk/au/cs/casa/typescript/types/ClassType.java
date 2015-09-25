package dk.au.cs.casa.typescript.types;

public class ClassType extends InterfaceType {
    @Override
    public String toString() {
        return "Class";
    }

    @Override
    public <T> T accept(TypeVisitor<T> v) {
        return v.visit(this);
    }
}
