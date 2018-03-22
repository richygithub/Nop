import * as fs from 'fs';
import * as path from 'path';

import { reload } from "./utils"
function firstLetterUpper(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
function RpcName(name:string){
    return `${firstLetterUpper(name)}Rpc`;
}
function ServiceName(name:string){
    return `${firstLetterUpper(name)}Service`;
}
function ServerName(name:string){
    return `${firstLetterUpper(name)}`;
}



export function gen(rpcdir:string,servers:Array<string>):string {

    if( path.isAbsolute(rpcdir) == false ){
        console.error(`rpcdir:${rpcdir} is not absolute path.`)
        return;
    }



    servers=servers.filter( name=>{
        let filename=path.join(rpcdir,name,"stub","remoteStub.ts");
        return fs.existsSync(filename);
    })

    let imptStr = `${servers.map(name => {
        return `import {Rpc as ${RpcName(name)},Service as ${ServiceName(name)} } from "./${name}/stub/remoteStub"`
    }).join(";")} `;


    let serverdef=`${servers.map(name => {
        return `export class ${ServerName(name)} implements ServerInfo {
            id:number;
            rpc:${RpcName(name)};
            opt:object;
            client:RpcClient;
            constructor(id:number,opt){
                this.id=id;
                this.client = new RpcClient( NetProto.TCP,opt.host,opt.port );
                this.rpc= new ${RpcName(name)}(this.client);
                this.opt = opt;
            }
        }
        `
    }).join(";")} `;


    let sdef=`${servers.map(name => {
        return `private _${name}:Map<number,${ServerName(name)}> = new Map<number,${ServerName(name)}>();
        private _${name}Array:Array<${ServerName(name)}>;
        private _${name}Null:any=genNullRpc(${ServiceName(name)});
        private ${name}Route:(routeParam, data:Array<ServerInfo>)=>ServerInfo = this.defaultRoute;
        ${name}(id:number):${RpcName(name)};
        ${name}(routeParam?:object):${RpcName(name)};
        ${name}(routeParam?):${RpcName(name)}{
            let stub:${ServerName(name)} = null;
            if( routeParam == null ) {
                stub = this.${name}Route(null,this._${name}Array);
            }else{
                switch( typeof(routeParam ) ){
                    case "number":
                    stub = this._${name}.get( routeParam);
                    break;
                }
            }
            return stub==null?this._${name}Null as any  : stub.rpc;
        }
        `
    }).join(";")} `;

    let setstr=`${servers.map(name => {
        return ` case "${name}":
        this.${name}Route = func;
        return true;
        `
    }).join("")} `;

    let getstr = `${servers.map(name => {
        return ` case "${name}":
        return this.${name}Route(param,this._areaArray).client;
        `
    }).join("")} `;

    let addstr=`${servers.map(name => {
        return ` case "${name}":
        this._${name}.set( id,new ${ServerName(name)}(id,opt) );
        this._${name}Array=[...this._${name}.values()];
        return true;
        `
    }).join("")} `;

    let delstr=`${servers.map(name => {
        return ` case "${name}":
        ret = this._${name}.delete(id);
        this._${name}Array = [...this._${name}.values()];
        return ret;
        `
    }).join("")} `;

    let template = ` import {MapArray} from "nop"
import * as utils from "nop"
import {RpcClient, NetProto,ServerInfo} from "nop"

${imptStr}


async function NullFunc(){
    return [null,new Error("not find rpc")];
}

function genNullRpc(Service) {
    let NullRpc={}
    Object.keys(Service).forEach(key => {
        NullRpc[key] = {}
        Service[key].reduce((pre, cur) => {
            pre[cur] = NullFunc;
            return pre;
        }, NullRpc[key])
    })
    return NullRpc;
}

${serverdef}


type RouteFunc = <T>(routeParam, data:Array<T>)=>any;

export class Rpc{
   
    ${sdef}

    setRoute<T>(type:string, func:(param, servers:Array<ServerInfo> )=>ServerInfo):boolean{
        switch(type){
            ${setstr}
            default:
            break;
        }
        return false;
    }

    getRoute(type:string,param:object):RpcClient{
        switch (type) {
           ${getstr}
        default:
            break;
        }
        return null;
      }

      private defaultRoute(opt, data: Array<ServerInfo>): ServerInfo{
        return utils.randArray(data);
      }

    addServer(stype:string,id:number,opt:any):boolean{
        switch(stype){
            ${addstr}
            default:
            break;
        }
        return false;
    }
    delServer(stype:string,id:number):boolean{
        let ret=false;
        switch(stype){
          ${delstr}
          default:
          break;
        }
        return ret;
      }
}

export const gRpc=new Rpc();

`
    return template; 
}