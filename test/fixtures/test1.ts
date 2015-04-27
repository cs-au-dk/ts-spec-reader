/// <reference path="test1.d.ts" />

module A {
    var x:number
    export var foo = 42;
    module B {
        export var bar = 'bar'
    }
}

module C.D {
    export var cd = 42;
}

module E {
    export module F {
        var f = 42;
    }
}

module G {
    module H {

    }
}
var f: G;

A
A.x
new CLASS_TOP()
new Z.CLASS_IN_MODULE()
var x: X.Y.IFACE1_IN_X_Y;
