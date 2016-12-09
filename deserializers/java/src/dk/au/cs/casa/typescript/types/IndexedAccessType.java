package dk.au.cs.casa.typescript.types;

public class IndexedAccessType implements Type {
    private Type objectType;
    private Type indexType;

    public Type getObjectType() {
        return objectType;
    }

    public void setObjectType(Type objectType) {
        this.objectType = objectType;
    }

    public Type getIndexType() {
        return indexType;
    }

    public void setIndexType(Type indexType) {
        this.indexType = indexType;
    }

    @Override
    public String toString() {
        return "IndexedAccessType{" +
                "objectType=" + objectType +
                ", indexType=" + indexType +
                '}';
    }

    @Override
    public <T> T accept(TypeVisitor<T> v) {
        return v.visit(this);
    }

    @Override
    public <T, A> T accept(TypeVisitorWithArgument<T, A> v, A a) {
        return v.visit(this, a);
    }
}
