package dk.au.cs.casa.typescript.types;

/**
 * Created by erik1 on 03-11-2016.
 */
public class StringLiteral implements Type {
    private final String text;

    public StringLiteral(String text) {
        if (text == null) {
            throw new RuntimeException();
        }
        this.text = text;
    }

    public String getText() {
        return text;
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
        return "String(" + this.text + ")";
    }
}
