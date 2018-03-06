"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const genCodeTs_1 = require("./genCodeTs");
const proto = require('./rpcproto');
function parse(fname) {
    if (!fs.existsSync(fname)) {
        console.error(`file ${fname} dose not exsit.`);
        return null;
    }
    let str = fs.readFileSync(fname, "utf8");
    try {
        proto.parser.parse(str);
        return proto.parser.ast;
    }
    catch (e) {
        console.error(`parse error.${e.stack}`);
        return null;
    }
}
exports.parse = parse;
function genCode(fname, outdir) {
    let root = parse(fname);
    if (root != null) {
        genCodeTs_1.genCode(root, outdir);
    }
}
exports.genCode = genCode;
var proto_1 = require("./proto");
exports.Ast = proto_1.Ast;
//# sourceMappingURL=main.js.map