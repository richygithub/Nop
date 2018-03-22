import * as fs from "fs"
import * as path from "path"
const pretty = require("prettier")
export function reload(path:string){
  delete require.cache[path];
  return require(path);
}

export function writeFile(path, contend,overwrite=true ,debug = false) {
    if(overwrite == false && fs.existsSync(path) ) {
        console.log(`${path} alread exsits!`);
        return;
    }

    if (debug) {
        fs.writeFileSync(path, contend);
    }
    fs.writeFileSync(path, pretty.format(contend, { parser: "typescript" }));
}

export function  mkdirp(dir:string){
    if( fs.existsSync(dir) ) {
        return;
    }
    let parent = path.dirname(dir);
    if( fs.existsSync(parent) ){
        fs.mkdirSync(dir);
    }else{
        mkdirp(parent);
    }
}