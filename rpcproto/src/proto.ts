export namespace Ast{
    export enum Type {
        bool = 0,
        int16,
        int32,
        int64,
        float,
        double,
        string,
        Buffer,
        json,
        userDef,
        pb  //protobuf
    }

    export enum Label{
        Single,
        Array,
        Buffer
    }

    export class TypeDeclare {
        name: string;
        type: Type;
        typeName: string;
        label:Label;
        constructor(){
            this.name= "" 
            this.typeName=""
            this.type=null;
            this.label=null;
        } 
        
    }

    export class UserType {
        name: string;
        package: string;
        fieldList: Array<TypeDeclare>;
        constructor(){
            this.name="";
            this.package="";
            this.fieldList = new Array<TypeDeclare>();
        }
    }

    export class Rpc {
        name: string;
        input: Array<TypeDeclare>;
        output: TypeDeclare;
        constructor(){
            this.name="";
            this.input = new Array<TypeDeclare>();
            this.output=null;
        }
    }


    export class Scope{
        name:string;
        rpc: Array<Rpc> ;
        constructor(){
            this.name = "";
            this.rpc = new Array<Rpc>();
        }
        toJSON(){
            return {rpc:this.rpc };
        }
   }



    export class Service {
        dep: Array<string>;
        name: string;
        remote: Scope;
        handler: Scope;
        constructor(){
            this.name = "";
            this.dep = new Array<string>();
            this.remote = null;
            this.handler= null;
        }
    }

    export class Root {
        name: string;
        services: Array<Service>; 
        userType: Array<UserType>;
        constructor(){
            this.name = "";
            this.userType = new Array<UserType>();
            this.services= new Array<Service>();
 
        }
    }

}

function getEnum<T>(enumDef:T,typename:string){
//    let e = Ast.Type[typename];
//    return e;
    return enumDef[typename];
}

class Unresolved{
    symbols:Set<string>;
    constructor(){
        this.symbols = new Set<string>();
    }
    add(typename:string){
       this.symbols[typename];
    }
}

class SymbolTable{
    unresolved:Set<string> = new Set<string>();
    userDef:Map<string,Ast.UserType> = new Map<string,Ast.UserType>();
    typePkg:Array< [Ast.UserType,Ast.Service] > =new Array< [Ast.UserType,Ast.Service] >()
    bind(type:Ast.UserType,servcie:Ast.Service){
        this.typePkg.push( [type,servcie ]);
    }
    addUnresolve(typename:string){
        this.unresolved.add(typename);
    }
    addUserDef(typename:string,node:Ast.UserType){
        if(this.userDef.has(typename) ){
            throw new Error(`multiple define class ${typename}`);
        }
        this.userDef.set(typename,node);
        this.unresolved.delete(typename);
        console.log(`add UserDef ${typename}`)
        console.log(this.userDef);
    }
    endParse(root:Ast.Root){
        console.log("set is:",this.unresolved);
        this.unresolved.forEach( k=>{
            throw new Error(`unresolved symbol ${k}`);
        })
        this.userDef.forEach( (type,name)=>{
            type.package = root.name;
            root.userType.push( type);
        })

    }
}

let symbols = new SymbolTable();

let parser = new Unresolved();

export var Label = Ast.Label; 
export function getType(typeName:string,label:"Single"|"Array"|"Buffer"="Single"):Ast.TypeDeclare{
    
    let node = new Ast.TypeDeclare();
    node.typeName=typeName;
    node.type = getEnum(Ast.Type,typeName);  //getTypeEnum(typeName);
    node.label = getEnum(Ast.Label, label);
//    console.log(" get type...",node.type,node.typeName);
    if( node.type == null ){
        //user define. or pb.
        //parser.add(typeName);
        if(symbols.userDef.has(typeName) ){
            node.type = Ast.Type.userDef;
        }else{

            console.log(`add unresolved.. ${typeName}`)
            symbols.addUnresolve(typeName);
        }
    }
    return node;
}
export function getRpc(){
    let node = new Ast.Rpc();
    return node;
}
export function getScope(){
    return new Ast.Scope();
}
export function getUserType(){
    return new Ast.UserType();
}
export function getService(node,service=null){
    let S = service;
    if(S == null ){
        S = new Ast.Service();
    }
    if( node instanceof Ast.Scope ){
        switch(node.name){
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
    }else if( node instanceof Ast.UserType ){
//        symbols.bind( node,S );
        symbols.addUserDef(node.name,node);
    }
    return S;
}
export function getRoot(node,root=null){
    let Root:Ast.Root = root;
    if( Root == null ){
        Root = new Ast.Root();
    }
    if( node instanceof Ast.Service ){
        Root.services.push(node);
    }else if(node instanceof Ast.UserType){
        symbols.addUserDef(node.name,node);
//        Root.userType.push(node);
    }
    return Root;
}

//import fs = require('fs');
export function endParse(root:Ast.Root){

    symbols.endParse(root);
//    let str= JSON.stringify(root) ;
//    fs.writeFileSync("ast.json", str) ;
    return root;
}

