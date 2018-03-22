
export class Bits{

    data:Uint8Array;
    constructor(private bitsize:number ){
        let len = Math.ceil( bitsize/8 );
        this.data = new Uint8Array(len);
    }
    set(bit:number):boolean{
        if( bit<=0 || bit> this.bitsize ){
            return false;
        }
        let idx= Math.floor( bit/8);
        let shift= bit - (idx*8);
        this.data[idx] 

    }

}

