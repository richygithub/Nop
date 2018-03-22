interface WithID{
    id:number;
}
export class MapArray<T extends WithID >{
    dataArray:Array<T>;
    idxMap:Map<number,number>;
    constructor(){
        this.dataArray = new Array<T>();
        this.idxMap= new Map<number,number>();
    }
    get length(){
        return this.dataArray.length; 
    }
    add(obj:T):boolean{
        if( this.idxMap.has(obj.id) != null  ){
            return false;
        }
        this.dataArray.push(obj);
        this.idxMap.set(obj.id,this.dataArray.length-1);
        return true;
    }
    remove(obj:T):boolean{

        let idx = this.idxMap.get(obj.id);
        if( idx == null) {
            return false;
        }
        this.idxMap.delete(obj.id);
        let dataLen = this.dataArray.length; 
        this.dataArray[idx] = this.dataArray[ dataLen - 1 ];
        this.dataArray[ dataLen - 1 ] = null;
        this.dataArray.length--;
        return true;
    }
    get(id:string|number):T{
        let idx = this.idxMap[id];
        return idx==null?null:this.dataArray[idx];
    }
    getByIdx(idx:number):T{
        return (idx>=0&&idx<this.length)?this.dataArray[idx]:null;
    }

}