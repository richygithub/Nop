
import {Buffer} from 'buffer';
import net = require('net');
import dgram = require('dgram');

import Event = require('events');

import {Session, Receiver} from '../session';
import {Mailbox} from '../mailbox';
import {NetEngine,TcpEngine,UdpEngine} from '../net-engine';
import {NetProto} from '../../socketbase'
import { setTimeout } from 'timers';
import { RpcClient } from './rpcClient';
import {MsgHeader} from "./msgHeader";
import {Application} from "../application";


const maxRouteStep = 10; 
export class Transfer{
    serialnum:number=0;
    smap:Map<number,Session> = new Map<number,Session>();
    constructor(private app:Application){

    }
    routeForward(header:MsgHeader,data:Array<Buffer>,session:Session){
        if(header.tids==null){
            header.tids = [];
        }
        if( header.tids.length >= maxRouteStep ){
            console.log(`msg.${header} route exceeds max step(${maxRouteStep}).`)
            return; 
        }

        let client:RpcClient = this.app.getRoute(header.server,header.routeParam);
        if(client ==null ){
            console.log(`msg.${header} not found avalible client.`)
            return;
        }

        let tid =  ++this.serialnum;
        header.tids.push(tid);
        data[0] = header.serialize();
        client.send(data);
        this.smap.set(tid,session);
        setTimeout( ()=>{
            this.smap.delete(tid);
        }, 20000);
    }
    routeBack(header:MsgHeader,data:Array<Buffer>){
        let tid=header.tids.pop();
        let session=this.smap.get(tid);
        if( session ){
            data[0] = header.serialize();
            session.send( data );
        }else{
            console.log(`can not route back for ${header}`);
        }
        
    }

}