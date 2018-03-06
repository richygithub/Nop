"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Ast;
(function (Ast) {
    let Type;
    (function (Type) {
        Type[Type["bool"] = 0] = "bool";
        Type[Type["int16"] = 1] = "int16";
        Type[Type["int32"] = 2] = "int32";
        Type[Type["int64"] = 3] = "int64";
        Type[Type["float"] = 4] = "float";
        Type[Type["double"] = 5] = "double";
        Type[Type["string"] = 6] = "string";
        Type[Type["Buffer"] = 7] = "Buffer";
        Type[Type["json"] = 8] = "json";
        Type[Type["userDef"] = 9] = "userDef";
        Type[Type["pb"] = 10] = "pb"; //protobuf
    })(Type = Ast.Type || (Ast.Type = {}));
    let Label;
    (function (Label) {
        Label[Label["Single"] = 0] = "Single";
        Label[Label["Array"] = 1] = "Array";
        Label[Label["Buffer"] = 2] = "Buffer";
    })(Label = Ast.Label || (Ast.Label = {}));
    class TypeDeclare {
        constructor() {
            this.name = "";
            this.typeName = "";
            this.type = null;
            this.label = null;
        }
    }
    Ast.TypeDeclare = TypeDeclare;
    class UserType {
        constructor() {
            this.name = "";
            this.package = "";
            this.fieldList = new Array();
        }
    }
    Ast.UserType = UserType;
    class Rpc {
        constructor() {
            this.name = "";
            this.input = new Array();
            this.output = null;
        }
    }
    Ast.Rpc = Rpc;
    class Scope {
        constructor() {
            this.name = "";
            this.rpc = new Array();
        }
        toJSON() {
            return { rpc: this.rpc };
        }
    }
    Ast.Scope = Scope;
    class Service {
        constructor() {
            this.name = "";
            this.dep = new Array();
            this.remote = null;
            this.handler = null;
        }
    }
    Ast.Service = Service;
    class Root {
        constructor() {
            this.name = "";
            this.userType = new Array();
            this.services = new Array();
        }
    }
    Ast.Root = Root;
})(Ast = exports.Ast || (exports.Ast = {}));
function getEnum(enumDef, typename) {
    //    let e = Ast.Type[typename];
    //    return e;
    return enumDef[typename];
}
class Unresolved {
    constructor() {
        this.symbols = new Set();
    }
    add(typename) {
        this.symbols[typename];
    }
}
class SymbolTable {
    constructor() {
        this.unresolved = new Set();
        this.userDef = new Map();
        this.typePkg = new Array();
    }
    bind(type, servcie) {
        this.typePkg.push([type, servcie]);
    }
    addUnresolve(typename) {
        this.unresolved.add(typename);
    }
    addUserDef(typename, node) {
        if (this.userDef.has(typename)) {
            throw new Error(`multiple define class ${typename}`);
        }
        this.userDef.set(typename, node);
        this.unresolved.delete(typename);
        console.log(`add UserDef ${typename}`);
        console.log(this.userDef);
    }
    endParse(root) {
        console.log("set is:", this.unresolved);
        this.unresolved.forEach(k => {
            throw new Error(`unresolved symbol ${k}`);
        });
        this.userDef.forEach((type, name) => {
            type.package = root.name;
            root.userType.push(type);
        });
    }
}
let symbols = new SymbolTable();
let parser = new Unresolved();
exports.Label = Ast.Label;
function getType(typeName, label = "Single") {
    let node = new Ast.TypeDeclare();
    node.typeName = typeName;
    node.type = getEnum(Ast.Type, typeName); //getTypeEnum(typeName);
    node.label = getEnum(Ast.Label, label);
    //    console.log(" get type...",node.type,node.typeName);
    if (node.type == null) {
        //user define. or pb.
        //parser.add(typeName);
        if (symbols.userDef.has(typeName)) {
            node.type = Ast.Type.userDef;
        }
        else {
            console.log(`add unresolved.. ${typeName}`);
            symbols.addUnresolve(typeName);
        }
    }
    return node;
}
exports.getType = getType;
function getRpc() {
    let node = new Ast.Rpc();
    return node;
}
exports.getRpc = getRpc;
function getScope() {
    return new Ast.Scope();
}
exports.getScope = getScope;
function getUserType() {
    return new Ast.UserType();
}
exports.getUserType = getUserType;
function getService(node, service = null) {
    let S = service;
    if (S == null) {
        S = new Ast.Service();
    }
    if (node instanceof Ast.Scope) {
        switch (node.name) {
            case "handler":
                S.handler = node;
                break;
            case "remote":
                S.remote = node;
                break;
            default:
                console.log(`unknown service type ${node.name}.`);
                break;
        }
    }
    else if (node instanceof Ast.UserType) {
        //        symbols.bind( node,S );
        symbols.addUserDef(node.name, node);
    }
    return S;
}
exports.getService = getService;
function getRoot(node, root = null) {
    let Root = root;
    if (Root == null) {
        Root = new Ast.Root();
    }
    if (node instanceof Ast.Service) {
        Root.services.push(node);
    }
    else if (node instanceof Ast.UserType) {
        symbols.addUserDef(node.name, node);
        //        Root.userType.push(node);
    }
    return Root;
}
exports.getRoot = getRoot;
//import fs = require('fs');
function endParse(root) {
    symbols.endParse(root);
    //    let str= JSON.stringify(root) ;
    //    fs.writeFileSync("ast.json", str) ;
    return root;
}
exports.endParse = endParse;
//# sourceMappingURL=proto.js.map