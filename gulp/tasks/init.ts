import {join} from "path";
import * as fs from "fs";
import * as util from "util";
import {mkdirp} from "../utils"
import * as path from "path";
require("colors")
import * as program from "commander";

async function  createProj(basedir:string,projname:string ) {
    let projdir= path.join(basedir,projname);
    mkdirp(projdir);
    let dirs=["rpc","compoments","servers","config","proto","node_modules"];
    dirs.forEach( str=>mkdirp(path.join(projdir, str) ) );

}



function prompt(msg: string):Promise<string> {
    return new Promise(done=>{
        if (' ' === msg[msg.length - 1]) {
            process.stdout.write((msg as any).red);
        } else {
            //console.log((msg as any).red);
            console.log(msg);
        }
        process.stdin.setEncoding('ascii');
        process.stdin.once('data', function (data) {
            data=data.replace(/\s/g,"");
            done(data);
        }).resume();
    })

}

let selectName="Please "+("enter" as any).red+" the project "+("name" as any).red+"."

export async function init(basedir:string){
    let projname = await prompt(selectName);
    console.log("enter name:%j",projname);
    await createProj(basedir,projname);
    return projname;
}


