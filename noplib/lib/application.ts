import { RpcServer,RpcClient, NetProto,Services } from "../index"



export interface Component{
    name:string;
    init:()=>Promise<boolean>;
    start:()=>Promise<boolean>;
    stop:()=>Promise<boolean>;
}


export interface RpcStub{
    getRoute(type:string,param:object):RpcClient;
    addServer(type:string,id:number,host:string,port:number, opt:object):boolean;
    delServer(type:string,id:number):boolean;
}


export class ServerInfo{
    id:number;
    opt:object;
    client:RpcClient;
    name:string;
    constructor(id:number,name:string,host:string,port:number, opt:object){
        this.id=id;
        this.name=name;
        this.client = new RpcClient(NetProto.TCP,host,port);
        this.opt = opt;
    }
}

type routeFunc = (routeParam,servers:Array<ServerInfo>)=>ServerInfo;
export abstract class Application{
   
    private _coms:Map<string,Component> = new Map<string,Component>();
    private _props:Map<string,any>=new Map<string,any>();
    //private _routes:Map<string,routeFunc>=new Map<string,routeFunc>();
    id:number;
    type:string;
    host:string;
    port:number;
    rpcServer:RpcServer;
    rpc:RpcStub;
    constructor(opt){
        this.id=opt.id;
        this.type = opt.type;
        this.host = opt.host;
        this.port = opt.port;

        let service = this.setService();
        this.rpcServer = new RpcServer(NetProto.TCP,this.host,this.port,service);

        this.rpcServer.bind();

    }
    abstract init():boolean;
    abstract async doStart():Promise<boolean>;
    abstract setService():Services;

    addServer(type:string,id:number,host:string,port:number,opt:object):boolean{
        return this.rpc.addServer(type,id,host,port, opt);
    }


    getRoute(type:string,param:object):RpcClient{
        return this.rpc.getRoute(type,param);
    }

    set(key:string,value:any){
        this._props.set(key,value);
    }
    get(key:string,value:any){
        return this._props.get(key);
    }
    addComponent(com:Component):boolean{
        if(this._coms.has(com.name)){
            //logger.error;
            console.log(`component ${com.name} already exsits!`)
            return false;
        }
        this._coms.set(com.name,com);
    }
    getComponent<T>(name:string):T{
        return this._coms.get(name) as any;
    }


    private parall(coms:Array<[string,Component]>,func:string){
        return Promise.all(coms.map( com=>{return com[1][func]()})).then(results=>{
                let ret = results.every( (r,idx)=>{
                    if( !r){
                        console.log(`component ${coms[idx][0]} ${func} fail!`)
                    }; 
                    return r;} 
                );
                console.log("...",func,ret,coms.length);
                return ret;
            })
    }

    private async startCompenents(){
        let coms=[...this._coms]
        let ret=await this.parall(coms,"init");
        if( ret ) {
            ret = await this.parall(coms,"start");
        }
        return ret;
    } 

    async start(){
        let ret=this.init()
        if(ret == false){
            console.log("init fail!");
            return false;
        }
        ret = await this.startCompenents();
        if( ret == false ){
            console.log("start components fail!");
            return false;
        }
        ret = await this.doStart() ;
        return ret;
    }
}

