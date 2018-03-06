import {Ast } from "./proto"
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as util from 'util';
import * as mkdirp from 'mkdirp';
require('colors')
import * as pretty from 'prettier';
function mkdir(path: string) {
    let err = mkdirp.sync(path, 0o755);
    console.log(('   create : ' as any).green + path);
}

function getTsType(node:Ast.TypeDeclare ):string{
    if( node == null ){
        return "null";
    }
    let e=node.type;
    switch(e){
        case Ast.Type.double:
        case Ast.Type.float:
        case Ast.Type.int16:
        case Ast.Type.int32:
        case Ast.Type.int64:
            return "number";
        case Ast.Type.string:
            return "string";
        case Ast.Type.bool:
            return "boolean";
        case Ast.Type.Buffer:
            return "Buffer";
        case Ast.Type.json:
            return "object";
       case Ast.Type.pb:
        case Ast.Type.userDef:
            return node.typeName;
        default:
            throw new Error(`unknown type ${e} in typescript.`);
    }
}
function getTypeDefaultVal(e:Ast.Type,isArray:boolean=false):string{
    if(isArray){
        return "null"
    }
    switch(e){
        case Ast.Type.double:
        case Ast.Type.float:
        case Ast.Type.int16:
        case Ast.Type.int32:
        case Ast.Type.int64:
            return "0";
        case Ast.Type.Buffer:
        case Ast.Type.json:
        case Ast.Type.string:
        case Ast.Type.pb:
        case Ast.Type.userDef:
            return "null";
        case Ast.Type.bool:
            return "false";
        default:
            throw new Error(`unknown type ${e} in typescript.`);
    }
}

let typeVarLen=new Map<string,boolean>();
let typeInfo={};
function isVarLen(node:Ast.TypeDeclare):boolean{
    let t = node.type;
    switch(t){
        case Ast.Type.double:
        case Ast.Type.float:
        case Ast.Type.int16:
        case Ast.Type.int32:
        case Ast.Type.int64:
        case Ast.Type.bool:
            return false;
        case Ast.Type.Buffer:
        case Ast.Type.json:
        case Ast.Type.string:
        case Ast.Type.pb:
            return true;
        case Ast.Type.userDef:
            if( typeVarLen.has(node.typeName) ){
                return typeVarLen.get(node.typeName);
            }else{
                let userType = typeInfo[node.typeName] as Ast.UserType;
                let ret = userType.fieldList.some( ele=>{
                    return ( isVarLen(ele)||ele.label == Ast.Label.Array );
                })

                console.log(`name:${node.name},userType:${node.typeName}.varlen:${ret}.` )

                typeVarLen.set(node.typeName,ret);
                return ret;
            }
       default:
            throw new Error(`unknown type ${t} in typescript.`);
    }
}

function headerLen(type:Ast.Type,userType?:Ast.TypeDeclare):number{
    switch(type){
        case Ast.Type.json:
        case Ast.Type.string:
            return 2;
        case Ast.Type.Buffer:
        case Ast.Type.pb:
            return 4;
        case Ast.Type.userDef:
            if( userType==null ){
                throw new Error(`cannot get header len of userType from null typename.`)
            }
            return isVarLen(userType)?4:0;
        default:
            return 0;
    }
} 

function len(node:Ast.TypeDeclare, varname:string):string|number{
    let t = node.type;
//    let varname=`${own?own+".":""}${node.name}`;

    switch(t){
        case Ast.Type.int64:
        case Ast.Type.double:
            return 8;
        case Ast.Type.float:
        case Ast.Type.int32:
            return 4; 
        case Ast.Type.int16:
            return 2;
        case Ast.Type.bool:
            return 1;
        case Ast.Type.pb:
        case Ast.Type.Buffer:
            return `(${varname}==null?0:${varname}.length) `;
        case Ast.Type.json:
        case Ast.Type.string:
            // max string lenth is 65535;
            return ` (${varname}==null?0:Buffer.byteLength(${varname})) `;
        case Ast.Type.userDef:
            
            return  isVarLen(node)?`${node.typeName}.len(${varname})`:`${node.typeName}.len()` ;
      default:
            throw new Error(`unknown type ${t} in typescript.`);
    }
}

