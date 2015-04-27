export module TEST {
    export var TEST_VAR:number;
}

interface TOP_LEVEL_1 {
    PROPERTY: number | {p: string[]}
}
interface supersupertype {

}
interface supertype extends supersupertype {

}

interface subtype extends supertype {

}

interface TOP_LEVEL_2 {

}

declare
var subtypeVar:subtype;
declare
class CLASS_TOP {

}
declare module A1.A2 {
    interface A1A2IFace {
    }
    export var p:number
}
interface TOP_LEVEL_1 {
    PROPERTY_2: string | number
}

interface TOP_LEVEL_3 {
    PROPERTY?: number
}

declare module X {
    module Y {
        export interface IFACE1_IN_X_Y {p: number
        }
        interface IFACE2 {x: number
        }
        export var y:number
    }
}

declare module Z {
    export interface EXPORTED_IFACE1 {p: string
    }
    interface NON_EXPORTED_IFACE1 {p: string
    }

    class CLASS_IN_MODULE {

    }
}
declare
var MY_GLOBAL_VAR_1a:X.Y.IFACE1_IN_X_Y
declare
var MY_GLOBAL_VAR_1b:Z.EXPORTED_IFACE1
declare
var MY_GLOBAL_VAR_2:number
declare
var MY_GLOBAL_VAR_3:TOP_LEVEL_2


declare module MY_GLOBAL_MODULE {

}
interface ALIASED1 {
}
interface ALIASED2 {
}
declare type ALIAS1 = ALIASED1;
declare type ALIAS2 = ALIAS3;
declare type ALIAS3 = ALIASED2;

interface merge1 {
    p: string
}
interface merge2 {
    q: string
}

declare type AliasMerge = merge1 | merge2;
declare
var aliasTypeVar:ALIAS2;
declare
var aliasTypeMergeVar:AliasMerge;

interface Generic<T> {
    t: T
}
declare
var genericVar1:string[];
declare
var genericVar2:Generic<string>;
declare
var ungenericVar2:Generic;

declare module NullUndefModule {
    export var NullUndefVar:undefined | number
}

interface F {
    (): number
    (number): number
}
declare
var PropInstance:PropInterface;
interface PropInterface {
    pNum1: number
    pNum2: number
    pStr1: string
    pStr2: string
    constructor_in_interface();
    method():void;
}


declare
class CLASS {
    constructor(n:number);

    method(n:number, s:string):boolean;
}
declare module mongodb_example {
    export class Server {
        constructor(host:string, port:number, opts?:any, moreopts?:any);
    }
    export class Db {
        constructor(databaseName:string, serverConfig:Server);

        public open(callback:()=>void);
    }
}

declare
var ClassInstance:mongodb_example.Server;

declare module functionContainer {
    function innerFunction();
}
declare
function f();


interface strlitInterface {
    strLit(f:'foo');
    strLit(f:'bar');
    strLit(x:any);
}

declare
var strLitIVar:strlitInterface

declare
var objLit:{p: number};

declare
var dynPropObjLitVar:{'xy z': number};
