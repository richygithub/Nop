const Proto =require('rpcprotol');
import * as fs from "fs";
import {join} from "path";
import {gen as genRpc} from "../genRpc"
export function genProtoAll(proj){
    fs.readdirSync(proj.protodir)
    .filter( fname=>fname.endsWith(".rpc"))
    .forEach(fname=>{
        console.log(`gen rpc:${fname}`);
        Proto.genCode( join(proj.protodir,fname),proj.rpcdir);
    })

    let cfg = require(proj.serverCfg);
    genRpc( proj.rpcdir,Object.keys(cfg) );

}

export function onProtoChange(fullname:string,type:"add"|"change"|"unlink",proj){
    if(type == "add" || type =="change"){
        console.log(`build proto ${fullname}`)
        Proto.genCode(fullname,proj.rpcdir);

        let cfg = require(proj.serverCfg);
        genRpc( proj.rpcdir,Object.keys(cfg) );


    }else if(type =="unlink"){
        //delete ...
    }

}