function serialize(node:Ast.TypeDeclare,buf:string,offset:string,varname:string):string{
    let t = node.type;
//    let varname=`${own?own+".":""}${node.name}`;
    let lenval:string,str:string;
    switch(t){
        case Ast.Type.int64:
        case Ast.Type.double:
            return `${buf}.writeDoubleBE(${varname},${offset});
                ${offset}+=8;
            `
        case Ast.Type.float:
            return `${buf}.writeFloatBE(${varname},${offset});
                ${offset}+=4;
            `
        case Ast.Type.int32:
            return `${buf}.writeInt32BE(${varname},${offset});
                ${offset}+=4;
            `
        case Ast.Type.int16:
            return `${buf}.writeInt16BE(${varname},${offset});
                ${offset}+=2;
            `
        case Ast.Type.bool:
             return `${buf}.writeInt8(${varname}?1:0,${offset});
                ${offset}+=1;
                `
        case Ast.Type.pb:
        case Ast.Type.Buffer:
            lenval = varname.replace(/\.|\[|\]/g,'_')+"len";
            //lenval=`_${node.name}_len`;
            str = `
            let ${lenval} = ${len(node,varname)};
            ${buf}.writeUInt32BE(${lenval},${offset});
            ${offset}+=${headerLen(t)};
            if(!!${varname}){
                ${buf}.copy(${varname},0,${offset});
                ${offset}+=${lenval};
            }

        `
            return str;
        case Ast.Type.json:
        case Ast.Type.string:
            lenval = varname.replace(/\.|\[|\]/g,'_')+"len";
 
            str = `
            let ${lenval} = ${len(node,varname)};
            ${buf}.writeUInt16BE(${lenval},${offset});
            ${offset}+=${headerLen(t)};
            `;
            str += `${buf}.write(${varname},${offset});
            ${offset}+=${lenval};
            `
            return str;
        case Ast.Type.userDef:
            return `${offset}+=${node.typeName}.serialize(${varname},${buf},${offset});`
      default:
            throw new Error(`unknown type ${t} in typescript.`);
    }
}

function deserialize(node:Ast.TypeDeclare,buf:string,offset:string,varname:string,decvar:string=" "):string{
    let t = node.type;
//    let varname=`${own?own+".":""}${node.name}`;
    let lenval:string,str:string;
    switch(t){
        case Ast.Type.int64:
        case Ast.Type.double:
            return `${decvar}${varname}=${buf}.readDoubleBE(${offset});
                ${offset}+=8;
            `
        case Ast.Type.float:
            return `${decvar}${varname}=${buf}.readFloatBE(${offset});
                ${offset}+=4;
            `
        case Ast.Type.int32:
            return `${decvar}${varname}=${buf}.readInt32BE(${offset});
                ${offset}+=4;
            `
        case Ast.Type.int16:
            return `${decvar}${varname}=${buf}.readInt16BE(${offset});
                ${offset}+=2;
            `
        case Ast.Type.bool:
             return `${decvar}${varname}=${buf}.readInt8(${offset})==1?true:false;
                ${offset}+=1;
                `
        case Ast.Type.pb:
        case Ast.Type.Buffer:
            lenval = varname.replace(/\.|\[|\]/g,'_')+"len";
            //lenval=`_${node.name}_len`;
            str = `
            let ${lenval} = ${buf}.readUInt32BE(${offset});
            ${offset}+=${headerLen(t)};
            ${decvar}${varname}= Buffer.from(${buf}.buffer,${offset},${lenval});
            ${offset}+=${lenval};
        `
            return str;
        case Ast.Type.json:
        case Ast.Type.string:
            lenval = varname.replace(/\.|\[|\]/g,'_')+"len";
 
            str = `
            let ${lenval} = ${buf}.readUInt16BE(${offset});
            ${offset}+=${headerLen(t)};
            ${decvar}${varname}=${buf}.toString('utf8',${offset},${offset}+${lenval});
            ${offset}+=${lenval}  
            `;
           return str;
        case Ast.Type.userDef:
            return `
            ${decvar}${varname} = new ${node.typeName}();
            ${offset}+= ${node.typeName}.deserialize(${varname},${buf},${offset});
            `
      default:
            throw new Error(`unknown type ${t} in typescript.`);
    }
}


function genUserType(node:Ast.UserType){

    let varDefine = genParamDec(node.fieldList,";"); 
    let ctorDefine =genParamDec(node.fieldList,",",true); 

    let assign:string = node.fieldList.map( ele=>{
        return `this.${ele.name} = ${ele.name};`
    }).join("");

    let varLen = node.fieldList.some( ele=>{return isVarLen(ele)||ele.label==Ast.Label.Array } );

    console.log(`userType:${node.name},${varLen}`)

    let lenStr:string = getLenStr(node.fieldList,"msg." );
    let ss:string = genSerializeStr(node.fieldList,"buf","offset","msg."); 
    let ds:string = genDeserializeStr(node.fieldList,"buf","offset","msg."); 

    let varname="msg";
    let lenParam=varLen?`${varname}:${node.name}`:"";

    let str=`export class ${node.name}{
        ${varDefine}
        constructor(${ctorDefine}){
            ${assign}
        }
        static len( ${lenParam}){
            return ${lenStr};
        }
        static serialize(${varname}:${node.name},buf:Buffer,offset:number):number{
            let orign = offset;
            ${ss}
            return offset-orign;
        }
        static deserialize(${varname}:${node.name},buf:Buffer,offset:number):number{
            let orign = offset;
            ${ds}
            return offset - orign;
        }
    }`
    return str;

}

