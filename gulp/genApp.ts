import * as path from "path";
import * as fs from "fs";


export function genCode(server:string){

    let template =`
    import {Application} from "nop";
    import {gRpcMgr,gRpc} from "../../rpc/rpc";
    import {Service} from "../../rpc/${server}/service";
    const Module = require("module");
    export class App extends Application{
        service:Service;
        constructor(opt){
            super(opt);
            this.rpc=gRpcMgr;
        }
        init():boolean{
            return true;
        }
        setService(){
            this.service = new Service();
            return this.service;
        }

        async doStart(){
            return true;
        }
    
    } 

    if(  require.main instanceof Module && require.main.filename == __filename  ){
        let opt = JSON.parse( process.argv[2]);
        let app = new App(opt);
        app.start().then( ret=>{
            if( ret ){
                process.send({start:true}) ;
            }else{
                process.send({start:false}) ;
            }
        })
    }

    `
    return template;

}