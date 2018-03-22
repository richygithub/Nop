const gulp = require('gulp');
const watch = require('gulp-watch');
const path = require('path');
const util = require('util');
const mkdirp= require('mkdirp');
const child=require("child_process");
const colors = require('colors');
const fs=require('fs');
const prettier = require('prettier');

const tscfg = require("./tsconfig-gulp.json");

const dbdir = path.join(__dirname,"db");
const dbfname = path.join(dbdir,"proj.json");

let jsoutDir = tscfg.compilerOptions.outDir ||".";

let initTask  = require( path.join( __dirname,jsoutDir, "gulp/tasks/init") );
let jsonTask = require( path.join( __dirname,jsoutDir, "gulp/tasks/jsonChange") );
let protoTask= require( path.join( __dirname,jsoutDir, "gulp/tasks/protoChange") );
let cfgTask  = require( path.join( __dirname,jsoutDir, "gulp/tasks/serverCfgChange") );


class ProjInfo{
    constructor(projname){
        this.name = projname;
        this.basedir = path.join(__dirname,projname);
        this.cfgdir = path.join(this.basedir, "config");
        this.serverCfg = path.join(this.basedir, "config", "servers.json");
        this.rpcdir = path.join(this.basedir, "rpc");
        this.protodir = path.join(this.basedir, "proto");
        this.moduledir = path.join(this.basedir,"node_modules");
    }
}
let gProj = null;


gulp.task('default',['init'],()=>{


    let watchJsons = [
        gProj.cfgdir + "/*.json"
    ]

    let projdist = require("./tsconfig-proj.json").compilerOptions.outDir;

    let cfgFiles=[gProj.basedir+"/**/*.json", gProj.basedir+"/**/*.txt" ];
    watch( [gProj.basedir+"/**/*.json", gProj.basedir+"/**/*.txt" ],{ignoreInitial:false})
    .pipe( gulp.dest(projdist ) ) ;

   
    watch(gProj.protodir+"/*.rpc",{ignoreInitial:true},(file)=>{
        protoTask.onProtoChange(file.path,file.event,gProj);
    })
    
    
    watch(gProj.serverCfg,{ignoreInitial:true},(file)=>{
        cfgTask.onServerCfgChange(file.path,file.event,gProj).then(ret=>{
            //finish
        }) ;
    })
    
    watch("noplib/lib/**",()=>{
        let cp = gulp.src("noplib/lib/**")
        .pipe( gulp.dest(path.join(gProj.moduledir,"nop/lib") ) );

    } )


})

function end(stream){
    return new Promise(done=>{
        stream.on('end',(data)=>{
            done();
        })
    })
}

gulp.task('init',async (cb)=>{
//    tscWatch("./tsconfig-gulp.json");
    let r=gulp.src(["gulp/builder/**/*.json","gulp/builder/**/*.rpc"])
        .pipe( gulp.dest( `${jsoutDir}/gulp/builder` ) ); 
    await end(r);
    let projname = await getProjName();

    if( projname == null || fs.existsSync(path.join(__dirname,projname) ) == false ){
        projname = await createProj();
    }
    //init
    gProj = new ProjInfo(projname);


    let cp = gulp.src("noplib/**/*")
    .pipe( gulp.dest(path.join(gProj.moduledir,"nop") ) );
    await end(cp );

    console.log('generate servers...');
    cfgTask.onServerCfgChange(gProj.serverCfg,"change",gProj);

    console.log('generate rpc...');
    protoTask.genProtoAll(gProj);

    console.log("tsc proj...")
    await tscWatch("tsconfig-proj.json");

})



async function createProj(){

    let projname   = await initTask.init(__dirname);
    gProj = new ProjInfo(projname);
    console.log("init proj:",projname);
    //copy config file

    let cp1 = gulp.src("gulp/builder/template/**")
                .pipe( gulp.dest(gProj.basedir) );
   
    let cp2 = gulp.src("noplib/**/*")
                .pipe( gulp.dest(path.join(gProj.moduledir,"nop") ) );
    await end(cp1 );
    await end(cp2 );

    let projTscfg={
        "compilerOptions": {
            "target": "es2017",
            "module": "commonjs",
            "sourceMap": true,
            "outDir": "dist",
            "lib":[
                "es2016"
            ]
        },
        "include":[
            `${projname}/**/*.ts`,`${projname}/node_modules/**/*.ts`],
        "exclude":[`${projname}/**/__tests__/*.ts`]
    }

    fs.writeFileSync("tsconfig-proj.json", prettier.format( JSON.stringify(projTscfg), {parser:"json"} ) );

    console.log("end...")
    //gen servers

    //gen rpc

    fs.writeFileSync(dbfname,JSON.stringify({name:projname}));
    return projname;

}

async function getProjName(){
    if( !fs.existsSync(dbfname) ){
        await mkdirp(dbdir);
        fs.writeFileSync(dbfname,JSON.stringify({}));
    }
    let projInfo = require(dbfname);
    console.log("dbfname:%j,%j",dbfname,projInfo);
    return projInfo.name;
}

function tscWatch(fname){
    return new Promise(done=>{
        try{
                console.log("tsc...",fname,process.cwd());
                let l = child.spawn("tsc.cmd",["-w",'-p',fname],{detached:false});
                l.stderr.on('data',(error)=>{
                    console.log("tsc watch fail!",error.message);
                })
                l.stdout.on('data',(data)=>{
                    data = data.toString('utf8');
                    console.log(data.gray);
                    if( data.indexOf("Compilation complete. Watching for file changes.") >=0 ){
                        done(true);
                    }
                })
                l.on('close',(code)=>{
                    console.log(`close..`,code);
                })
                l.on('error',(code)=>{
                    done(false);
                    console.error(`exec tsc fail.Please add tsc.cmt into path.`);
                })
            }catch(e){
                done(false);
                console.log("spawn error!",e.message)
            }

   })
} 

process.on('uncaughtException', (err) => {
    console.log(`uncaughtException....`,err);
});
  