function unique (arr) {
    const seen = new Map()
    return arr.filter((a) => a!=null&&!seen.has(a) && seen.set(a, 1) )
}

function firstLetterUpper (str:string):string{
    return str.charAt(0).toUpperCase()+str.slice(1);
};
function IName(node:Ast.Rpc):string{
    return `I${firstLetterUpper(node.name)}`;
}
function ImpName(node:Ast.Rpc):string{
    return `${firstLetterUpper(node.name)}Imp`;
}
function getDepClass(node:Ast.Rpc):Array<string>{
    let has={}
    let dep =[...node.input,node.output].filter(ele=>{
        
         if( ele !=null && ele.type == Ast.Type.userDef && has[ele.typeName]==null ){
             has[ele.typeName] = true;
            return true;
         }
    }).map(ele=>ele.typeName);
    return dep;

}
function getScopeDepClass(node:Ast.Scope){
    let dep=[]
    node.rpc.map( ele=>{
        dep=[...dep,...getDepClass(ele)];
    })
    return unique(dep);
}


function getLenStr(nodeList:Array<Ast.TypeDeclare>,pre:string=""){
    let lenStr:string = nodeList.map( ele=>{

        let elename=`${pre}${ele.name}`;

        if(ele.label == Ast.Label.Array ){
            let varlen = isVarLen(ele);

            if(varlen){

                return `(${elename}==null?0:${elename}.reduce( (len,ele)=>{
                    return len+=(${headerLen(ele.type,ele)}+${len(ele,"ele")} )
                },0) )` ;
            }else{
                return `(4 + (${elename}==null?0:${elename}.length*${len(ele,"")}) )`
            }

        }else{
            let head=headerLen(ele.type,ele);
            return head>0?` ( ${elename}==null?0:(${head}+${len(ele,elename)} ))`:`${len(ele,elename)}`;
        }
    }).join("+");
    return lenStr;

}

function genSerializeStr(nodeList:Array<Ast.TypeDeclare>,buf:string,offset:string,pre:string=""){
    let ss:string = nodeList.map( ele=>{
        let varname=`${pre}${ele.name}`
        if( ele.label == Ast.Label.Array ){
            let lenval=`_${ele.name}_len`;
            let str = `
            let ${lenval} = !!${varname}?${varname}.length:0;
            ${buf}.writeUInt32BE(${lenval},${offset});
            ${offset}+=4;
     
            if( ${lenval}>0){
                for(let idx=0;idx<${lenval};idx++){
                    ${serialize(ele,buf,offset,  varname+"[idx]" )}
                }
            }
           `;
            return str;

        }else{
            return `${serialize(ele,buf,offset,varname)}`
        }

    }).join("");
    return ss;
}
function genDeserializeStr(nodeList:Array<Ast.TypeDeclare>,buf:string,offset:string,pre:string="",decvar:string=""){
    let ds: string = nodeList.map(ele => {
        let varname = `${pre}${ele.name}`

        if (ele.label == Ast.Label.Array) {

            let lenval = `_${ele.name}_len`
            let elename = `${varname}[idx]`
            let eleDeserial = `${deserialize(ele, buf, offset, elename)}`;

            let str = `
        let ${lenval} = ${buf}.readUInt32BE(${offset});
        ${offset}+=4;

        ${decvar}${varname}= new Array<${ getTsType(ele)}>();
        if(${lenval}>0){
            for(let idx=0;idx<${lenval};idx++){
                ${eleDeserial}            
            }
        }
      `
            return str;
        } else {
            return `${deserialize(ele, buf, offset, varname, decvar)}`
        }
    }).join("")
    return ds;
}

function genParamDec(nodeList:Array<Ast.TypeDeclare>,delim:string, defval:boolean=false){
    if(nodeList==null)return "";
    let str:string=nodeList.map( ele=>{
        if( ele.label == Ast.Label.Array ){
            return `${ele.name}:Array<${getTsType(ele)}>`+
            (defval?`=${getTypeDefaultVal(ele.type,true)}`:"");
        }else{
            return `${ele.name}:${getTsType(ele)}`+
            (defval?`=${getTypeDefaultVal(ele.type,true)}`:"");
        }
   }).join(delim);
   return str;
}

