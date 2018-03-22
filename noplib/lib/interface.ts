export abstract class  Com{
    abstract start():Promise<[any,Error]>;
    abstract afterStart():Promise<[any,Error]>;
    abstract stop():Promise<[any,Error]>;
}

export interface Services{
    name:string;
    getHandler(serviceId: number, type: string):Handler;
}
export interface Handler{
    processReq(data: Buffer): Promise<[any, Error]>;
    serializeReply(reply:any):Buffer;
}
