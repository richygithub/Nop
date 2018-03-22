import * as fs from "fs"

export function onJsonChange(fullname:string,type:string,ts,js){
    // 
    //let fname=path.basename(fullname);

    console.log("onJsonChange...ok");
    let tarfname = fullname.replace(ts.basedir, js.basedir);
//    console.log(`change:${fullname},${ts.basedir},${js.basedir}. tar:${tarfname}`)
    try {
        if (type == "change" || type == "add") {
            console.log(`copy file ${fullname} to ${tarfname}`);
            fs.copyFileSync(fullname, tarfname);
        } else if (type == "unlink") {
            //remove
            console.log(`delete file ${tarfname}`);
            fs.unlinkSync(tarfname);
        }

    } catch (e) {
        console.log(`${type} ${tarfname} fail!error:`, e.message);
    }

}