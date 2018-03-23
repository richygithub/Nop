import {Buffer} from 'buffer';
import net = require('net');
import dgram = require('dgram');

import Event = require('events');

import {Session, Receiver} from '../session';
import {Mailbox} from '../mailbox';
import {NetEngine,TcpEngine,UdpEngine} from '../net-engine';
import {NetProto} from '../../socketbase'
import { setTimeout } from 'timers';
import {MsgHeader} from "./msgHeader";
import {Transfer} from "./transfer";
import {Services,Handler} from "../interface"


export enum RetCode{
    Transfer,
    Transfer_Not_Found,
    Handler_Not_Found, 
    Process_Error,
    Reply_Suc,
    Reply_Fail 
}

function replyError(session:Session,header:MsgHeader, err:string){
    header.err = err;
    console.log("replyError.",header);
    session.send( [ header.serialize()] );
}

export class RpcServer implements Receiver{
    private _server:net.Server|dgram.Socket;
    private _netProto:NetProto;
    private _host:string;
    private _port:number;
    private _sessions:Map<string,Session>;
    private _serialId:number;

    private _services:Services;
    
    private _transfer:Transfer;

    constructor(type:NetProto,host:string,port:number,service:Services){
        this._port = port;
        this._serialId =0 ;
        this._sessions = new Map<string,Session>();
        this._netProto = type;
        this._services = service;
    }
    setTransfer(t:Transfer){
        this._transfer = t;
    }
    send(sid:string,data:Buffer,cb){
        let session = this._sessions[sid];
        if( !session ){
            console.error(`session ${sid} not found.`)
            return false;
        }
        return session.send(data,cb );
    }
    async recv(data:Array<Buffer>,session:Session){
        let header:MsgHeader =  MsgHeader.deserialize(data[0]); 
        console.log("..rpcServer recv:",header);
        if( this._services.name != header.server){
            if( this._transfer == null ){
                console.log(`service(${this._services.name}) has no route ${header.server}.${header.serviceId}`);
                replyError(session,header,`Not transfer in ${this._services.name} for ${header.server}` );
                return RetCode.Transfer_Not_Found;
            }else{
                this._transfer.routeForward(header,data,session);
                return RetCode.Transfer;
            }
        }

        let h = this._services.getHandler(header.serviceId,header.type);
        if( h==null ){
            console.log(`service(${this._services.name}) has no service ${header.server}.${header.serviceId}`);
            replyError(session,header,`${this._services.name} has no serviceId ${header.serviceId}.type:${header.type}`); 
            return RetCode.Handler_Not_Found;
        }

        try{
            let [ret, error] = await h.processReq(data[1]);
            let reply=null;
            if (error != null) {
              //error.
                header.err = error.message;
            }else{
                reply = h.serializeReply(ret);
            }
    
            let sendSuc=false;
            if( !!reply){
                sendSuc = session.send( [ header.serialize(),reply] );
            }else{
                sendSuc = session.send( [ header.serialize() ] );
            }
    
            return sendSuc?error!=null?RetCode.Reply_Suc:RetCode.Process_Error
                          :RetCode.Reply_Fail;
        }catch(e){
            console.log("error......",e);

            replyError(session,header,`process error:${e.message}`);
            return RetCode.Process_Error;
        }

    }

    bind(){
        let self=this;
        if( self._netProto == NetProto.TCP ){
            self._server = new net.Server( (socket)=>{
                
                self._serialId++;
                
                let netEngine = new TcpEngine(socket);

                let session = new Session(this);
                let mailbox = new Mailbox(session,netEngine,10,10 );
                session.setMailBox(mailbox);
                
                //self._sessions[self._serialId]= session;
                self._sessions[socket.remoteAddress] = session;
                console.log('connect addr:',socket.remoteAddress);

            })

            self._server.listen(self._port);
            self._server.on('error',(err)=>{
                console.error('server error!',err);
            })

        }else if(self._netProto == NetProto.UDP ){
            self._server = dgram.createSocket('udp4');
            self._server.on('message',(msg,info)=>{

                let session = self._sessions[info.address]
                if( !!session ){
                    //recv 
                    session.netEngine.decode(msg);
                }else{
                    session = new Session(this);
                    let netEngine = new UdpEngine();
                    let mailbox = new Mailbox(session,netEngine,10,10);
                    self._sessions[info.address] =session;

                }
            });
        }else{
            // to do
            console.error(`error type:${self._netProto}`);
        }

    }
}
