export enum ErrorCode{
    Have_no_service=0,
    TimeOut
}

export class NopError extends Error{
    constructor(msg:string,public code:ErrorCode){
        super(msg);
    }
}