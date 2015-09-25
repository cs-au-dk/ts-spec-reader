package dk.au.cs.casa.typescript.types;

import java.util.List;

public class Signature {
    private List<Parameter> parameters;

    public List<Parameter> getParameters () {
        return parameters;
    }

    public void setParameters (List<Parameter> parameters) {
        this.parameters = parameters;
    }

    @Override
    public String toString () {
        return "Signature(" + parameters + ")";
    }

    public static class Parameter/* NB: not actually a TypeScript compiler type! */ {
        private String name;
        private Type type;

        public String getName () {
            return name;
        }

        public void setName (String name) {

            this.name = name;
        }

        public Type getType () {
            return type;
        }

        public void setType (Type type) {
            this.type = type;
        }

        public String toString(){
            return name + ": " + type;
        }
    }
}