function genInterface(node:Ast.Rpc,serviceId:number){

   // let impStr = `import {${dep.join(",")}} from "../type" `;
    
   let paramDefine:string= genParamDec(node.input,",");   
   let funcRetStr = (node.output==null?
            `Promise<[void,Error]>`
            :`Promise<[${ getTsType(node.output) },Error]>`
   )

    let deReq: string = genDeserializeStr(node.input,"_buf","_offset","","let ");  

    let ssreq=`return null`;
    if( node.input.length >0){
        ssreq=`
            let _buflen = ${getLenStr(node.input) };
            let _buf=Buffer.alloc(_buflen);
            let _offset=0;
            ${genSerializeStr(node.input,"_buf","_offset")}
            return _buf; 
        `
    }

    let ssreply=``;
    if( node.output == null ){
        ssreply=`return null;`;
    }else{
        node.output.name = "reply";
        ssreply=`let _buflen = ${getLenStr([node.output])};
            let _buf = Buffer.alloc(_buflen);
            let _offset = 0;
            ${genSerializeStr([node.output],"_buf","_offset")}
            return _buf;`;
    }


    let interfaceDef = `
    export abstract class ${IName(node)}{
        static id:number = ${serviceId}; 

        abstract handler(${paramDefine}):${funcRetStr};
       processReq(data:Buffer):${funcRetStr}{
            let _buf=data;
            let _offset=0;
            ${deReq}
            return this.handler( ${  node.input.map( ele=>{
                return ele.name;
            }).join(",")} );
        }

        serializeReply( ${node.output?genParamDec([node.output],","):""}):Buffer{
            ${ssreply}
       }

        static serializeReq( ${paramDefine} ):Buffer {
           ${ssreq}
        }

        static deserializeReply(data:Buffer):${node.output?getTsType(node.output):"void"} {
            let _buf=data;
            let _offset=0;
            ${node.output?genDeserializeStr([node.output],"_buf","_offset","","let "):""};
            return ${node.output?node.output.name:""};
        }
    }

    `
    return interfaceDef;

}

function genImp( node:Ast.Rpc ){
    let retType= getTsType(node.output);// `${node.output?node.output.typeName:"void"}`;
    let classDef = `import {${IName(node)} } from "./_interface";

    import {${getDepClass(node).join(",")}} from "../type";

    export default class ${ImpName(node)} extends ${IName(node)}{

        service:any;
        constructor(service){
            super();
            this.service = service;
          }
        async handler(${genParamDec(node.input,",")}):Promise<[${retType},Error]>{
            let ret:${retType};
            //to do . assign to ret.

            return [ret,null];
        }
    }
`
    return classDef;
}


function genStub(node:Ast.Scope){

    let stubstr=node.rpc.map(ele=>{
        let str=`${ele.name}(${genParamDec(ele.input,",") }):Promise<[${getTsType(ele.output)},Error]>{
            let self = this;
            return self.client.req(${IName(ele)}.id,${IName(ele)}.serializeReq(${ele.input.map(ele=>ele.name).join(",")}),
            ${IName(ele)}.deserializeReply) as Promise<[${getTsType(ele.output)},Error]>;
        }`;
        return str;
    })

    let str = `
    import { Client } from "../common";
    export class Stub{
        private client:Client;
        constructor(client:Client){
            this.client = client;
        }
        ${stubstr.join("")}
    }
    export var Service=[${node.rpc.map(ele=>{return `"${ele.name}"`}).join(",")}];
    `
    return str;
}

function writeFile(path:string,contend:string,debug:boolean=false){
    if(debug){
        fs.writeFileSync(path, contend);
    }
    fs.writeFileSync(path, pretty.format(contend,{parser:"typescript"}));
}

function genCommonFile(path){
    let clientInter=`
    export interface Client {
        req: (
          serviceId: number,
          data: Buffer,
          deserialize: (data: Buffer) => any
        ) => Promise<[any, Error]>;
      }
      `
    writeFile(path,clientInter,true);
}

let debug = true;

function stubFName(service:string,node:Ast.Scope){
    return `${service}-${node.name}-stub`;

}

