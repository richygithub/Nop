import {Ast} from "./proto";
import  * as fs from "fs";
import {genCode as genTsCode } from "./genCodeTs";

const proto = require('./rpcproto');

export function parse(fname:string):Ast.Root{

    if( !fs.existsSync(fname) ){
        console.error(`file ${fname} dose not exsit.`);
        return null;
    }
    let str=fs.readFileSync(fname,"utf8");
    try{
        proto.parser.parse(str);
        return proto.parser.ast;
    }catch(e){
        console.error(`parse error.${e.stack}`);
        return null;
    }

}

export function genCode(fname:string,outdir:string){
    let root = parse(fname);
    if( root != null ){
        genTsCode(root,outdir);
    }else{
        console.error(`ast root is null`);
    }
}


export {Ast} from "./proto" ;