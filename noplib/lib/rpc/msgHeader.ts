export class MsgHeader{
    rpcId:number;       // used for direct rpc invoke.
    tids:Array<number> ; //transfer id . use to route msg.
    server:string;
    serviceId:number;
    type:string;
    err:string;
    routeParam:any;
    constructor(rpcId:number,tids:Array<number>,server:string,sid:number,type:string,routeParam=null,err:string=null){
        this.rpcId= rpcId ;
        this.tids = tids;
        this.server=server;
        this.serviceId=sid ;
        this.type = type ;
        this.err=err;
        this.routeParam = null;
    }

    serialize():Buffer{
      return Buffer.from( JSON.stringify(this));
    }
    static deserialize(data:Buffer):MsgHeader{
        let obj=JSON.parse( data.toString() );
        return new MsgHeader( obj.rpcId,obj.tids,obj.server,obj.serviceId,obj.type,obj.routeParam,obj.err );
    }

}