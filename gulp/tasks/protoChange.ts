const Proto =require('rpcprotol');
import * as fs from "fs";
import {join} from "path";
import {gen as genRpc} from "../genRpc"
import {reload,writeFile,mkdirp} from "../utils";
export function genProtoAll(proj){


    let rpcFinal=[];
    let depFinal=[];

    //let rpc:Map<string,[string,string]> = new Map<string,[string,string]>();

    fs.readdirSync(proj.protodir)
    .filter( fname=>fname.endsWith(".rpc"))
    .forEach(fname=>{
        console.log(`gen rpc:${fname}`);
        Proto.genCode( join(proj.protodir,fname),proj.rpcdir);
        //let [rpcStr,depStr]  = Proto.genRemoteStub(root);
        //rpc.set( root.name, Proto.genRemoteStub(root) )
        /*
        rpcFinal.push(rpcStr);
        depFinal.push(depStr);
        console.log(" .... ",depStr);
        console.log(" .... ",rpcStr);
        */
    })

    //let str=gen2(rpc);
    //writeFile(join(proj.rpcdir,"rpc2.ts"),str,true,true) ;
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