function genScope(rootdir:string,service:string,dirname:string,node:Ast.Scope,inter:{count:number}){
    let str="";
    let hdir = path.join(rootdir, `${service}${firstLetterUpper(node.name)}`);
    mkdir(hdir)
    node.rpc.forEach(e => {
        str += genInterface(e, inter.count++) + "\r\n";
        let impStr= genImp(e);
        writeFile(path.join(hdir,e.name+".ts"),impStr,debug);

    })
    let depStr=getScopeDepClass(node);
    let importStr=`import {${depStr.join(",")}} from "../type";`
    writeFile(path.join(hdir,"_interface.ts"), importStr+str,debug);


    let stubDir=path.join(rootdir,dirname);
    mkdir(stubDir);
    let stub = genStub(node);
    let stubHead=`
        import { ${node.rpc.map(ele=>{return IName(ele)})}  } from "../${service}${firstLetterUpper(node.name)}/_interface";
        import { ${depStr.join(",")}} from "../type";
    `

    let fname=`${stubFName(service,node)}.ts`;
    writeFile(path.join(stubDir, fname ),stubHead+stub,debug );

}

export function genFinalStub(root:Ast.Root,type:"remote"|"handler"){

    let services = root.services.filter( ele=>ele[type]!=null);

    let imptStr= services.map(service=>{
        return `import { 
            Stub as ${service.name}Stub,
            Service as ${service.name}Service,
        } from "./${stubFName(service.name,service[type])}"`
    }).join(";");

    let exptStr=`export var Service = { 
        ${services.map(ele=>{return `${ele.name}:${ele.name}Service`}).join(",") } }`;
    let decStr=`${services.map(ele=>{return `${ele.name}:${ele.name}Stub`}).join(";") } `;
    let assignStr=`${services.map(ele=>{return `this.${ele.name}=new ${ele.name}Stub(client)`}).join(";") } `;

    let str=`
        ${imptStr}
        import {Client} from "../common";
        export class Rpc{
            ${decStr}
            constructor(client:Client){
                ${assignStr}
            }
        }
        ${exptStr}
    `
    return str;

}

//gen Server services 
function genServices(node:Ast.Root){
    let imptStr=""
    let assignStr=""
    node.services.forEach( service=>{
        [service.remote,service.handler].forEach(ele=>{
            if(ele!=null){
                ele.rpc.forEach( rpc=>{
                    let cname=`${service.name}${firstLetterUpper(ele.name)}${firstLetterUpper(rpc.name)}`
                    imptStr+=`import {default as ${cname}} from "./${service.name}${firstLetterUpper(ele.name)}/${rpc.name}";`
                    assignStr+=`this.${ele.name}[${cname}.id] = new ${cname}(this);`
                }) 
            }
        })
    })
    

    let str=`
        ${imptStr}
    export class Service{
        remote:Array<any>;
        handler:Array<any>;
        app:any;
        constructor(app){
            this.app = app;
            this.remote = new Array();
            this.handler= new Array();
            ${assignStr}
        }
        async process(serviceId:number,type:string, data:Buffer) {
            let h=null;
            if( type == "remote"){
                h=this.remote
            }else if(type == "handler"){
                h=this.handler;
            }
            
            if( !h || !h[serviceId]){
                return [null,new Error(\`service invalid.type:\${type},serviceId:\${serviceId}\`)]
            }
            let [ret,error] = await h[serviceId].processReq(data);
            if( error != null ){
                //error.
                return [ret,error];
            }
            return [ h[serviceId].serializeReply(ret),null ] ;
        }
    
    }
`
    return str;
}


export function genCode(root:Ast.Root,outdir:string=""){
    let rootdir= path.join(outdir,root.name);
    mkdir(rootdir);
    root.userType.forEach(ele=>{
        typeInfo[ele.name] = ele;
    })
    genCommonFile(path.join(rootdir,"common.ts"));
    let typestr="";
    root.userType.forEach(ele=>{
        typestr+=genUserType(ele)+"\r\n";
    })

    writeFile( path.join(rootdir,"type.ts"),typestr,debug);


    let handlerCount={
        count:0
    }
    let remoteCount={
        count:0
    }
    root.services.forEach(ele=>{
        if(ele.handler){
            genScope(rootdir,ele.name,"stub",ele.handler,handlerCount);
        }
        if(ele.remote){
            genScope(rootdir,ele.name,"stub",ele.remote,remoteCount);
        }
    })

    let remoteStub = genFinalStub(root,"remote");
    writeFile( path.join(rootdir,"stub","remoteStub.ts"),remoteStub,debug);
    let finalService = genServices(root);
    writeFile( path.join(rootdir,"service.ts"),finalService,debug);
 
    //let handlerStub = genFinalStub(root,"handler");



}