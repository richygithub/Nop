
import {RpcClient,RpcServer, NetProto,MsgHeader,RetCode } from "../index"

import {Service } from "../../123/rpc/area/service"
import {Rpc,gRpc} from "../../123/rpc/rpc"

import {App as Area} from "../../123/servers/area/app";




let host="127.0.0.1";
let port = 12345;

let areaServer:Area = null;
beforeAll(()=>{

   areaServer = new Area({id:1,host,port});
   /*
   areaServer.start().then(data=>{
       done();
   });
   */
   return areaServer.start();

})

test("tcp",async ()=>{

    //let client = new RpcClient(NetProto.TCP,host,port );

//    let msg = new MsgHeader(1,null,"area",1,"remote");
//    let sendBuf =[ msg.serialize() ] ;
//    let ret = client.send(sendBuf);

    gRpc.addServer("area",1,{host:host,port:port,id:1});
    /*
    gRpc.area().player.getServerList(1).then(data=>{

        let [serverList,error]  = data;
        console.log("list:",serverList,error?error.message:"");
        expect(error).toBe(null);
    });
    */
    let [serverList,error] = await gRpc.area().player.getServerList(1);
    console.log("list:",serverList,error?error.message:"");
    expect(error).toBe(null);
    /*
    let server = new RpcServer(NetProto.TCP,host,port );
    let s = server.recv.bind(server);
    server.recv = jest.fn( async (data,session)=>{
        expect(sendBuf).toEqual( data );
        let ret:RetCode = await s(data,session);
        console.log("await:",ret,RetCode[ret]);
        //console.log("server recv:",data);
        done();
    }); 
    let service = new Service();
    server.setService(service);
    server.bind();
*/   

    return;
})