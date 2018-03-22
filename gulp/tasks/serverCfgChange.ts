import {reload,writeFile,mkdirp} from "../utils";
import * as util from "util";
import * as path from "path";
import * as fs from "fs";
import {genCode as genApp} from "../genApp";
import {gen as genRpc} from "../genRpc";



const child=require("child_process");

function writeEmptyService(fname){
    let str=`
    export class Service {
            name:string="";
            getHandler(serviceId: number, type: string){
                return null;
            }
            constructor(){

            }
    }
    `
    console.log(`write empty ${fname}`);
    writeFile(fname,str,true) ;
}

export async function genServer(cfg,proj){
    for(let key in cfg){
            
        mkdirp( path.join(proj.basedir,"servers",key) );
        let serviceFname=path.join(proj.rpcdir,key,"service.ts");
        if( fs.existsSync( path.join(proj.rpcdir,key) ) == false) {
            mkdirp(path.join(proj.rpcdir,key));
            writeEmptyService(serviceFname);
        }

        let appcode = genApp(key);
        writeFile( path.join(proj.basedir,"servers",key,"app.ts"),appcode,false,true );
    }
   // let rpcOutDir=path.join(ts.basedir,"rpc");
    let str=genRpc(proj.rpcdir,Object.keys(cfg));
    console.log(`start write ${path.join(proj.rpcdir,"rpc.ts")}`)
    writeFile(path.join(proj.rpcdir,"rpc.ts"),str,true) ;
}

export async function onServerCfgChange(fullname:string,event:string,proj){
    if(event == "add"||event == "change"){
        let cfg = reload(proj.serverCfg);
        genServer(cfg,proj);
        return true;
    }else if(event == "unlink"){
        return true;
    }

    
}