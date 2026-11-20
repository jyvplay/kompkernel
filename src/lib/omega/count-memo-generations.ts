/** X140 experimental two-generation exact-value memo. No codec semantics.
 * Each generation holds at most half of the total key-character/entry budget.
 * Rotation retains the just-filled generation instead of evicting everything.
 * No LRU mutations on reads. Keys and values are exact; misses affect work only.
 * Unwired. Only bench/x140/memo-experiment.patch connects it to bpe.ts;
 * measured full-stack comparison found no gain, so the hook was removed.
 */
export class CountMemoGenerations {
 private current=new Map<string,number>();private previous=new Map<string,number>();
 private currentChars=0;private previousChars=0;
 constructor(private budget:number,private entries=50000){
  if(!Number.isFinite(budget)||budget<0||!Number.isSafeInteger(entries)||entries<0)throw Error('memo budget');
 }
 get(key:string):number|undefined{return this.current.get(key)??this.previous.get(key);}
 set(key:string,value:number):void{
  const half=Math.floor(this.budget/2),count=Math.floor(this.entries/2);
  if(key.length>half||count<1)return;
  if(this.current.has(key)){this.current.set(key,value);return;}
  // Remove an existing previous copy before inserting, maintaining a strict
  // total budget and making duplicate keys unambiguous after rotation.
  if(this.previous.delete(key))this.previousChars-=key.length;
  if(this.currentChars+key.length>half||this.current.size>=count){
   this.previous=this.current;this.previousChars=this.currentChars;
   this.current=new Map();this.currentChars=0;
  }
  this.current.set(key,value);this.currentChars+=key.length;
 }
 clear():void{this.current.clear();this.previous.clear();this.currentChars=0;this.previousChars=0;}
 stats(){return {size:this.current.size+this.previous.size,chars:this.currentChars+this.previousChars};}
}
