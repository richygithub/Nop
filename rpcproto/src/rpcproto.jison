
/* description: Parses and executes mathematical expressions. */
%{

const pretty=require('prettier')
const fs=require('fs');

let {
    getType,
    getRpc,
    getUserType,
    getScope,
    getService,
    getRoot,
    Label,
    endParse
    } = require('./proto.js');

    let importfile="" 

  %}


/* lexical grammar */
%lex

%x comment
%x commentline
%x import

%%
\s+                   /* skip whitespace */

"//"                    this.begin("commentline");
<commentline><<EOF>>    return 'EOF'
<commentline>\r\n       this.popState();
<commentline>\n         this.popState();
<commentline>.          /*skip all character*/ 

"/*"                    this.begin("comment")
<comment><<EOF>>        return 'EOF'
<comment>"*/"           this.popState()
<comment>\s+            /* skip whitespace*/
<comment>.             /*skip all character*/ 



"import"\b              { this.begin("import"); }
<import>\r\n            { this.popState();}
<import>\n              { this.popState();}}
<import>.               importfile += yytext;



"int32"\b               {yytext = getType(yytext); return 'TYPE'}  
"int64"\b               {yytext = getType(yytext) ; return 'TYPE'}  
"string"\b               {yytext= getType(yytext) ; return 'TYPE'}  
"float"\b               {yytext= getType(yytext); return 'TYPE'}  
"bool"\b               {yytext= getType(yytext); return 'TYPE'}  





"Array"\b               return 'ARRAY'
"Buffer"\b              return 'BUFFER'

"service"\b             {return 'Service'}
"remote"\b              return 'Remote'
"handler"\b             return 'Handler'
"class"\b               {return 'Class'}
"namespace"\b           return "Namespace"

[={}()<>,:;,]           {return yytext}
 
[a-zA-Z]+"."[a-zA-Z]+   {return 'TYPE'}
[a-zA-Z]+[0-9]*         { return 'ID'}
[0-9]+\b                {return 'INT';}
[0-9]+("."[0-9]+)?\b    return 'NUMBER'
<<EOF>>                 return 'EOF'
.                       return 'INVALID'


/lex

/* operator associations and precedence */

%left '=' '+' '-'
%left '*' '/'
%left '^'
%right '!'
%right '%'
%left UMINUS

%start expressions

%% /* language grammar */



ArrayType: BUFFER                   {$$=getType("Buffer","Buffer");}
    | ARRAY "<" TYPE ">"            {$$=$3;$3.label = Label.Array;  }
    | ARRAY "<" ID ">"              {$$=getType($3);$$.label = Label.Array; }
    ;

param:TYPE ID                       {$$=$1;$$.name = $2 ; }
    | ID ID                         {$$=getType($1);$$.name=$2;}               
    | ArrayType ID                  {$$=$1;$$.name = $2 ; }               
    ;

funcparams:                         {$$=getRpc();}
    |param                          {$$=getRpc();$$.input.push($1); }
    |param ","                      {$$=getRpc();$$.input.push($1); }
    |funcparams param                   {$$=$1;$$.input.push($2);}
    |funcparams param ","               {$$=$1;$$.input.push($2);}
    ;

return:TYPE                         {$$=$1 } 
    |ArrayType                      {$$=$1 }
    |ID                             {$$=getType($1); }
    ;

function: ID "(" funcparams ")" ":" return ";"  {$$=$3;$$.name= $1;$$.output = $6;  }
    | ID "(" funcparams ")" ";"                 {$$=$3;$$.name= $1;}
    ;

functions:function              {$$=getScope(); $$.rpc.push($1) }
    |functions function         {$$=$1;$$.rpc.push($2) } 
    ;


remote: Remote "{" "}"                      { $$ = getScope() ;$$.name = "remote" }
      |Remote "{" functions "}"             { $$ = $3; $$.name = 'remote' }
      |Remote "{" functions "}" ";"         { $$ = $3; $$.name = 'remote' }
      ;

handler: Handler "{"   "}"                  {$$ = getScope() ;$$.name = 'handler' }
      |Handler"{" functions "}"             { $$ = $3; $$.name = "handler" }
      |Handler "{" functions "}" ";"        { $$ = $3; $$.name = "handler" }
      ;

typedefine:param ";"    {$$=$1} 
          ;

typedefines:typedefine                { $$=getUserType();$$.fieldList.push($1)}
           |typedefines typedefine    { $$=$1;$$.fieldList.push($2)} 
           ;


class:Class ID "{" typedefines "}"       { $$=$4;$$.name =$2;}
    | Class ID "{" typedefines "}" ";"   { $$=$4;$$.name =$2;}
    ;




service:Service ID "{" service_body "}" {  $$=$4;$4.name=$2; }
        |Service "{" service_body "}" { $$=$3;$3.name="_base"; }
        ;

namespace:Namespace ID ";"  {$$=$2};

service_body:class              {$$=getService($1); }
        |handler                {$$=getService($1); }
        |remote                 {$$=getService($1); }
        |service_body class     {$$=getService($2,$1);}
        |service_body handler   {$$=getService($2,$1);}
        |service_body remote    {$$=getService($2,$1);}
        ;


expressions:
        namespace               {$$=getRoot();$$.name=$1;}
        |service                {$$=getRoot($1);} 
        |class                  {$$=getRoot($1)}
        |EOF                    {$$=getRoot()}
        |expressions namespace  {$$=$1;$$.name = $2;}
        |expressions class      {$$=getRoot($2,$1);}
        |expressions service    {$$=getRoot($2,$1);}
        |expressions EOF        {endParse($1);
                                 console.log("parse over",$1);
                                 parser.ast=$1;
                                 }
        ;

