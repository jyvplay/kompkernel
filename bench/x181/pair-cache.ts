/** Direct-mapped exact cache: colliding keys evict, never alias values. */
export class PairCache {
 private keys=new Int32Array(1<<18);
 private values=new Int32Array(1<<18).fill(-1);
 get(k:number):number|undefined{const i=Math.imul(k,0x9e3779b1)>>>14;const v=this.values[i];return v>=0&&this.keys[i]===k?v:undefined;}
 set(k:number,v:number){const i=Math.imul(k,0x9e3779b1)>>>14;this.keys[i]=k;this.values[i]=v;}
 clear(){this.values.fill(-1);}
}
