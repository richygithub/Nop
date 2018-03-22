import {Buffer} from 'buffer';
import net = require('net');
import dgram = require('dgram');

import Event = require('events');

import {Session,Receiver} from '../session';
import {Mailbox} from '../mailbox';
import {NetEngine,TcpEngine,UdpEngine} from '../net-engine';
import {NetProto} from '../../socketbase'
import { setTimeout } from 'timers';
import { resolve } from 'url';
import {MsgHeader} from "./msgHeader";
import {Transfer} from "./transfer";
class RpcClient implements Receiver{
    private _socket:net.Socket|dgram.Socket;
    private _netProto:NetProto;
    private _host:string;
    private _port:number;
    private _session:Session;
    private _serialId:number;

    private _connected:boolean;
    private _rpcId:number;


//    private _cbs:Map<number,(err:Error,reply:RpcMsg)=>void >;
    private _cbs:Map<number,any>;


    private _cbsTimer:Map<number,NodeJS.Timer>;
    
    private _transfer:Transfer;
    

    constructor(type:NetProto,host:string,port:number){
        this._netProto = type;
        this._host = host;
        this._port = port;
        this._serialId =0 ;

        this._connected= false;

        this._rpcId=0;
//        this._cbs = new Map<number, (err:Error,reply:RpcMsg)=>void>();
        this._cbs = new Map<number,any>();
        this._cbsTimer = new Map<number, NodeJS.Timer>();
    }

    setTransfer(t:Transfer){
        this._transfer = t;
    }
    notify(serviceId:number, data:Buffer){
        return new Promise((resolve)=>{
            let rpcId = this._rpcId;
            let header = {
                rpcId: rpcId,
                serviceId: serviceId
            }
            let ret = this.send([Buffer.from(JSON.stringify(header)), data])
            resolve(ret);
        })
    }


    req(serviceId:number, serverName:string,data:Buffer , deserialize:(data:Buffer)=>any ):Promise<[any,Error]> {

        let header = new MsgHeader(this._rpcId,null,serverName,serviceId,"remote");
        return this.doReq(header,data,deserialize);
    }

    doReq(header:MsgHeader,data:Buffer , deserialize:(data:Buffer)=>any ):Promise<[any,Error]>{

        return new Promise((resolve) => {
            let rpcId = this._rpcId;
            header.rpcId = rpcId;
            this.send([header.serialize(), data]);

            this._cbs[rpcId] = {resolve,deserialize};
            this._cbsTimer[rpcId] = setTimeout(() => {
                //
                this._cbsTimer[rpcId] = null;

                if (!!this._cbs[rpcId]) {
                    this._cbs[rpcId].resolve( [null, new Error("time out")] );
                    this._cbs[rpcId] = null;
                }
            }, 10000),

            this._rpcId++;
        })
    } 

    recv(data:Array<Buffer>,session:Session){

        // to do ,head include error.
        let header:MsgHeader = MsgHeader.deserialize( data[0]) ;
        console.log(" rpcClient recv..",header);
 
        if( header.tids && header.tids.length >0 ){
            if( this._transfer == null ){
                console.log(`error!not found transfer to route msg.${header}`)
            }else{
                this._transfer.routeBack(header,data);
            }
            return;
        }
        let rpc= this._cbs[header.rpcId];
        if( !!rpc){
            //to pro
            if( !!header.err){
                rpc.resolve([ null,new Error(header.err)]);
            }else{
                let body = data[1];
                rpc.resolve( [rpc.deserialize(body),null] );
            }
        }
    }

    bind():boolean{
        let self =this;
        if( this._netProto == NetProto.TCP ){


            this._session = new Session( this );
            let mailbox = new Mailbox(this._session,null,10,10);

            let socket = net.connect(this._port,this._host,()=>{
                self._connected = true;

                let netEngine = new TcpEngine(socket);
                mailbox.netEngine = netEngine;

            })
            this._session.on('close',()=>{
                //reconnect?
                this._connected = false;

            });
            return true;
        }else if(this._netProto == NetProto.UDP ){
            //notice .. server always use tcp.
            this._socket = dgram.createSocket('udp4');
            this._connected = true;
            this._session = new Session(this);
            let netEngine = new UdpEngine();
            let mailbox = new Mailbox(this._session,netEngine,10,10);
 
            return true;
        }else{
            console.error(`can not create such type ${this._netProto}`);
            return false;
        }
    }


    send(data:Array<Buffer>):boolean{
        if( !this._session ){
            if( !this.bind() ){
                return false;
            }
        }
        return this._session.send(data);
    }
    
}


export {RpcClient};
